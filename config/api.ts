import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const API_BASE_URL = 'http://localhost:3000/api';
export const HEALTH_CHECK_URL = 'http://localhost:3000/health';

// YouTube API Configuration
export const YOUTUBE_API_KEY = 'AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8';

// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAvBivevwxb9LsQPW3c2FJL-nIvHe0LLGc",
  authDomain: "vidpromo-77d67.firebaseapp.com",
  projectId: "vidpromo-77d67",
  storageBucket: "vidpromo-77d67.firebasestorage.app",
  messagingSenderId: "831714555684",
  appId: "1:831714555684:web:4ad0b62b8159d3c529e5b1",
  measurementId: "G-NMH0VQBNTH"
};

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
      const token = await AsyncStorage.getItem('auth_token');
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
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Health check function
export const checkApiHealth = async () => {
  try {
    const response = await axios.get(HEALTH_CHECK_URL, { timeout: 5000 });
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