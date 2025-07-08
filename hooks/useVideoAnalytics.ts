import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface VideoAnalytics {
  totalViews: number;
  completedViews: number;
  totalWatchTime: number;
  engagementRate: number;
  completionRate: number;
  averageWatchTime: number;
  coinsEarned: number;
  viewsRemaining: number;
  estimatedCompletionDays: number;
}

interface UserAnalyticsSummary {
  totalVideosPromoted: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalViewsReceived: number;
  totalWatchTime: number;
  averageEngagementRate: number;
  activeVideos: number;
  completedVideos: number;
  onHoldVideos: number;
}

export function useVideoAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVideoAnalytics = useCallback(async (videoId: string): Promise<VideoAnalytics | null> => {
    if (!user || !videoId) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error: analyticsError } = await supabase
        .rpc('get_video_analytics', {
          video_uuid: videoId,
          user_uuid: user.id
        });

      if (analyticsError) throw analyticsError;

      if (data && data.length > 0) {
        const analytics = data[0];
        return {
          totalViews: analytics.total_views || 0,
          completedViews: analytics.completed_views || 0,
          totalWatchTime: analytics.total_watch_time || 0,
          engagementRate: parseFloat(analytics.engagement_rate) || 0,
          completionRate: parseFloat(analytics.completion_rate) || 0,
          averageWatchTime: parseFloat(analytics.average_watch_time) || 0,
          coinsEarned: analytics.coins_earned || 0,
          viewsRemaining: analytics.views_remaining || 0,
          estimatedCompletionDays: parseFloat(analytics.estimated_completion_days) || -1,
        };
      }

      return null;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching video analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUserAnalyticsSummary = useCallback(async (): Promise<UserAnalyticsSummary | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error: summaryError } = await supabase
        .rpc('get_user_analytics_summary', {
          user_uuid: user.id
        });

      if (summaryError) throw summaryError;

      if (data && data.length > 0) {
        const summary = data[0];
        return {
          totalVideosPromoted: summary.total_videos_promoted || 0,
          totalCoinsEarned: summary.total_coins_earned || 0,
          totalCoinsSpent: summary.total_coins_spent || 0,
          totalViewsReceived: summary.total_views_received || 0,
          totalWatchTime: summary.total_watch_time || 0,
          averageEngagementRate: parseFloat(summary.average_engagement_rate) || 0,
          activeVideos: summary.active_videos || 0,
          completedVideos: summary.completed_videos || 0,
          onHoldVideos: summary.on_hold_videos || 0,
        };
      }

      return null;
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user analytics summary:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const releaseVideosFromHold = useCallback(async (): Promise<number> => {
    try {
      const { data, error: releaseError } = await supabase
        .rpc('release_videos_from_hold');

      if (releaseError) throw releaseError;

      return data || 0;
    } catch (err: any) {
      console.error('Error releasing videos from hold:', err);
      return 0;
    }
  }, []);

  const calculateVideoRefund = useCallback(async (videoId: string) => {
    try {
      const { data, error: refundError } = await supabase
        .rpc('calculate_video_refund', {
          video_uuid: videoId
        });

      if (refundError) throw refundError;

      return data && data.length > 0 ? data[0] : null;
    } catch (err: any) {
      console.error('Error calculating video refund:', err);
      return null;
    }
  }, []);

  const deleteVideoWithRefund = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error: deleteError } = await supabase
        .rpc('delete_video_with_refund', {
          video_uuid: videoId,
          user_uuid: user.id
        });

      if (deleteError) throw deleteError;

      return data || false;
    } catch (err: any) {
      console.error('Error deleting video with refund:', err);
      return false;
    }
  }, [user]);

  const extendVideoPromotion = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error: extendError } = await supabase
        .rpc('extend_video_promotion', {
          video_uuid: videoId,
          user_uuid: user.id
        });

      if (extendError) throw extendError;

      return data || false;
    } catch (err: any) {
      console.error('Error extending video promotion:', err);
      return false;
    }
  }, [user]);

  return {
    loading,
    error,
    getVideoAnalytics,
    getUserAnalyticsSummary,
    releaseVideosFromHold,
    calculateVideoRefund,
    deleteVideoWithRefund,
    extendVideoPromotion,
  };
}