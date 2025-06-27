import { supabase, PromotedVideo } from '@/config/supabase';
import { extractYouTubeVideoId, validateYouTubeVideo } from '@/config/api';

export interface CreatePromotionRequest {
  youtube_url: string;
  views_requested: number;
}

export interface CreatePromotionResponse {
  success: boolean;
  message: string;
  data: {
    promotion: PromotedVideo;
    cost_breakdown: {
      total_cost: number;
      cost_per_view: number;
      coin_reward_per_view: number;
      video_duration: number;
    };
  };
}

class PromotionService {
  private static instance: PromotionService;

  static getInstance(): PromotionService {
    if (!PromotionService.instance) {
      PromotionService.instance = new PromotionService();
    }
    return PromotionService.instance;
  }

  async createPromotion(data: CreatePromotionRequest): Promise<CreatePromotionResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate YouTube URL and get video metadata
      const videoId = extractYouTubeVideoId(data.youtube_url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      const videoData = await validateYouTubeVideo(videoId);

      // Calculate costs
      const costPerView = 1.2; // Base cost per view
      const coinReward = 0.8; // What viewers earn per view
      const totalCost = Math.ceil(videoData.duration * data.views_requested * costPerView);

      // Get user's current coin balance
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Check if user has enough coins
      if (userProfile.coin_balance < totalCost) {
        throw new Error(`Insufficient coins. Required: ${totalCost}, Available: ${userProfile.coin_balance}`);
      }

      // Check if user already has this video promoted
      const { data: existingPromotion } = await supabase
        .from('promoted_videos')
        .select('id')
        .eq('promoter_id', user.id)
        .eq('youtube_video_id', videoId)
        .in('status', ['active', 'paused'])
        .single();

      if (existingPromotion) {
        throw new Error('You already have an active promotion for this video');
      }

      // Use Supabase RPC for transaction
      const { data: result, error } = await supabase.rpc('create_video_promotion', {
        p_promoter_id: user.id,
        p_youtube_url: data.youtube_url,
        p_youtube_video_id: videoId,
        p_title: videoData.title,
        p_duration: videoData.duration,
        p_views_requested: data.views_requested,
        p_cost_per_view: costPerView,
        p_total_cost: totalCost,
        p_coin_reward: coinReward
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Video promotion created successfully',
        data: {
          promotion: result.promotion,
          cost_breakdown: {
            total_cost: totalCost,
            cost_per_view: costPerView,
            coin_reward_per_view: coinReward,
            video_duration: videoData.duration
          }
        }
      };
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      throw new Error(error.message || 'Failed to create promotion');
    }
  }

  async getMyPromotions(status?: string, limit = 20, offset = 0): Promise<{
    promotions: PromotedVideo[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('promoted_videos')
        .select('*', { count: 'exact' })
        .eq('promoter_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && ['active', 'paused', 'completed'].includes(status)) {
        query = query.eq('status', status);
      }

      const { data: promotions, error, count } = await query;

      if (error) throw error;

      return {
        promotions: promotions || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (offset + (promotions?.length || 0)) < (count || 0)
        }
      };
    } catch (error) {
      console.error('Error fetching promotions:', error);
      throw error;
    }
  }

  async updatePromotionStatus(promotionId: number, status: 'active' | 'paused'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user owns this promotion
      const { data: promotion, error: checkError } = await supabase
        .from('promoted_videos')
        .select('status')
        .eq('id', promotionId)
        .eq('promoter_id', user.id)
        .single();

      if (checkError || !promotion) {
        throw new Error('Promotion not found');
      }

      if (promotion.status === 'completed') {
        throw new Error('Cannot modify completed promotion');
      }

      const { error } = await supabase
        .from('promoted_videos')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating promotion status:', error);
      throw new Error(error.message || 'Failed to update promotion status');
    }
  }

  async deletePromotion(promotionId: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use RPC for safe deletion with refund
      const { error } = await supabase.rpc('delete_video_promotion', {
        p_promotion_id: promotionId,
        p_user_id: user.id
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      throw new Error(error.message || 'Failed to delete promotion');
    }
  }
}

export default PromotionService.getInstance();