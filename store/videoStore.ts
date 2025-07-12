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
  errorCount: number;
  blacklistedVideoIds: Set<string>; // Track unplayable videos locally
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  removeCurrentVideo: () => void;
  resetQueue: (userId: string) => Promise<void>;
  handleVideoError: (youtubeVideoId: string, errorType: string) => Promise<void>;
  markVideoAsUnplayable: (youtubeVideoId: string, reason: string) => Promise<void>;
  addToBlacklist: (videoId: string) => void;
  clearCaches: () => void; // New method for cleanup
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const QUEUE_SIZE = 10; // Top 10 video IDs
const MAX_ERROR_COUNT = 3; // Reduced for faster queue management

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  lastFetchTime: 0,
  cachedVideoIds: [],
  isResetting: false,
  errorCount: 0,
  blacklistedVideoIds: new Set<string>(),

  addToBlacklist: (videoId: string) => {
    const { blacklistedVideoIds } = get();
    const newBlacklist = new Set(blacklistedVideoIds);
    newBlacklist.add(videoId);
    console.log(`🚫 Added ${videoId} to local blacklist`);
    set({ blacklistedVideoIds: newBlacklist });
  },

  clearCaches: () => {
    console.log('🧹 Clearing video store caches...');
    set({
      videoQueue: [],
      currentVideoIndex: 0,
      lastFetchTime: 0,
      cachedVideoIds: [],
      isResetting: false,
      errorCount: 0,
      blacklistedVideoIds: new Set<string>(),
    });
  },

  fetchVideos: async (userId: string) => {
    const now = Date.now();
    const { lastFetchTime, isLoading, videoQueue, isResetting, blacklistedVideoIds } = get();
    
    // Don't fetch if already loading or resetting
    if (isLoading || isResetting) {
      return;
    }

    // Check if we need to fetch (cache expired or no videos)
    if (now - lastFetchTime < CACHE_DURATION && videoQueue.length > 0) {
      return;
    }

    set({ isLoading: true, errorCount: 0 });

    try {
      // First, get videos that the user has already watched
      const { data: watchedVideos, error: watchedError } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('viewer_id', userId);

      if (watchedError) {
        throw watchedError;
      }

      const watchedVideoIds = watchedVideos?.map(v => v.video_id) || [];
      
      // Get only ACTIVE videos with fresh query (top 10)
      let query = supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, user_id, status, updated_at')
        .eq('status', 'active') // Only active videos
        .neq('user_id', userId)
        .order('updated_at', { ascending: false }) // Order by updated_at to get freshest data
        .limit(QUEUE_SIZE * 3); // Get more to filter from

      const { data: allVideos, error } = await query;

      if (error) {
        throw error;
      }

      if (!allVideos || allVideos.length === 0) {
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0,
          isLoading: false,
          lastFetchTime: now,
          errorCount: 0
        });
        return;
      }

      // Filter videos on the client side with better logic
      const availableVideos = allVideos
        .filter(video => {
          // Check if video has remaining views
          const hasRemainingViews = video.views_count < video.target_views;
          // Check if user hasn't watched this video
          const notWatched = !watchedVideoIds.includes(video.id);
          // Check if video is not blacklisted locally
          const notBlacklisted = !blacklistedVideoIds.has(video.youtube_url);
          // Double-check status is active
          const isActive = video.status === 'active';
          
          const isAvailable = hasRemainingViews && notWatched && notBlacklisted && isActive;
          
          return isAvailable;
        })
        .slice(0, QUEUE_SIZE) // Limit to top 10
        .map(video => ({
          id: video.id,
          youtube_url: video.youtube_url, // This is now the video ID
          title: video.title,
          duration_seconds: video.duration_seconds,
          coin_reward: video.coin_reward
        }));

      if (availableVideos.length === 0) {
        // Instead of setting empty queue, trigger reset
        set({ isLoading: false });
        await get().resetQueue(userId);
        return;
      }

      
      // Cache video IDs for performance
      const videoIds = availableVideos.map(v => v.id);
      
      set({ 
        videoQueue: availableVideos,
        currentVideoIndex: 0,
        isLoading: false,
        lastFetchTime: now,
        cachedVideoIds: videoIds,
        errorCount: 0
      });

    } catch (error) {
      set({ isLoading: false, errorCount: 0 });
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
      set({ currentVideoIndex: nextIndex, errorCount: 0 });
    } else {
      // Queue exhausted, clear it to trigger reload
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0, // Force refresh on next fetch
        errorCount: 0
      });
    }
  },

  removeCurrentVideo: async () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    if (!currentVideo) return;
    
    // Add to local blacklist to prevent immediate re-fetching
    get().addToBlacklist(currentVideo.youtube_url);
    
    // Remove from local queue
    const newQueue = videoQueue.filter((_, index) => index !== currentVideoIndex);
    
    if (newQueue.length === 0) {
      // No more videos, clear queue to trigger instant reload
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0, // Force fresh fetch
        errorCount: 0
      });
    } else {
      // Adjust index if needed
      const newIndex = currentVideoIndex >= newQueue.length ? 0 : currentVideoIndex;
      set({ 
        videoQueue: newQueue,
        currentVideoIndex: newIndex,
        errorCount: 0
      });
    }
  },

  markVideoAsUnplayable: async (youtubeVideoId: string, reason: string) => {
    try {
      // Add to local blacklist immediately
      get().addToBlacklist(youtubeVideoId);
      
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('youtube_url', youtubeVideoId); // youtube_url field contains the video ID
      
      if (error) {
        throw error;
      }
      
      // Remove from current queue instantly
      await get().removeCurrentVideo();
      
    } catch (error) {
      // Still remove from queue even if database update fails
      await get().removeCurrentVideo();
      throw error;
    }
  },

  handleVideoError: async (youtubeVideoId: string, errorType: string) => {
    const { errorCount } = get();
    const newErrorCount = errorCount + 1;
    
    // Critical errors that indicate unplayable videos
    const criticalUnplayableErrors = [
      'NOT_EMBEDDABLE', 
      'LOADING_TIMEOUT', 
      'API_LOAD_FAILED', 
      'LIVE_VIDEO', 
      'STUCK_BUFFERING', 
      'PAGE_ERROR',
      'MAX_RETRIES_REACHED'
    ];
    
    if (criticalUnplayableErrors.includes(errorType)) {
      await get().markVideoAsUnplayable(youtubeVideoId, errorType);
    } else {
      await get().removeCurrentVideo();
    }
    
    // Reset queue if too many critical errors
    if (newErrorCount >= MAX_ERROR_COUNT && criticalUnplayableErrors.includes(errorType)) {
      set({ errorCount: 0 });
      // Clear queue to force fresh fetch
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0
      });
    } else {
      set({ errorCount: newErrorCount });
    }
  },

  resetQueue: async (userId: string) => {
    const { isResetting, blacklistedVideoIds } = get();
    
    // Prevent multiple resets
    if (isResetting) {
      return;
    }

    set({ isResetting: true, errorCount: 0 });

    try {
      // Get ONLY ACTIVE videos with fresh data (top 10)
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, status, updated_at')
        .eq('status', 'active') // ONLY ACTIVE VIDEOS
        .neq('user_id', userId)
        .order('updated_at', { ascending: false }) // Get freshest data
        .limit(QUEUE_SIZE * 3); // Get more videos to filter from

      if (error) {
        throw error;
      }

      if (allVideos && allVideos.length > 0) {
        // Filter videos with remaining views and not blacklisted
        const availableVideos = allVideos.filter(video => {
          const hasRemainingViews = video.views_count < video.target_views;
          const notBlacklisted = !blacklistedVideoIds.has(video.youtube_url);
          const isActive = video.status === 'active';
          
          return hasRemainingViews && notBlacklisted && isActive;
        });

        if (availableVideos.length > 0) {
          const videoQueue = availableVideos
            .slice(0, QUEUE_SIZE) // Limit to top 10
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
            isResetting: false,
            errorCount: 0
          });

          return;
        }

        // If no videos with remaining views, clear blacklist and try again
        set({ blacklistedVideoIds: new Set<string>() });
        
        const videoQueue = allVideos
          .slice(0, QUEUE_SIZE) // Limit to top 10
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
          isResetting: false,
          errorCount: 0
        });

        return;
      }

      // No active videos available at all
      set({
        videoQueue: [],
        currentVideoIndex: 0,
        lastFetchTime: Date.now(),
        cachedVideoIds: [],
        isResetting: false,
        errorCount: 0
      });

    } catch (error) {
      set({ isResetting: false, errorCount: 0 });
    }
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0,
      cachedVideoIds: [],
      isResetting: false,
      errorCount: 0,
      blacklistedVideoIds: new Set<string>()
    });
  },
}));