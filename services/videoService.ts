import apiClient from '@/config/api';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/config/api';

export interface Video {
  id: number;
  promoter_id: number;
  youtube_url: string;
  youtube_video_id: string;
  title: string;
  duration: number;
  views_requested: number;
  views_completed: number;
  cost_per_view: number;
  total_cost: number;
  coin_reward: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  promoter_email?: string;
  embed_url?: string;
  thumbnail_url?: string;
  watch_url?: string;
  recently_watched?: boolean;
}

export interface WatchSession {
  id: number;
  user_id: number;
  video_id: number;
  watch_duration: number;
  completion_percentage: number;
  coins_earned: number;
  completed: boolean;
  timestamp: string;
}

export interface StartWatchResponse {
  success: boolean;
  data: {
    session_id: number;
    video: Video;
  };
}

export interface CompleteWatchResponse {
  success: boolean;
  message: string;
  data: {
    coins_earned: number;
    new_balance: number;
    completion_percentage: number;
  };
}

class VideoService {
  private static instance: VideoService;

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  async getAvailableVideos(limit = 10, offset = 0): Promise<Video[]> {
    try {
      const response = await apiClient.get('/videos', {
        params: { limit, offset }
      });

      if (response.data.success) {
        return response.data.data.videos.map((video: Video) => ({
          ...video,
          embed_url: getYouTubeEmbedUrl(video.youtube_video_id, true),
          thumbnail_url: `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
          watch_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  async getVideoDetails(videoId: number): Promise<Video | null> {
    try {
      const response = await apiClient.get(`/videos/${videoId}`);

      if (response.data.success) {
        const video = response.data.data;
        return {
          ...video,
          embed_url: getYouTubeEmbedUrl(video.youtube_video_id, true),
          thumbnail_url: `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
          watch_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  async startWatching(videoId: number): Promise<StartWatchResponse> {
    try {
      const response = await apiClient.post(`/videos/${videoId}/start`);
      return response.data;
    } catch (error: any) {
      console.error('Error starting watch session:', error);
      throw new Error(error.response?.data?.error || 'Failed to start watching');
    }
  }

  async updateProgress(sessionId: number, watchDuration: number, completionPercentage: number): Promise<void> {
    try {
      await apiClient.post('/videos/progress', {
        session_id: sessionId,
        watch_duration: watchDuration,
        completion_percentage: completionPercentage
      });
    } catch (error) {
      console.error('Error updating watch progress:', error);
      throw error;
    }
  }

  async completeWatching(sessionId: number): Promise<CompleteWatchResponse> {
    try {
      const response = await apiClient.post('/videos/complete', {
        session_id: sessionId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error completing watch session:', error);
      throw new Error(error.response?.data?.error || 'Failed to complete watching');
    }
  }

  async validateYouTubeUrl(url: string): Promise<boolean> {
    const videoId = extractYouTubeVideoId(url);
    return !!videoId;
  }

  getYouTubeVideoId(url: string): string | null {
    return extractYouTubeVideoId(url);
  }

  getEmbedUrl(videoId: string, autoplay = false): string {
    return getYouTubeEmbedUrl(videoId, autoplay);
  }

  getThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
}

export default VideoService.getInstance();