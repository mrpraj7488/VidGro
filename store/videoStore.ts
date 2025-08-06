import { create } from 'zustand';
import { getVideoQueue } from '../lib/supabase';

interface Video {
  video_id: string;
  youtube_url: string;
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
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  error: null,
  canLoop: true,

  fetchVideos: async (userId: string) => {
    console.log('🎬 VideoStore: Starting to fetch looping videos for user:', userId);
    set({ isLoading: true, error: null });
    
    try {
      const videos = await getVideoQueue(userId);
      console.log('🎬 VideoStore: Received videos from API:', videos?.length || 0);
      
      if (videos && videos.length > 0) {
        // Enhanced safety filter for the new schema
        const safeVideos = videos.filter(video => 
          video.video_id && 
          video.youtube_url && 
          video.title &&
          video.duration_seconds > 0 &&
          video.coin_reward > 0 &&
          video.completed !== true // Exclude completed videos from queue
        );
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

    console.log('🔄 VideoStore: Moving to next video. Current index:', currentVideoIndex, 'Queue length:', videoQueue.length);

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
}));
