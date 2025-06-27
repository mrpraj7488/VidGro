import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const API_BASE_URL = 'https://qrpmofbpimrddfmfvogs.supabase.co/functions/v1';

// YouTube API Configuration
export const YOUTUBE_API_KEY = 'AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('supabase_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      await AsyncStorage.removeItem('supabase_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Health check function
export const checkApiHealth = async () => {
  try {
    const response = await axios.get('https://qrpmofbpimrddfmfvogs.supabase.co/rest/v1/', { 
      timeout: 5000,
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycG1vZmJwaW1yZGRmbWZ2b2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzczODQsImV4cCI6MjA2NjYxMzM4NH0.jxg5TzvXy5O_YRpYoz-YCUjtnwQSMPhMLWUgEJDIB_c'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API health check failed:', error);
    throw error;
  }
};

// YouTube embed URL generator
export const getYouTubeEmbedUrl = (videoId: string, autoplay = false) => {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    controls: '0',
    showinfo: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
  });
  
  if (autoplay) {
    params.set('autoplay', '1');
  }
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

// Extract video ID from YouTube URL
export const extractYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Validate YouTube video
export const validateYouTubeVideo = async (videoId: string) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,contentDetails,status',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    
    if (video.status.privacyStatus !== 'public') {
      throw new Error('Video must be public');
    }

    if (video.status.embeddable === false) {
      throw new Error('Video is not embeddable');
    }

    // Parse duration
    const duration = parseDuration(video.contentDetails.duration);
    
    if (duration < 10) {
      throw new Error('Video must be at least 10 seconds long');
    }
    
    if (duration > 300) {
      throw new Error('Video must be no longer than 5 minutes');
    }

    return {
      videoId,
      title: video.snippet.title,
      duration,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      description: video.snippet.description
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to validate video');
  }
};

// Parse ISO 8601 duration to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};