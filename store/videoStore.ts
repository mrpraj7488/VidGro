import { create } from 'zustand';
import { getVideoQueue } from '../lib/supabase';

interface Video {
  video_id: string;
  youtube_url?: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
  views_count: number;
  target_views: number;
  status: string;
  user_id: string;
  completed?: boolean;
  total_watch_time?: number;
  completion_rate?: number;
  hold_until?: string;
}

interface VideoState {
  videoQueue: Video[];
  currentVideoIndex: number;
  isLoading: boolean;
  error: string | null;
  canLoop: boolean;
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  checkQueueLoop: (userId: string) => Promise<boolean>;
  refreshQueue: (userId: string) => Promise<void>;
  shouldSkipCurrentVideo: () => boolean;
  moveToNextIfNeeded: (userId: string) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  error: null,
  canLoop: true,

  fetchVideos: async (userId: string) => {
    console.log('🎬 VideoStore: Starting to fetch looping videos for user:', userId);
    if (!userId) {
      console.log('🎬 VideoStore: No user ID provided, skipping video fetch');
      set({ isLoading: false, error: 'User not authenticated' });
      return;
    }
    set({ isLoading: true, error: null });
    
    try {
      const videos = await getVideoQueue(userId);
      console.log('🎬 VideoStore: Received videos from API:', videos?.length || 0);
      
      if (videos && videos.length > 0) {
        // Normalize backend fields
        const normalized = videos.map((video: any) => ({
          ...video,
          youtube_url: video.youtube_url || '',
          duration_seconds: Number(video.duration_seconds || 0),
          coin_reward: Number(video.coin_reward ?? 0),
        }));

        // Enhanced safety filter for the new schema
        const safeVideos = normalized.filter(video => {
          const isValid = Boolean(video.video_id) &&
            Boolean(video.youtube_url) &&
            Boolean(video.title) &&
            video.duration_seconds > 0;
          
          const isNotCompleted = video.completed !== true && 
            video.views_count < video.target_views &&
            video.status !== 'completed';
          
          const hasValidStatus = ['active', 'repromoted'].includes(video.status) ||
            (video.status === 'on_hold' && new Date(video.hold_until || 0) <= new Date());
          
          const shouldInclude = isValid && isNotCompleted && hasValidStatus;
          
          // Debug logging for videos that are filtered out
          if (!shouldInclude) {
            console.log('🚫 VideoStore: Filtering out video:', {
              title: video.title,
              status: video.status,
              completed: video.completed,
              views: video.views_count,
              target: video.target_views,
              reason: !isValid ? 'invalid' : !isNotCompleted ? 'completed' : 'invalid_status'
            });
          }
          
          return shouldInclude;
        });
        console.log('🎬 VideoStore: Safe videos after validation:', safeVideos.length);
        
        // Log video details for debugging
        safeVideos.forEach((video, index) => {
          console.log(`🎬 VideoStore: Video ${index}:`, video.title, '(ID:', video.video_id + ')');
        });
        
        // Keep the current index if we're just refreshing the queue
        const { currentVideoIndex } = get();
        const newIndex = currentVideoIndex < safeVideos.length ? currentVideoIndex : 0;
        
        set({ 
          videoQueue: safeVideos, 
          currentVideoIndex: newIndex,
          isLoading: false,
          error: null,
          canLoop: true
        });
        
        console.log('🎬 VideoStore: Queue updated. Current index:', newIndex, 'Queue size:', safeVideos.length);
      } else {
        console.log('🎬 VideoStore: No videos received from API');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0, 
          isLoading: false,
          error: 'No videos available. Videos will loop automatically when available!',
          canLoop: true
        });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load videos. Please check your connection.',
        canLoop: false
      });
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex] || null;
    
    if (currentVideo) {
      console.log('🎬 VideoStore: Current video at index', currentVideoIndex, ':', currentVideo.title, '(ID:', currentVideo.video_id + ')');
    } else {
      console.log('🎬 VideoStore: No current video available at index', currentVideoIndex);
    }
    
    return currentVideo;
  },

  moveToNextVideo: () => {
    const { videoQueue, currentVideoIndex } = get();

    console.log('�� VideoStore: Moving to next video. Current index:', currentVideoIndex, 'Queue length:', videoQueue.length);

    if (videoQueue.length === 0) {
      console.log('🔄 VideoStore: No videos in queue');
      return;
    }

    if (currentVideoIndex < videoQueue.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      console.log('🔄 VideoStore: Moving to next video at index:', nextIndex, 'Title:', videoQueue[nextIndex]?.title);
      set({ currentVideoIndex: nextIndex });
    } else {
      // Loop back to beginning for continuous playback
      console.log('🔄 VideoStore: Looping back to first video');
      set({ currentVideoIndex: 0 });
    }
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0, 
      error: null,
      canLoop: false 
    });
  },

  checkQueueLoop: async (userId: string) => {
    try {
      const videos = await getVideoQueue(userId);
      const hasVideos = videos && videos.length > 0;
      set({ canLoop: hasVideos });
      return hasVideos;
    } catch (error) {
      console.error('Error checking queue loop:', error);
      set({ canLoop: false });
      return false;
    }
  },

  refreshQueue: async (userId: string) => {
    console.log('🔄 VideoStore: Refreshing video queue');
    await get().fetchVideos(userId);
  },

  // Check if current video should be skipped (completed or reached target)
  shouldSkipCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    if (!currentVideo) return true;
    
    const shouldSkip = currentVideo.completed === true || 
                      currentVideo.views_count >= currentVideo.target_views ||
                      currentVideo.status === 'completed' ||
                      !['active', 'repromoted'].includes(currentVideo.status) ||
                      (currentVideo.status === 'on_hold' && new Date(currentVideo.hold_until || 0) > new Date());
    
    if (shouldSkip) {
      console.log('🎬 VideoStore: Current video should be skipped:', {
        videoId: currentVideo.video_id,
        title: currentVideo.title,
        completed: currentVideo.completed,
        views: currentVideo.views_count,
        target: currentVideo.target_views,
        status: currentVideo.status
      });
    }
    
    return shouldSkip;
  },

  // Move to next video if current one should be skipped
  moveToNextIfNeeded: async (userId: string) => {
    const { shouldSkipCurrentVideo, moveToNextVideo, refreshQueue } = get();
    
    if (shouldSkipCurrentVideo()) {
      console.log('🎬 VideoStore: Current video should be skipped, moving to next');
      moveToNextVideo();
      
      // If the next video should also be skipped, refresh the queue
      if (shouldSkipCurrentVideo()) {
        console.log('🎬 VideoStore: Next video also should be skipped, refreshing queue');
        await refreshQueue(userId);
      }
    }
  },
}));
