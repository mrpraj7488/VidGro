import { supabase, PromotedVideo, WatchSession } from '@/config/supabase';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, validateYouTubeVideo } from '@/config/api';

export interface Video extends PromotedVideo {
  embed_url?: string;
  thumbnail_url?: string;
  watch_url?: string;
  recently_watched?: boolean;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get videos without joins to avoid relationship issues
      const { data: videos, error } = await supabase
        .from('promoted_videos')
        .select('*')
        .eq('status', 'active')
        .lt('views_completed', 'views_requested')
        .neq('promoter_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Check for recent watches
      const videoIds = videos?.map(v => v.id) || [];
      const { data: recentWatches } = await supabase
        .from('watch_sessions')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('video_id', videoIds)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour ago

      const recentVideoIds = new Set(recentWatches?.map(w => w.video_id) || []);

      return (videos || [])
        .filter(video => !recentVideoIds.has(video.id))
        .map(video => ({
          ...video,
          embed_url: getYouTubeEmbedUrl(video.youtube_video_id, true),
          thumbnail_url: `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
          watch_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`
        }));
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  async getVideoDetails(videoId: number): Promise<Video | null> {
    try {
      const { data: video, error } = await supabase
        .from('promoted_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) throw error;

      if (video) {
        const { data: { user } } = await supabase.auth.getUser();
        let recently_watched = false;

        if (user) {
          const { data: recentWatch } = await supabase
            .from('watch_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('video_id', videoId)
            .eq('completed', true)
            .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .single();

          recently_watched = !!recentWatch;
        }

        return {
          ...video,
          embed_url: getYouTubeEmbedUrl(video.youtube_video_id, true),
          thumbnail_url: `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
          watch_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
          recently_watched
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get video details
      const { data: video, error: videoError } = await supabase
        .from('promoted_videos')
        .select('*')
        .eq('id', videoId)
        .eq('status', 'active')
        .single();

      if (videoError || !video) {
        throw new Error('Video not found or not active');
      }

      // Check if user is trying to watch their own video
      if (video.promoter_id === user.id) {
        throw new Error('Cannot watch your own promoted video');
      }

      // Check if user has already watched this video recently
      const { data: recentWatch } = await supabase
        .from('watch_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .eq('completed', true)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .single();

      if (recentWatch) {
        throw new Error('Video already watched recently. Please wait before watching again.');
      }

      // Create watch session
      const { data: session, error: sessionError } = await supabase
        .from('watch_sessions')
        .insert({
          user_id: user.id,
          video_id: videoId,
          watch_duration: 0,
          completion_percentage: 0,
          coins_earned: 0,
          completed: false
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      return {
        success: true,
        data: {
          session_id: session.id,
          video: {
            ...video,
            embed_url: getYouTubeEmbedUrl(video.youtube_video_id, true),
            thumbnail_url: `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
            watch_url: `https://www.youtube.com/watch?v=${video.youtube_video_id}`
          }
        }
      };
    } catch (error: any) {
      console.error('Error starting watch session:', error);
      throw new Error(error.message || 'Failed to start watching');
    }
  }

  async updateProgress(sessionId: number, watchDuration: number, completionPercentage: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('watch_sessions')
        .select('*, promoted_videos!inner(duration)')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('completed', false)
        .single();

      if (sessionError || !session) {
        throw new Error('Watch session not found or already completed');
      }

      // Validate watch duration doesn't exceed video duration + buffer
      const videoDuration = (session.promoted_videos as any).duration;
      if (watchDuration > videoDuration + 5) {
        throw new Error('Invalid watch duration');
      }

      // Update watch progress
      const { error: updateError } = await supabase
        .from('watch_sessions')
        .update({
          watch_duration: watchDuration,
          completion_percentage: completionPercentage,
          timestamp: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating watch progress:', error);
      throw error;
    }
  }

  async completeWatching(sessionId: number): Promise<CompleteWatchResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get session with video details
      const { data: session, error: sessionError } = await supabase
        .from('watch_sessions')
        .select('*, promoted_videos!inner(id, duration, coin_reward, promoter_id, title, views_completed, views_requested, status)')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('completed', false)
        .single();

      if (sessionError || !session) {
        throw new Error('Watch session not found or already completed');
      }

      const video = session.promoted_videos as any;

      // Check if user watched enough of the video (at least 80%)
      if (session.completion_percentage < 80) {
        throw new Error('Must watch at least 80% of the video to earn coins');
      }

      // Check if video is still active and has views remaining
      if (video.status !== 'active' || video.views_completed >= video.views_requested) {
        throw new Error('Video promotion is no longer active');
      }

      const coinsEarned = Math.floor(video.coin_reward * video.duration);

      // Use Supabase transaction
      const { data, error } = await supabase.rpc('complete_video_watch', {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_video_id: video.id,
        p_coins_earned: coinsEarned,
        p_completion_percentage: session.completion_percentage
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Video completed successfully! Coins earned.',
        data: {
          coins_earned: coinsEarned,
          new_balance: data.new_balance,
          completion_percentage: session.completion_percentage
        }
      };
    } catch (error: any) {
      console.error('Error completing watch session:', error);
      throw new Error(error.message || 'Failed to complete watching');
    }
  }

  async validateYouTubeUrl(url: string): Promise<boolean> {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return false;

    try {
      await validateYouTubeVideo(videoId);
      return true;
    } catch {
      return false;
    }
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