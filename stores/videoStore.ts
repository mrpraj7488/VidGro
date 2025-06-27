import { create } from 'zustand';

interface Video {
  id: string;
  url: string;
  duration: number;
  coinReward: number;
  promoterId: string;
  createdAt: Date;
  views: number;
}

interface VideoState {
  videos: Video[];
  currentVideoIndex: number;
  userPromotions: Video[];
  addVideo: (video: Omit<Video, 'id' | 'views'>) => void;
  getNextVideo: () => Video | null;
  hasVideos: () => boolean;
  getUserPromotions: () => Video[];
  incrementViews: (videoId: string) => void;
  clearCache: () => void;
}

const defaultVideos: Video[] = [
  {
    id: '1',
    url: 'https://youtube.com/watch?v=sample1',
    duration: 45,
    coinReward: 36,
    promoterId: 'demo-user',
    createdAt: new Date(),
    views: 0,
  },
  {
    id: '2',
    url: 'https://youtube.com/watch?v=sample2',
    duration: 60,
    coinReward: 48,
    promoterId: 'demo-user2',
    createdAt: new Date(),
    views: 0,
  },
  {
    id: '3',
    url: 'https://youtube.com/watch?v=sample3',
    duration: 30,
    coinReward: 24,
    promoterId: 'demo-user3',
    createdAt: new Date(),
    views: 0,
  },
];

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: defaultVideos,
  currentVideoIndex: 0,
  userPromotions: [],

  addVideo: (video) => {
    const newVideo: Video = {
      ...video,
      id: Date.now().toString(),
      views: 0,
    };
    set((state) => ({
      videos: [...state.videos, newVideo],
      userPromotions: video.promoterId === 'current-user' 
        ? [...state.userPromotions, newVideo]
        : state.userPromotions,
    }));
  },

  getNextVideo: () => {
    const state = get();
    if (state.videos.length === 0) return null;
    
    const video = state.videos[state.currentVideoIndex];
    set((state) => ({
      currentVideoIndex: (state.currentVideoIndex + 1) % state.videos.length,
    }));
    
    return video;
  },

  hasVideos: () => {
    return get().videos.length > 0;
  },

  getUserPromotions: () => {
    return get().userPromotions;
  },

  incrementViews: (videoId: string) => {
    set((state) => ({
      videos: state.videos.map(video =>
        video.id === videoId ? { ...video, views: video.views + 1 } : video
      ),
      userPromotions: state.userPromotions.map(video =>
        video.id === videoId ? { ...video, views: video.views + 1 } : video
      ),
    }));
  },

  clearCache: () => {
    set({
      videos: defaultVideos,
      currentVideoIndex: 0,
      userPromotions: [],
    });
  },
}));