import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface Video {
  id: string;
  youtube_url: string; // This now contains the video ID
  title: string;
  duration_seconds: number;
  coin_reward: number;
}

interface VideoStore {
  videoQueue: Video[];
  currentVideoIndex: number;
  isLoading: boolean;
  lastFetchTime: number;
  cachedVideoIds: string[];
  isResetting: boolean;
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  removeCurrentVideo: () => void;
  resetQueue: (userId: string) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const QUEUE_SIZE = 10;

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  lastFetchTime: 0,
  cachedVideoIds: [],
  isResetting: false,

  fetchVideos: async (userId: string) => {
    const now = Date.now();
    const { lastFetchTime, isLoading, videoQueue, isResetting } = get();
    
    // Don't fetch if already loading or resetting
    if (isLoading || isResetting) {
      return;
    }

    // Check if we need to fetch (cache expired or no videos)
    if (now - lastFetchTime < CACHE_DURATION && videoQueue.length > 0) {
      return;
    }

    set({ isLoading: true });

    try {
      console.log('Fetching video queue for user:', userId);
      
      // First, get videos that the user has already watched
      const { data: watchedVideos, error: watchedError } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('viewer_id', userId);

      if (watchedError) {
        console.error('Error fetching watched videos:', watchedError);
        throw watchedError;
      }

      const watchedVideoIds = watchedVideos?.map(v => v.video_id) || [];
      console.log('User has watched videos:', watchedVideoIds.length);
      
      // Get all active videos that are not owned by the user and are embeddable
      let query = supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, user_id, description')
        .eq('status', 'active')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUEUE_SIZE * 3); // Get more to filter from

      const { data: allVideos, error } = await query;

      if (error) {
        console.error('Error fetching video queue:', error);
        throw error;
      }

      if (!allVideos || allVideos.length === 0) {
        console.log('No videos available in database');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0,
          isLoading: false,
          lastFetchTime: now 
        });
        return;
      }

      // Filter videos on the client side - exclude videos that had embedding errors
      const availableVideos = allVideos
        .filter(video => {
          // Check if video has remaining views
          const hasRemainingViews = video.views_count < video.target_views;
          // Check if user hasn't watched this video
          const notWatched = !watchedVideoIds.includes(video.id);
          // Check if video doesn't have embedding error in description
          const notEmbeddingError = !video.description?.includes('not embeddable') && 
                                   !video.description?.includes('embedding error');
          
          return hasRemainingViews && notWatched && notEmbeddingError;
        })
        .slice(0, QUEUE_SIZE) // Limit to queue size
        .map(video => ({
          id: video.id,
          youtube_url: video.youtube_url, // This is now the video ID
          title: video.title,
          duration_seconds: video.duration_seconds,
          coin_reward: video.coin_reward
        }));

      if (availableVideos.length === 0) {
        console.log('No available videos with remaining views, will reset queue');
        // Instead of setting empty queue, trigger reset
        set({ isLoading: false });
        await get().resetQueue(userId);
        return;
      }

      console.log(`Fetched ${availableVideos.length} videos for queue`);
      console.log('Sample video data:', availableVideos[0]);
      
      // Cache video IDs for performance
      const videoIds = availableVideos.map(v => v.id);
      
      set({ 
        videoQueue: availableVideos,
        currentVideoIndex: 0,
        isLoading: false,
        lastFetchTime: now,
        cachedVideoIds: videoIds
      });

    } catch (error) {
      console.error('Error in fetchVideos:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    return videoQueue[currentVideoIndex] || null;
  },

  moveToNextVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    const nextIndex = currentVideoIndex + 1;
    
    if (nextIndex < videoQueue.length) {
      set({ currentVideoIndex: nextIndex });
    } else {
      // Queue exhausted, clear it to trigger reload
      console.log('Queue exhausted, clearing for reload...');
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0 // Force refresh on next fetch
      });
    }
  },

  removeCurrentVideo: async () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    if (!currentVideo) return;
    
    console.log('Removing unplayable video from queue:', currentVideo.id);
    
    // Mark video as paused in Supabase to prevent it from being fetched again
    try {
      await supabase
        .from('videos')
        .update({ 
          status: 'paused',
          description: supabase.raw(`description || ' - Video marked as unplayable due to embedding restrictions'`)
        })
        .eq('id', currentVideo.id);
      
      console.log('Video marked as paused in Supabase:', currentVideo.id);
    } catch (error) {
      console.error('Error updating video status:', error);
    }
    
    // Remove from local queue
    const newQueue = videoQueue.filter((_, index) => index !== currentVideoIndex);
    
    if (newQueue.length === 0) {
      // No more videos, clear queue to trigger reload
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0
      });
    } else {
      // Adjust index if needed
      const newIndex = currentVideoIndex >= newQueue.length ? 0 : currentVideoIndex;
      set({ 
        videoQueue: newQueue,
        currentVideoIndex: newIndex
      });
    }
  },

  resetQueue: async (userId: string) => {
    const { isResetting } = get();
    
    // Prevent multiple resets
    if (isResetting) {
      console.log('Reset already in progress, skipping...');
      return;
    }

    console.log('Resetting video queue for seamless looping...');
    
    set({ isResetting: true });

    try {
      // Strategy 1: Get all active videos and filter client-side
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, description')
        .eq('status', 'active')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUEUE_SIZE * 2); // Get more videos to filter from

      if (error) {
        console.error('Error fetching videos for reset:', error);
        throw error;
      }

      if (allVideos && allVideos.length > 0) {
        // Filter videos with remaining views and no embedding errors
        const availableVideos = allVideos.filter(video => 
          video.views_count < video.target_views &&
          !video.description?.includes('not embeddable') &&
          !video.description?.includes('embedding error')
        );

        if (availableVideos.length > 0) {
          console.log(`Found ${availableVideos.length} videos with remaining views for reset`);
          
          const videoQueue = availableVideos
            .slice(0, QUEUE_SIZE) // Limit to queue size
            .map(video => ({
              id: video.id,
              youtube_url: video.youtube_url, // This is now the video ID
              title: video.title,
              duration_seconds: video.duration_seconds,
              coin_reward: video.coin_reward
            }));

          set({
            videoQueue,
            currentVideoIndex: 0,
            lastFetchTime: Date.now(),
            cachedVideoIds: videoQueue.map(v => v.id),
            isResetting: false
          });

          return;
        }

        // If no videos with remaining views, use any active videos for seamless looping
        console.log('No videos with remaining views, using any active videos for seamless looping...');
        
        const videoQueue = allVideos
          .filter(video => 
            !video.description?.includes('not embeddable') &&
            !video.description?.includes('embedding error')
          )
          .slice(0, QUEUE_SIZE) // Limit to queue size
          .map(video => ({
            id: video.id,
            youtube_url: video.youtube_url, // This is now the video ID
            title: video.title,
            duration_seconds: video.duration_seconds,
            coin_reward: video.coin_reward
          }));

        set({
          videoQueue,
          currentVideoIndex: 0,
          lastFetchTime: Date.now(),
          cachedVideoIds: videoQueue.map(v => v.id),
          isResetting: false
        });

        return;
      }

      // No videos available at all
      console.log('No videos available for reset');
      set({
        videoQueue: [],
        currentVideoIndex: 0,
        lastFetchTime: Date.now(),
        cachedVideoIds: [],
        isResetting: false
      });

    } catch (error) {
      console.error('Error in resetQueue:', error);
      set({ isResetting: false });
    }
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0,
      cachedVideoIds: [],
      isResetting: false
    });
  },
}));