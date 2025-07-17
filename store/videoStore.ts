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
  checkVideoCompletion: (videoId: string) => Promise<boolean>; // New method for completion check
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const QUEUE_SIZE = 5; // Reduced queue size for better performance
const MAX_ERROR_COUNT = 3; // Reduced for faster queue management

export const useVideoStore = create<VideoStore>()((set, get) => ({
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

  checkVideoCompletion: async (videoId: string) => {
    try {
      const { data: result, error } = await supabase
        .rpc('check_video_completion_status', {
          video_uuid: videoId
        });

      if (error) {
        console.error('Error checking video completion:', error);
        // If function doesn't exist, assume video should not be skipped
        return false;
      }

      if (result && result.should_skip) {
        console.log(`Video ${videoId} should be skipped:`, result.reason || 'Unknown reason');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in checkVideoCompletion:', error);
      // On any error, don't skip the video
      return false;
    }
  },
  fetchVideos: async (userId: string) => {
    const now = Date.now();
    const { lastFetchTime, isLoading, videoQueue, isResetting, blacklistedVideoIds } = get();
    
    // Add debug logging
    console.log(`📋 Fetch videos called - loading: ${isLoading}, resetting: ${isResetting}, queue length: ${videoQueue.length}`);
    
    // Don't fetch if already loading or resetting
    
    // Don't fetch if already loading or resetting
    if (isLoading || isResetting) {
      console.log(`⏳ Fetch already in progress, skipping...`);
      return;
    }

    // Check if we need to fetch (cache expired or no videos)
    if (now - lastFetchTime < CACHE_DURATION && videoQueue.length > 0) {
      console.log(`📋 Using cached videos (${videoQueue.length} available) - cache valid for ${Math.round((CACHE_DURATION - (now - lastFetchTime)) / 1000)}s more`);
      return;
    }

    console.log(`🔄 Fetching fresh videos for user...`);
    set({ isLoading: true, errorCount: 0 });

    try {
      // First, get videos that the user has already watched
      console.log(`📋 Getting watched videos for user ${userId}...`);
      const { data: watchedVideos, error: watchedError } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('viewer_id', userId);

      if (watchedError) {
        throw watchedError;
      }

      const watchedVideoIds = watchedVideos?.map(v => v.video_id) || [];
      console.log(`📋 User has watched ${watchedVideoIds.length} videos`);
      
      // Use enhanced function to get next videos for user
      const { data: availableVideos, error } = await supabase
        .rpc('get_next_video_for_user_enhanced', {
          user_uuid: userId
        });

      if (error) {
        throw error;
      }

      // If no videos from enhanced function, fall back to regular query
      if (!availableVideos || availableVideos.length === 0) {
        console.log(`📋 No videos from enhanced function, using fallback...`);
        
        const { data: fallbackVideos, error: fallbackError } = await supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, user_id, status, updated_at')
        .eq('status', 'active') // Only active videos
        .neq('user_id', userId)
        .order('updated_at', { ascending: false }) // Order by updated_at to get freshest data
        .limit(QUEUE_SIZE * 3); // Get more to filter from

        if (fallbackError) {
          throw fallbackError;
        }

        if (!fallbackVideos || fallbackVideos.length === 0) {
          console.log(`📋 No fallback videos available either`);
          console.log(`📋 No videos available at all`);
          set({ 
            videoQueue: [], 
            currentVideoIndex: 0,
            isLoading: false,
            lastFetchTime: now,
            errorCount: 0
          });
          return;
        }

        console.log(`📋 Found ${fallbackVideos.length} fallback videos, filtering...`);
        
        // Filter fallback videos
        const filteredVideos = fallbackVideos
          .filter(video => {
            const hasRemainingViews = video.views_count < video.target_views;
            const notWatched = !watchedVideoIds.includes(video.id);
            const notBlacklisted = !blacklistedVideoIds.has(video.youtube_url);
            const isActive = video.status === 'active';
            
            if (!hasRemainingViews) console.log(`📋 Video ${video.youtube_url} filtered: no remaining views (${video.views_count}/${video.target_views})`);
            if (!notWatched) console.log(`📋 Video ${video.youtube_url} filtered: already watched`);
            if (!notBlacklisted) console.log(`📋 Video ${video.youtube_url} filtered: blacklisted`);
            if (!isActive) console.log(`📋 Video ${video.youtube_url} filtered: not active (${video.status})`);
            
            return hasRemainingViews && notWatched && notBlacklisted && isActive;
          })
          .slice(0, QUEUE_SIZE)
          .map(video => ({
            id: video.id,
            youtube_url: video.youtube_url,
            title: video.title,
            duration_seconds: video.duration_seconds,
            coin_reward: video.coin_reward
          }));

        console.log(`📋 After filtering: ${filteredVideos.length} suitable videos found`);
        
        if (filteredVideos.length === 0) {
          console.log(`📋 No suitable videos after filtering, resetting queue...`);
          // Instead of resetting immediately, wait a bit
          setTimeout(() => {
          set({ isLoading: false });
          await get().resetQueue(userId);
          return;
        }

        console.log(`📋 Loaded ${filteredVideos.length} videos from fallback`);
        set({ 
          videoQueue: filteredVideos,
          currentVideoIndex: 0,
          isLoading: false,
          lastFetchTime: now,
          cachedVideoIds: filteredVideos.map(v => v.id),
          errorCount: 0
        });
        return;
          }, 5000); // Wait 5 seconds before resetting
      }

      // Process enhanced function results
      const processedVideos = availableVideos.map(video => ({
        id: video.video_id,
        youtube_url: video.youtube_url,
        title: video.title,
        duration_seconds: video.duration_seconds,
        coin_reward: video.coin_reward
      }));
      
      console.log(`📋 Enhanced function returned ${processedVideos.length} videos`);
      // Cache video IDs for performance
      const videoIds = processedVideos.map(v => v.id);
      
      console.log(`📋 Loaded ${processedVideos.length} videos from enhanced function`);
      set({ 
        videoQueue: processedVideos,
        currentVideoIndex: 0,
        isLoading: false,
        lastFetchTime: now,
        cachedVideoIds: videoIds,
        errorCount: 0
      });

    } catch (error) {
      console.error('Error fetching videos:', error);
      console.log(`📋 Fetch error, will retry in 10 seconds...`);
      set({ isLoading: false, errorCount: 0 });
      throw error;
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    return videoQueue[currentVideoIndex] || null;
  },

  moveToNextVideo: async () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    console.log(`🎬 Moving to next video - current index: ${currentVideoIndex}, queue length: ${videoQueue.length}`);
    
    // Check if current video should be skipped due to completion
    if (currentVideo) {
      const shouldSkip = await get().checkVideoCompletion(currentVideo.id);
      if (shouldSkip) {
        console.log(`🔄 Skipping completed video: ${currentVideo.youtube_url}`);
        // Remove this video from queue immediately
        await get().removeCurrentVideo();
        return;
      }
    }
    
    const nextIndex = currentVideoIndex + 1;
    
    if (nextIndex < videoQueue.length) {
      console.log(`🎬 Moving to video ${nextIndex + 1}/${videoQueue.length}: ${videoQueue[nextIndex]?.youtube_url}`);
      console.log(`🎬 Moving to next video in queue (${nextIndex + 1}/${videoQueue.length})`);
      set({ currentVideoIndex: nextIndex, errorCount: 0 });
    } else {
      console.log(`📋 Queue exhausted, clearing to trigger reload`);
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
    
    console.log(`🗑️ Remove current video called for: ${currentVideo?.youtube_url}`);
    
    if (!currentVideo) return;
    
    console.log(`🗑️ Removing current video from queue: ${currentVideo.youtube_url}`);
    
    // Add to local blacklist to prevent immediate re-fetching
    get().addToBlacklist(currentVideo.youtube_url);
    
    // Remove from local queue
    const newQueue = videoQueue.filter((_, index) => index !== currentVideoIndex);
    
    if (newQueue.length === 0) {
      console.log(`📋 Queue empty after removal, will fetch new videos in 3 seconds...`);
      setTimeout(() => {
      console.log(`📋 No more videos in queue, clearing for fresh fetch`);
      // No more videos, clear queue to trigger instant reload
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0, // Force fresh fetch
        errorCount: 0
      });
      }, 3000); // Wait 3 seconds before clearing
    } else {
      console.log(`📋 ${newQueue.length} videos remaining in queue`);
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
      console.log(`🚫 Marking video as unplayable: ${youtubeVideoId} (${reason})`);
      
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
    
    console.log(`❌ Video error: ${youtubeVideoId} - ${errorType} (error count: ${errorCount + 1})`);
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
    
    console.log(`🔄 Reset queue called for user ${userId}`);
    
    // Prevent multiple resets
    if (isResetting) {
      return;
    }

    set({ isResetting: true, errorCount: 0 });

    try {
      // Get ONLY ACTIVE videos with fresh data (top 10)
      console.log(`🔄 Fetching active videos for reset...`);
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, views_count, target_views, status, updated_at')
        .eq('status', 'active') // ONLY ACTIVE VIDEOS
        .neq('user_id', userId)
        .order('updated_at', { ascending: false }) // Get freshest data
        .limit(QUEUE_SIZE * 3); // Get more videos to filter from

      if (error) {
        throw error;
      }

      console.log(`🔄 Found ${allVideos?.length || 0} active videos for reset`);
      
      if (allVideos && allVideos.length > 0) {
        // Filter videos with remaining views and not blacklisted
        const availableVideos = allVideos.filter(video => {
          const hasRemainingViews = video.views_count < video.target_views;
          const notBlacklisted = !blacklistedVideoIds.has(video.youtube_url);
          const isActive = video.status === 'active';
          
          return hasRemainingViews && notBlacklisted && isActive;
        });

        console.log(`🔄 After filtering: ${availableVideos.length} available videos`);
        
        if (availableVideos.length > 0) {
          const videoQueue = availableVideos
            .slice(0, QUEUE_SIZE) // Limit to top 10
            .map(video => ({
              id: video.id,
              youtube_url: video.youtube_url, // This is now the video ID
              title: video.title,
              duration_seconds: video.duration_seconds,
              coin_reward: calculateCoinsByDuration(video.duration_seconds) // Calculate coins based on duration
            }));
          
        console.log(`🔄 Reset with cleared blacklist: ${videoQueue.length} videos`);
          console.log(`🔄 Reset complete: ${videoQueue.length} videos in new queue`);


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
        console.log(`🔄 No available videos, clearing blacklist and retrying...`);
        set({ blacklistedVideoIds: new Set<string>() });
        
        const videoQueue = allVideos
          .slice(0, QUEUE_SIZE) // Limit to top 10
          .map(video => ({
            id: video.id,
            youtube_url: video.youtube_url, // This is now the video ID
            title: video.title,
            duration_seconds: video.duration_seconds,
            coin_reward: calculateCoinsByDuration(video.duration_seconds) // Calculate coins based on duration
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
      console.log(`🔄 No active videos available, queue will remain empty`);
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
      console.error('Error in resetQueue:', error);
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

// Helper function to calculate coins based on duration (matching database function)
const calculateCoinsByDuration = (durationSeconds: number): number => {
  if (durationSeconds >= 540) return 200;  // 540s = 200 coins
  if (durationSeconds >= 480) return 150;  // 480s = 150 coins
  if (durationSeconds >= 420) return 130;  // 420s = 130 coins
  if (durationSeconds >= 360) return 100;  // 360s = 100 coins
  if (durationSeconds >= 300) return 90;   // 300s = 90 coins
  if (durationSeconds >= 240) return 70;   // 240s = 70 coins
  if (durationSeconds >= 180) return 55;   // 180s = 55 coins
  if (durationSeconds >= 150) return 50;   // 150s = 50 coins
  if (durationSeconds >= 120) return 45;   // 120s = 45 coins
  if (durationSeconds >= 90) return 35;    // 90s = 35 coins
  if (durationSeconds >= 60) return 25;    // 60s = 25 coins
  if (durationSeconds >= 45) return 15;    // 45s = 15 coins
  if (durationSeconds >= 30) return 10;    // 30s = 10 coins
  return 5;  // Default for very short durations
};