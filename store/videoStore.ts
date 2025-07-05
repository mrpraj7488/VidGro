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
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const QUEUE_SIZE = 10;

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  isLoading: false,
  lastFetchTime: 0,

  fetchVideos: async (userId: string) => {
    const now = Date.now();
    const { lastFetchTime, isLoading } = get();
    
    // Check if we need to fetch (cache expired or no videos)
    if (isLoading || (now - lastFetchTime < CACHE_DURATION && get().videoQueue.length > 0)) {
      return;
    }

    set({ isLoading: true });

    try {
      console.log('Fetching video queue for user:', userId);
      
      // Use the database function to get next videos for user
      const { data: videos, error } = await supabase
        .rpc('get_next_video_for_user', { user_uuid: userId });

      if (error) {
        console.error('Error fetching video queue:', error);
        throw error;
      }

      if (!videos || videos.length === 0) {
        console.log('No videos available in queue');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0, 
          isLoading: false,
          lastFetchTime: now 
        });
        return;
      }

      // The RPC function returns one video, but we can call it multiple times
      // or modify the function to return multiple videos
      const videoQueue: Video[] = [];
      
      // For now, we'll use the single video returned
      if (videos.length > 0) {
        videoQueue.push({
          id: videos[0].id,
          youtube_url: videos[0].youtube_url,
          title: videos[0].title,
          duration_seconds: videos[0].duration_seconds,
          coin_reward: videos[0].coin_reward
        });
      }

      // Try to fetch additional videos using a simpler query
      try {
        const { data: additionalVideos, error: additionalError } = await supabase
          .from('videos')
          .select('id, youtube_url, title, duration_seconds, coin_reward, views_count, target_views')
          .eq('status', 'active')
          .neq('user_id', userId)
          .not('id', 'in', `(
            SELECT video_id FROM video_views WHERE viewer_id = '${userId}'
          )`)
          .order('created_at', { ascending: false })
          .limit(QUEUE_SIZE);

        if (!additionalError && additionalVideos) {
          // Filter videos where views_count < target_views on the client side
          const availableVideos = additionalVideos
            .filter(video => video.views_count < video.target_views)
            .map(video => ({
              id: video.id,
              youtube_url: video.youtube_url,
              title: video.title,
              duration_seconds: video.duration_seconds,
              coin_reward: video.coin_reward
            }));

          // Add to queue if not already present
          availableVideos.forEach(video => {
            if (!videoQueue.find(v => v.id === video.id)) {
              videoQueue.push(video);
            }
          });
        }
      } catch (additionalFetchError) {
        console.warn('Could not fetch additional videos:', additionalFetchError);
        // Continue with the single video we have
      }

      console.log(`Fetched ${videoQueue.length} videos for queue`);
      
      set({ 
        videoQueue: videoQueue.slice(0, QUEUE_SIZE), // Limit to queue size
        currentVideoIndex: 0,
        isLoading: false,
        lastFetchTime: now
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
      // Queue exhausted, will need to fetch more videos
      set({ 
        videoQueue: [], 
        currentVideoIndex: 0,
        lastFetchTime: 0 // Force refresh on next fetch
      });
    }
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      lastFetchTime: 0
    });
  },
}));