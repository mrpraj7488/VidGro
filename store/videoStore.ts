import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface Video {
  id: string;
  youtube_url: string;
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
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  removeCurrentVideo: () => void;
  resetQueue: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const QUEUE_SIZE = 10;

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  lastFetchTime: 0,
  cachedVideoIds: [],

  fetchVideos: async (userId: string) => {
    const now = Date.now();
    const { lastFetchTime, isLoading, videoQueue } = get();
    
    // Check if we need to fetch (cache expired or no videos)
    if (isLoading || (now - lastFetchTime < CACHE_DURATION && videoQueue.length > 0)) {
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
      
      // Get all active videos that are not owned by the user
      let query = supabase
        .from('videos')
        .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views, user_id')
        .eq('status', 'active')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(QUEUE_SIZE * 2); // Get more to filter from

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

      // Filter videos on the client side
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
          youtube_url: video.youtube_url,
          title: video.title,
          duration_seconds: video.duration_seconds,
          coin_reward: video.coin_reward
        }));

      if (availableVideos.length === 0) {
        console.log('No available videos with remaining views, will reset queue');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0,
          isLoading: false,
          lastFetchTime: now 
        });
        return;
      }

      console.log(`Fetched ${availableVideos.length} videos for queue`);
      
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
      // Queue exhausted, reset instantly for seamless looping
      console.log('Queue exhausted, resetting for seamless looping...');
      get().resetQueue();
    }
  },

  removeCurrentVideo: async () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    if (!currentVideo) return;
    
    console.log('Removing unplayable video from queue:', currentVideo.id);
    
    // Remove from Supabase by marking as completed or paused
    try {
      await supabase
        .from('videos')
        .update({ status: 'paused' })
        .eq('id', currentVideo.id);
      
      console.log('Video marked as paused in Supabase:', currentVideo.id);
    } catch (error) {
      console.error('Error updating video status:', error);
    }
    
    // Remove from local queue
    const newQueue = videoQueue.filter((_, index) => index !== currentVideoIndex);
    
    if (newQueue.length === 0) {
      // No more videos, reset queue
      get().resetQueue();
    } else {
      // Adjust index if needed
      const newIndex = currentVideoIndex >= newQueue.length ? 0 : currentVideoIndex;
      set({ 
        videoQueue: newQueue,
        currentVideoIndex: newIndex
      });
    }
  },

  resetQueue: async () => {
    console.log('Resetting video queue for seamless looping...');
    
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0 // Force refresh on next fetch
    });
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0,
      cachedVideoIds: []
    });
  },
}));