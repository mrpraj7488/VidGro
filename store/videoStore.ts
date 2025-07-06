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
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  removeCurrentVideo: () => void;
  resetQueue: (userId: string) => Promise<void>;
  handleVideoError: (videoId: string, errorType: string) => Promise<void>;
  markVideoAsUnplayable: (videoId: string, reason: string) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const QUEUE_SIZE = 15; // Increased queue size for better variety
const MAX_ERROR_COUNT = 8; // Increased to prevent premature queue resets

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  lastFetchTime: 0,
  cachedVideoIds: [],
  isResetting: false,
  errorCount: 0,

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

    set({ isLoading: true, errorCount: 0 });

    try {
      console.log('🔄 Fetching video queue for user:', userId);
      
      // First, get videos that the user has already watched
      const { data: watchedVideos, error: watchedError } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('viewer_id', userId);

      if (watchedError) {
        console.error('❌ Error fetching watched videos:', watchedError);
        throw watchedError;
      }

      const watchedVideoIds = watchedVideos?.map(v => v.video_id) || [];
      console.log('📊 User has watched videos:', watchedVideoIds.length);
      
      // CRITICAL: Get only ACTIVE videos (status='active')
      let query = supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, user_id')
        .eq('status', 'active') // Only active videos
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUEUE_SIZE * 4); // Get more to filter from

      const { data: allVideos, error } = await query;

      if (error) {
        console.error('❌ Error fetching video queue:', error);
        throw error;
      }

      if (!allVideos || allVideos.length === 0) {
        console.log('❌ No active videos available in database');
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
          
          return hasRemainingViews && notWatched;
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
        console.log('⚠️ No available active videos with remaining views, will reset queue');
        // Instead of setting empty queue, trigger reset
        set({ isLoading: false });
        await get().resetQueue(userId);
        return;
      }

      console.log(`✅ Fetched ${availableVideos.length} active videos for queue`);
      console.log('📊 Queue state after fetch:', {
        totalVideos: availableVideos.length,
        firstVideo: availableVideos[0]?.youtube_url,
        lastVideo: availableVideos[availableVideos.length - 1]?.youtube_url
      });
      
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
      console.error('❌ Error in fetchVideos:', error);
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
    
    console.log(`🔄 Moving to next video: ${currentVideoIndex} -> ${nextIndex} (queue length: ${videoQueue.length})`);
    
    if (nextIndex < videoQueue.length) {
      set({ currentVideoIndex: nextIndex, errorCount: 0 });
      console.log(`✅ Moved to video index ${nextIndex}: ${videoQueue[nextIndex]?.youtube_url}`);
    } else {
      // Queue exhausted, clear it to trigger reload
      console.log('📭 Queue exhausted, clearing for reload...');
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
    
    console.log('🗑️ Removing video from queue:', currentVideo.youtube_url);
    
    // Remove from local queue
    const newQueue = videoQueue.filter((_, index) => index !== currentVideoIndex);
    
    console.log(`📊 Queue state after removal: ${newQueue.length} videos remaining`);
    
    if (newQueue.length === 0) {
      // No more videos, clear queue to trigger reload
      console.log('📭 No more videos after removal, clearing queue');
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0,
        errorCount: 0
      });
    } else {
      // Adjust index if needed
      const newIndex = currentVideoIndex >= newQueue.length ? 0 : currentVideoIndex;
      console.log(`✅ Queue updated: index ${currentVideoIndex} -> ${newIndex}, next video: ${newQueue[newIndex]?.youtube_url}`);
      set({ 
        videoQueue: newQueue,
        currentVideoIndex: newIndex,
        errorCount: 0
      });
    }
  },

  markVideoAsUnplayable: async (videoId: string, reason: string) => {
    console.log(`🚨 Marking video ${videoId} as unplayable: ${reason}`);
    
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('youtube_url', videoId); // youtube_url field contains the video ID
      
      if (error) {
        console.error('❌ Error marking video as unplayable:', error);
        throw error;
      }
      
      console.log(`✅ Video ${videoId} marked as unplayable in Supabase`);
      
      // Remove from current queue
      await get().removeCurrentVideo();
      
    } catch (error) {
      console.error('❌ Error in markVideoAsUnplayable:', error);
      throw error;
    }
  },

  handleVideoError: async (videoId: string, errorType: string) => {
    const { errorCount } = get();
    const newErrorCount = errorCount + 1;
    
    console.log(`🚨 Video error for ${videoId}: ${errorType} (count: ${newErrorCount})`);
    
    // Only mark as unplayable for specific critical error types
    const criticalUnplayableErrors = ['NOT_EMBEDDABLE', 'NO_VIDEO_DATA', 'PLAYBACK_FAILED'];
    
    if (criticalUnplayableErrors.includes(errorType)) {
      console.log(`🗑️ Error type ${errorType} indicates unplayable video, marking as such`);
      await get().markVideoAsUnplayable(videoId, errorType);
    } else {
      console.log(`⚠️ Error type ${errorType} does not indicate unplayable video, just removing from queue`);
      await get().removeCurrentVideo();
    }
    
    // Only reset queue if we have too many critical errors
    if (newErrorCount >= MAX_ERROR_COUNT && criticalUnplayableErrors.includes(errorType)) {
      console.log('🔄 Too many critical video errors, resetting queue...');
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
    const { isResetting } = get();
    
    // Prevent multiple resets
    if (isResetting) {
      console.log('🔄 Reset already in progress, skipping...');
      return;
    }

    console.log('🔄 Resetting video queue for seamless looping...');
    
    set({ isResetting: true, errorCount: 0 });

    try {
      // CRITICAL: Only get ACTIVE videos (status = 'active')
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views')
        .eq('status', 'active') // ONLY ACTIVE VIDEOS
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUEUE_SIZE * 3); // Get more videos to filter from

      if (error) {
        console.error('❌ Error fetching videos for reset:', error);
        throw error;
      }

      if (allVideos && allVideos.length > 0) {
        // Filter videos with remaining views on the client side
        const availableVideos = allVideos.filter(video => 
          video.views_count < video.target_views
        );

        if (availableVideos.length > 0) {
          console.log(`✅ Found ${availableVideos.length} active videos with remaining views for reset`);
          
          const videoQueue = availableVideos
            .slice(0, QUEUE_SIZE) // Limit to queue size
            .map(video => ({
              id: video.id,
              youtube_url: video.youtube_url, // This is now the video ID
              title: video.title,
              duration_seconds: video.duration_seconds,
              coin_reward: video.coin_reward
            }));

          console.log('📊 Reset queue state:', {
            totalVideos: videoQueue.length,
            firstVideo: videoQueue[0]?.youtube_url,
            lastVideo: videoQueue[videoQueue.length - 1]?.youtube_url
          });

          set({
            videoQueue,
            currentVideoIndex: 0,
            lastFetchTime: Date.now(),
            cachedVideoIds: videoQueue.map(v => v.id),
            isResetting: false,
            errorCount: 0
          });

          console.log('🎯 Queue reset complete with active videos only');
          return;
        }

        // If no videos with remaining views, use any active videos for seamless looping
        console.log('⚠️ No active videos with remaining views, using any active videos for seamless looping...');
        
        const videoQueue = allVideos
          .slice(0, QUEUE_SIZE) // Limit to queue size
          .map(video => ({
            id: video.id,
            youtube_url: video.youtube_url, // This is now the video ID
            title: video.title,
            duration_seconds: video.duration_seconds,
            coin_reward: video.coin_reward
          }));

        console.log('📊 Fallback reset queue state:', {
          totalVideos: videoQueue.length,
          firstVideo: videoQueue[0]?.youtube_url,
          lastVideo: videoQueue[videoQueue.length - 1]?.youtube_url
        });

        set({
          videoQueue,
          currentVideoIndex: 0,
          lastFetchTime: Date.now(),
          cachedVideoIds: videoQueue.map(v => v.id),
          isResetting: false,
          errorCount: 0
        });

        console.log('🎯 Queue reset complete with any active videos');
        return;
      }

      // No active videos available at all
      console.log('❌ No active videos available for reset');
      set({
        videoQueue: [],
        currentVideoIndex: 0,
        lastFetchTime: Date.now(),
        cachedVideoIds: [],
        isResetting: false,
        errorCount: 0
      });

    } catch (error) {
      console.error('❌ Error in resetQueue:', error);
      set({ isResetting: false, errorCount: 0 });
    }
  },

  clearQueue: () => {
    console.log('🗑️ Clearing video queue');
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0,
      cachedVideoIds: [],
      isResetting: false,
      errorCount: 0
    });
  },
}));