import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  ToastAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Play, Pause, SkipForward, Award, Clock, RefreshCw, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface Video {
  id: string;
  youtube_url: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
}

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { 
    videoQueue, 
    currentVideoIndex, 
    isLoading, 
    fetchVideos, 
    getCurrentVideo, 
    moveToNextVideo, 
    clearQueue,
    resetQueue,
    handleVideoError,
    markVideoAsUnplayable
  } = useVideoStore();

  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [completedVideos, setCompletedVideos] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [playerKey, setPlayerKey] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [skipReason, setSkipReason] = useState<string>('');

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const LOADING_TIMEOUT = 8000; // 8 seconds timeout
  const INITIALIZATION_TIMEOUT = 3000; // 3 seconds for initialization

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed from', appState, 'to', nextAppState);
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Initialize video queue
  useEffect(() => {
    if (user && !hasInitialized) {
      console.log('🎬 Initializing video queue for user:', user.id);
      setHasInitialized(true);
      initializeVideoQueue();
    }
  }, [user, hasInitialized]);

  // Update current video when queue changes
  useEffect(() => {
    const video = getCurrentVideo();
    console.log('📺 Current video updated:', video?.youtube_url || 'none', 'Queue length:', videoQueue.length);
    
    if (video && video.id !== currentVideo?.id) {
      console.log('🔄 Setting new current video:', video.youtube_url);
      setCurrentVideo(video);
      setVideoError(null);
      setSkipReason('');
      
      // Force player re-render with new key only when video actually changes
      setPlayerKey(prev => prev + 1);
      
      // Clear any existing timeouts
      clearTimeouts();
      
      // Set loading state and start timeout
      setIsVideoLoading(true);
      setLoadingStartTime(Date.now());
      
      // Set initialization timeout
      initializationTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Initialization timeout for video:', video.youtube_url);
        handleVideoTimeout('Initialization timeout - video may not be embeddable');
      }, INITIALIZATION_TIMEOUT);
      
    } else if (!video && videoQueue.length === 0 && !isLoading) {
      console.log('📭 No videos available, fetching more...');
      initializeVideoQueue();
    }
  }, [videoQueue, currentVideoIndex, currentVideo?.id, isLoading]);

  const clearTimeouts = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }
  };

  const initializeVideoQueue = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Fetching video queue...');
      await fetchVideos(user.id);
      
      // If still no videos after fetch, reset queue
      if (videoQueue.length === 0) {
        console.log('📭 No videos after fetch, resetting queue...');
        await resetQueue(user.id);
      }
    } catch (error) {
      console.error('❌ Error initializing video queue:', error);
      setVideoError('Failed to load videos. Please try again.');
    }
  };

  const handleVideoTimeout = useCallback((reason: string) => {
    console.log('⏰ Video timeout:', reason, 'for video:', currentVideo?.youtube_url);
    
    clearTimeouts();
    setIsVideoLoading(false);
    setSkipReason(reason);
    
    if (currentVideo) {
      // Mark as unplayable and move to next
      markVideoAsUnplayable(currentVideo.youtube_url, 'LOADING_TIMEOUT');
      showToast('Video unavailable, skipping...');
      
      setTimeout(() => {
        moveToNextVideo();
      }, 1000);
    }
  }, [currentVideo, markVideoAsUnplayable, moveToNextVideo]);

  const handleVideoComplete = useCallback(async () => {
    if (!user || !currentVideo) return;

    console.log('✅ Video completed:', currentVideo.youtube_url);
    clearTimeouts();
    setIsVideoLoading(false);

    try {
      // Award coins using the database function
      const { data: result, error } = await supabase
        .rpc('complete_video_view', {
          user_uuid: user.id,
          video_uuid: currentVideo.id,
          watch_duration: currentVideo.duration_seconds
        });

      if (error) {
        console.error('❌ Error completing video view:', error);
        showToast('Error awarding coins');
      } else if (result) {
        console.log('💰 Coins awarded for video completion');
        setCompletedVideos(prev => prev + 1);
        setTotalEarned(prev => prev + currentVideo.coin_reward);
        
        // Refresh profile to get updated coin balance
        await refreshProfile();
        
        showToast(`+${currentVideo.coin_reward} coins earned!`);
      }
    } catch (error) {
      console.error('❌ Error in handleVideoComplete:', error);
    }

    // Move to next video after a short delay
    setTimeout(() => {
      moveToNextVideo();
    }, 1500);
  }, [user, currentVideo, refreshProfile, moveToNextVideo]);

  const handleVideoSkip = useCallback(() => {
    console.log('⏭️ Video skipped:', currentVideo?.youtube_url);
    clearTimeouts();
    setIsVideoLoading(false);
    setSkipReason('Skipped by user');
    
    showToast('Video skipped');
    moveToNextVideo();
  }, [currentVideo, moveToNextVideo]);

  const handleVideoUnplayable = useCallback(async () => {
    if (!currentVideo) return;
    
    console.log('🚫 Video marked as unplayable:', currentVideo.youtube_url);
    clearTimeouts();
    setIsVideoLoading(false);
    setSkipReason('Video not embeddable');
    
    try {
      await markVideoAsUnplayable(currentVideo.youtube_url, 'NOT_EMBEDDABLE');
      showToast('Video removed from queue');
    } catch (error) {
      console.error('❌ Error marking video as unplayable:', error);
    }
    
    setTimeout(() => {
      moveToNextVideo();
    }, 1000);
  }, [currentVideo, markVideoAsUnplayable, moveToNextVideo]);

  const handleVideoError = useCallback((error: string) => {
    console.log('❌ Video error:', error, 'for video:', currentVideo?.youtube_url);
    clearTimeouts();
    setIsVideoLoading(false);
    setVideoError(error);
    setSkipReason(`Error: ${error}`);
    
    showToast('Video error, skipping...');
    
    setTimeout(() => {
      moveToNextVideo();
    }, 2000);
  }, [currentVideo, moveToNextVideo]);

  // Enhanced video player event handlers
  const handlePlayerReady = useCallback(() => {
    console.log('🎬 Player ready for video:', currentVideo?.youtube_url);
    clearTimeouts();
    setIsVideoLoading(false);
    setVideoError(null);
    setSkipReason('');
    
    // Set main loading timeout after player is ready
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Main loading timeout for video:', currentVideo?.youtube_url);
      handleVideoTimeout('Loading timeout - video may be stuck');
    }, LOADING_TIMEOUT);
  }, [currentVideo, handleVideoTimeout]);

  const handlePlayerError = useCallback((error: string, errorType: string) => {
    console.log('🚨 Player error:', error, 'type:', errorType, 'for video:', currentVideo?.youtube_url);
    clearTimeouts();
    
    const criticalErrors = ['NOT_EMBEDDABLE', 'LOADING_TIMEOUT', 'LIVE_VIDEO', 'API_ERROR'];
    
    if (criticalErrors.includes(errorType)) {
      handleVideoUnplayable();
    } else {
      handleVideoError(error);
    }
  }, [currentVideo, handleVideoUnplayable, handleVideoError]);

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh requested');
    setVideoError(null);
    setSkipReason('');
    clearQueue();
    setCurrentVideo(null);
    setPlayerKey(prev => prev + 1);
    
    if (user) {
      await initializeVideoQueue();
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Text style={styles.headerTitle}>Watch & Earn</Text>
        </LinearGradient>
        <View style={styles.centerContent}>
          <AlertTriangle color="#FF4757" size={48} />
          <Text style={styles.errorText}>Please log in to watch videos</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <RefreshCw color="white" size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.coins || 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedVideos}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalEarned}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {isLoading && !currentVideo ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        ) : videoError ? (
          <View style={styles.centerContent}>
            <AlertTriangle color="#FF4757" size={48} />
            <Text style={styles.errorText}>{videoError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <RefreshCw color="white" size={20} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : currentVideo ? (
          <View style={styles.videoContainer}>
            {/* Enhanced Video Player with stable key */}
            <EnhancedVideoPlayer
              key={`video-${currentVideo.id}-${playerKey}`}
              videoId={currentVideo.id}
              youtubeUrl={currentVideo.youtube_url}
              duration={currentVideo.duration_seconds}
              coinReward={currentVideo.coin_reward}
              onVideoComplete={handleVideoComplete}
              onVideoSkip={handleVideoSkip}
              onError={handlePlayerError}
              onVideoUnplayable={handleVideoUnplayable}
            />

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>
                {currentVideo.title}
              </Text>
              
              <View style={styles.videoStats}>
                <View style={styles.videoStatItem}>
                  <Clock color="#666" size={16} />
                  <Text style={styles.videoStatText}>
                    {Math.floor(currentVideo.duration_seconds / 60)}:{(currentVideo.duration_seconds % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                <View style={styles.videoStatItem}>
                  <Award color="#FFA726" size={16} />
                  <Text style={styles.videoStatText}>{currentVideo.coin_reward} coins</Text>
                </View>
              </View>

              {/* Status Display */}
              {isVideoLoading && (
                <View style={styles.statusContainer}>
                  <ActivityIndicator size="small" color="#FF4757" />
                  <Text style={styles.statusText}>
                    Loading video... {loadingStartTime && `(${Math.floor((Date.now() - loadingStartTime) / 1000)}s)`}
                  </Text>
                </View>
              )}

              {skipReason && (
                <View style={styles.statusContainer}>
                  <AlertTriangle color="#FFA726" size={16} />
                  <Text style={styles.statusText}>{skipReason}</Text>
                </View>
              )}

              {/* Queue Info */}
              <View style={styles.queueInfo}>
                <Text style={styles.queueText}>
                  Video {currentVideoIndex + 1} of {videoQueue.length}
                </Text>
                {videoQueue.length > 1 && (
                  <Text style={styles.queueSubtext}>
                    {videoQueue.length - currentVideoIndex - 1} more videos in queue
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <AlertTriangle color="#999" size={48} />
            <Text style={styles.emptyText}>No videos available</Text>
            <Text style={styles.emptySubtext}>Check back later for new content</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <RefreshCw color="white" size={20} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4757',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
  },
  videoInfo: {
    padding: 16,
    backgroundColor: 'white',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  videoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoStatText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
    flex: 1,
  },
  queueInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  queueSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});