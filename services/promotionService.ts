import apiClient from '@/config/api';
import { Video } from './videoService';

export interface CreatePromotionRequest {
  youtube_url: string;
  views_requested: number;
}

export interface CreatePromotionResponse {
  success: boolean;
  message: string;
  data: {
    promotion: Video;
    cost_breakdown: {
      total_cost: number;
      cost_per_view: number;
      coin_reward_per_view: number;
      video_duration: number;
    };
  };
}

export interface PromotionAnalytics {
  promotion: Video & {
    completion_rate: string;
  };
  analytics: {
    total_sessions: number;
    completed_sessions: number;
    avg_completion: number;
    total_coins_paid: number;
  };
  recent_sessions: any[];
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
      const response = await apiClient.post('/promotions', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      throw new Error(error.response?.data?.error || 'Failed to create promotion');
    }
  }

  async getMyPromotions(status?: string, limit = 20, offset = 0): Promise<{
    promotions: Video[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> {
    try {
      const params: any = { limit, offset };
      if (status) params.status = status;

      const response = await apiClient.get('/promotions/my', { params });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch promotions');
    } catch (error) {
      console.error('Error fetching promotions:', error);
      throw error;
    }
  }

  async getPromotionDetails(promotionId: number): Promise<PromotionAnalytics> {
    try {
      const response = await apiClient.get(`/promotions/${promotionId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch promotion details');
    } catch (error) {
      console.error('Error fetching promotion details:', error);
      throw error;
    }
  }

  async updatePromotionStatus(promotionId: number, status: 'active' | 'paused'): Promise<void> {
    try {
      await apiClient.patch(`/promotions/${promotionId}/status`, { status });
    } catch (error: any) {
      console.error('Error updating promotion status:', error);
      throw new Error(error.response?.data?.error || 'Failed to update promotion status');
    }
  }

  async deletePromotion(promotionId: number): Promise<void> {
    try {
      await apiClient.delete(`/promotions/${promotionId}`);
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete promotion');
    }
  }
}

export default PromotionService.getInstance();