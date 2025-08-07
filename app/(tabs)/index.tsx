import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoStore } from '../../store/videoStore';
import { watchVideo } from '../../lib/supabase';
import GlobalHeader from '@/components/GlobalHeader';
import { Play, Pause, SkipForward, RefreshCw, Coins, Clock, Eye } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { 
    videoQueue, 
    currentVideoIndex, 
    isLoading, 
    error, 
    fetchVideos, 
    getCurrentVideo, 
    moveToNextVideo,
    refreshQueue
  } = useVideoStore();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [hasEarnedCoins, setHasEarnedCoins] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const watchTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const coinBounce = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const currentVideo = getCurrentVideo();

  useEffect(() => {
    if (user && user.id) {
      console.log('🎬 ViewTab: User authenticated, fetching videos');
      fetchVideos(user.id);
    }
  }, [user, fetchVideos]);

  useEffect(() => {
    if (currentVideo) {
      console.log('🎬 ViewTab: Current video changed:', currentVideo.title);
      setCurrentVideoData(currentVideo);
      resetVideoState();
    }
  }, [currentVideo]);

  const resetVideoState = () => {
    setIsPlaying(false);
    setWatchStartTime(null);
    setTotalWatchTime(0);
    setHasEarnedCoins(false);
    setIsWebViewReady(false);
    watchTimeRef.current = 0;
    progressWidth.value = 0;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setWebViewKey(prev => prev + 1);
  };

  const startWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      watchTimeRef.current += 1;
      setTotalWatchTime(watchTimeRef.current);
      
      if (currentVideo) {
        const progress = Math.min(watchTimeRef.current / currentVideo.duration_seconds, 1);
        progressWidth.value = withTiming(progress, { duration: 500 });
        
        if (watchTimeRef.current >= currentVideo.duration_seconds && !hasEarnedCoins) {
          handleVideoCompleted();
        }
      }daegshetjedhjethhed
    }, 1000);
  };

  const stopWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVideoCompleted = async () => {
    if (!currentVideo || !user || hasEarnedCoins) return;

    console.log('🎬 ViewTab: Video completed, awarding coins');
    setHasEarnedCoins(true);
    stopWatchTimer();

    try {
      const result = await watchVideo(
        user.id,
        currentVideo.video_id,
        watchTimeRef.current,
        true
      );

      if (result.error) {
        console.error('Error awarding coins:', result.error);
        Alert.alert('Error', 'Failed to award coins. Please try again.');
        return;
      }

      if (result.