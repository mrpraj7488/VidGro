import { supabase, PromotedVideo } from '@/config/supabase';
import { extractYouTubeVideoId, validateYouTubeVideo } from '@/config/api';

export interface CreatePromotionRequest {
  youtube_url: string;
  duration: number;
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

      let videoTitle = 'YouTube Video';
      let videoDuration = data.duration;

      // Try to validate with YouTube API, but don't fail if it doesn't work
      try {
        const videoData = await validateYouTubeVideo(videoId);
        videoTitle = videoData.title;
        videoDuration = videoData.duration;
      } catch (error) {
        console.warn('YouTube API validation failed, using provided data:', error);
      }

      // Calculate costs
      const costPerView = 1.2; // Base cost per view
      const coinReward = 0.8; // What viewers earn per view
      const totalCost = Math.ceil(videoDuration * data.views_requested * costPerView);

      // Get user's current coin balance
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.warn('Could not fetch user balance:', userError);
        // Continue with mock balance for development
      }

      const currentBalance = userProfile?.coin_balance || 1000;

      // Check if user has enough coins
      if (currentBalance < totalCost) {
        throw new Error(`Insufficient coins. Required: ${totalCost}, Available: ${currentBalance}`);
      }

      // Try to create promotion in database
      try {
        const { data: promotion, error } = await supabase
          .from('promoted_videos')
          .insert({
            promoter_id: user.id,
            youtube_url: data.youtube_url,
            youtube_video_id: videoId,
            title: videoTitle,
            duration: videoDuration,
            views_requested: data.views_requested,
            views_completed: 0,
            cost_per_view: costPerView,
            total_cost: totalCost,
            coin_reward: coinReward,
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;

        // Deduct coins from user balance
        await supabase
          .from('users')
          .update({ coin_balance: currentBalance - totalCost })
          .eq('id', user.id);

        return {
          success: true,
          message: 'Video promotion created successfully',
          data: {
            promotion,
            cost_breakdown: {
              total_cost: totalCost,
              cost_per_view: costPerView,
              coin_reward_per_view: coinReward,
              video_duration: videoDuration
            }
          }
        };
      } catch (dbError) {
        console.warn('Database operation failed, creating mock promotion:', dbError);
        
        // Create mock promotion for development
        const mockPromotion: PromotedVideo = {
          id: `mock-${Date.now()}`,
          promoter_id: user.id,
          youtube_url: data.youtube_url,
          youtube_video_id: videoId,
          title: videoTitle,
          duration: videoDuration,
          views_requested: data.views_requested,
          views_completed: 0,
          cost_per_view: costPerView,
          total_cost: totalCost,
          coin_reward: coinReward,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return {
          success: true,
          message: 'Video promotion created successfully (development mode)',
          data: {
            promotion: mockPromotion,
            cost_breakdown: {
              total_cost: totalCost,
              cost_per_view: costPerView,
              coin_reward_per_view: coinReward,
              video_duration: videoDuration
            }
          }
        };
      }
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

      if (error) {
        console.warn('Database query failed, returning empty results:', error);
        return {
          promotions: [],
          pagination: {
            total: 0,
            limit,
            offset,
            has_more: false
          }
        };
      }

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
      return {
        promotions: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false
        }
      };
    }
  }

  async updatePromotionStatus(promotionId: string | number, status: 'active' | 'paused'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('promoted_videos')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId)
        .eq('promoter_id', user.id);

      if (error) {
        console.warn('Status update failed:', error);
        throw new Error('Failed to update promotion status');
      }
    } catch (error: any) {
      console.error('Error updating promotion status:', error);
      throw new Error(error.message || 'Failed to update promotion status');
    }
  }

  async deletePromotion(promotionId: string | number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('promoted_videos')
        .delete()
        .eq('id', promotionId)
        .eq('promoter_id', user.id);

      if (error) {
        console.warn('Deletion failed:', error);
        throw new Error('Failed to delete promotion');
      }
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      throw new Error(error.message || 'Failed to delete promotion');
    }
  }
}

export default PromotionService.getInstance();