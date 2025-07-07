import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Play, SkipForward, Award, DollarSign, RefreshCw, TrendingUp, Eye, Clock, Users, Video } from 'lucide-react-native';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

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
    resetQueue
  } = useVideoStore();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalWatched: 0,
    coinsEarned: 0,
    averageWatchTime: 0
  });
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [currentVideoKey, setCurrentVideoKey] = useState(0);
  
  const lastVideoIdRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const coinBounce = useSharedValue(1);
  const statsOpacity = useSharedValue(0);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Get current video
  const currentVideo = getCurrentVideo();

  // Update video key only when video actually changes
  useEffect(() => {
    if (currentVideo && currentVideo.id !== lastVideoIdRef.current) {
      console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video changed to:', currentVideo.youtube_url);
      lastVideoIdRef.current = currentVideo.id;
      setCurrentVideoKey(prev => prev + 1);
      setLoadingTimeout(false);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [currentVideo?.id]);

  // Set loading timeout for current video
  useEffect(() => {
    if (currentVideo && !loadingTimeout) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set new timeout
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video loading timeout - instant skip');
        setLoadingTimeout(true);
        handleInstantSkip('Loading timeout');
      }, 3000); // 3 second timeout
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [currentVideo?.id, loadingTimeout]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user) {
      fetchVideos(user.id);
      fetchUserStats();
      
      // Animate stats in
      statsOpacity.value = withTiming(1, { duration: 800 });
    }
  }, [user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data: views } = await supabase
        .from('video_views')
        .select('watched_duration, coins_earned, completed')
        .eq('viewer_id', user.id);

      if (views) {
        const totalWatched = views.filter(v => v.completed).length;
        const coinsEarned = views.reduce((sum, v) => sum + v.coins_earned, 0);
        const averageWatchTime = views.length > 0 
          ? Math.round(views.reduce((sum, v) => sum + v.watched_duration, 0) / views.length)
          : 0;

        setStats({ totalWatched, coinsEarned, averageWatchTime });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleVideoComplete = useCallback(async () => {
    if (!currentVideo || !user) return;

    try {
      console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video completed:', currentVideo.youtube_url);
      
      // Award coins using the database function
      const { data: result, error } = await supabase
        .rpc('complete_video_view', {
          user_uuid: user.id,
          video_uuid: currentVideo.id,
          watch_duration: currentVideo.duration_seconds
        });

      if (error) {
        console.error('Error completing video view:', error);
        showToast('Error completing video view');
      } else if (result) {
        console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video view completed successfully');
        
        // Refresh profile to get updated coin balance
        await refreshProfile();
        
        // Update stats
        await fetchUserStats();
        
        // Coin bounce animation
        coinBounce.value = withSpring(1.3, { damping: 10 }, () => {
          coinBounce.value = withSpring(1, { damping: 10 });
        });
        
        showToast(`+${currentVideo.coin_reward} coins earned!`);
      }
    } catch (error) {
      console.error('Error in handleVideoComplete:', error);
      showToast('Error completing video');
    }

    // Move to next video after a short delay
    setTimeout(() => {
      moveToNextVideo();
    }, 1000);
  }, [currentVideo, user, refreshProfile, fetchUserStats, moveToNextVideo]);

  const handleVideoSkip = useCallback(() => {
    console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video skipped:', currentVideo?.youtube_url);
    moveToNextVideo();
  }, [currentVideo, moveToNextVideo]);

  const handleInstantSkip = useCallback((reason: string) => {
    console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Instant skip:', reason);
    showToast(`Skipping: ${reason}`);
    moveToNextVideo();
  }, [moveToNextVideo]);

  const handleVideoError = useCallback((error: string) => {
    console.error('[ViewTab]', new Date().toLocaleTimeString() + ': Video error:', error);
    showToast('Video error, skipping...');
    moveToNextVideo();
  }, [moveToNextVideo]);

  const handleVideoUnplayable = useCallback(() => {
    console.log('[ViewTab]', new Date().toLocaleTimeString() + ': Video unplayable, removing from queue');
    showToast('Video unavailable, skipping...');
    moveToNextVideo();
  }, [moveToNextVideo]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      clearQueue();
      await fetchVideos(user.id);
      await fetchUserStats();
      await refreshProfile();
      showToast('Queue refreshed!');
    } catch (error) {
      console.error('Error refreshing:', error);
      showToast('Error refreshing queue');
    } finally {
      setRefreshing(false);
    }
  }, [user, clearQueue, fetchVideos, fetchUserStats, refreshProfile]);

  const handleResetQueue = useCallback(async () => {
    if (!user) return;
    
    Alert.alert(
      'Reset Queue',
      'This will clear the current queue and fetch fresh videos. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await resetQueue(user.id);
              showToast('Queue reset successfully!');
            } catch (error) {
              console.error('Error resetting queue:', error);
              showToast('Error resetting queue');
            }
          }
        }
      ]
    );
  }, [user, resetQueue]);

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  // Loading state
  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <DollarSign color="white" size={20} />
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Loading videos...</Text>
          <Text style={styles.loadingSubtext}>Finding the best content for you</Text>
        </View>
      </View>
    );
  }

  // No videos available
  if (!isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <DollarSign color="white" size={20} />
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.emptyContainer}>
            <Video color="#999" size={64} />
            <Text style={styles.emptyTitle}>No Videos Available</Text>
            <Text style={styles.emptySubtitle}>
              There are no videos to watch right now. Pull down to refresh or check back later.
            </Text>
            
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <RefreshCw color="white" size={20} />
              <Text style={styles.refreshButtonText}>Refresh Queue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main video viewing interface
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Watch & Earn</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <DollarSign color="white" size={20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Stats */}
        <Animated.View style={[styles.statsContainer, statsAnimatedStyle]}>
          <View style={styles.statCard}>
            <Eye color="#4ECDC4" size={20} />
            <Text style={styles.statValue}>{stats.totalWatched}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.statCard}>
            <Award color="#FFA726" size={20} />
            <Text style={styles.statValue}>{stats.coinsEarned}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Clock color="#2ECC71" size={20} />
            <Text style={styles.statValue}>{stats.averageWatchTime}s</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </Animated.View>

        {/* Video Player */}
        {currentVideo && (
          <View style={styles.videoContainer}>
            <EnhancedVideoPlayer
              key={`video-${currentVideoKey}`}
              videoId={currentVideo.id}
              youtubeUrl={currentVideo.youtube_url}
              duration={currentVideo.duration_seconds}
              coinReward={currentVideo.coin_reward}
              onVideoComplete={handleVideoComplete}
              onVideoSkip={handleVideoSkip}
              onError={handleVideoError}
              onVideoUnplayable={handleVideoUnplayable}
            />
          </View>
        )}

        {/* Queue Info */}
        <View style={styles.queueInfo}>
          <View style={styles.queueHeader}>
            <View style={styles.queueStats}>
              <Users color="#666" size={16} />
              <Text style={styles.queueText}>
                Video {currentVideoIndex + 1} of {videoQueue.length}
              </Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetQueue}>
              <RefreshCw color="#666" size={16} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentVideoIndex + 1) / videoQueue.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(((currentVideoIndex + 1) / videoQueue.length) * 100)}%
            </Text>
          </View>
        </View>

        {/* Next Videos Preview */}
        {videoQueue.length > 1 && (
          <View style={styles.nextVideosContainer}>
            <Text style={styles.nextVideosTitle}>Coming Up Next</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {videoQueue.slice(currentVideoIndex + 1, currentVideoIndex + 4).map((video, index) => (
                <View key={video.id} style={styles.nextVideoCard}>
                  <View style={styles.nextVideoIcon}>
                    <Play color="#FF4757" size={16} />
                  </View>
                  <Text style={styles.nextVideoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <View style={styles.nextVideoReward}>
                    <Award color="#FFA726" size={12} />
                    <Text style={styles.nextVideoRewardText}>{video.coin_reward}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to Earn Coins</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Play color="#4ECDC4" size={16} />
              <Text style={styles.instructionText}>Watch videos completely to earn coins</Text>
            </View>
            <View style={styles.instructionItem}>
              <TrendingUp color="#2ECC71" size={16} />
              <Text style={styles.instructionText}>Use coins to promote your own videos</Text>
            </View>
            <View style={styles.instructionItem}>
              <RefreshCw color="#FFA726" size={16} />
              <Text style={styles.instructionText}>Pull down to refresh the video queue</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinCount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  videoContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  queueInfo: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4757',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'right',
  },
  nextVideosContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nextVideosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nextVideoCard: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  nextVideoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextVideoTitle: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 16,
  },
  nextVideoReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextVideoRewardText: {
    fontSize: 11,
    color: '#FFA726',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});