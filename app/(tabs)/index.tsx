import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Play, SkipForward, Award, RefreshCw, DollarSign, Clock, Eye, TrendingUp } from 'lucide-react-native';
import SeamlessVideoPlayer from '@/components/SeamlessVideoPlayer';

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
    clearQueue 
  } = useVideoStore();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    videosWatched: 0,
    coinsEarned: 0,
    totalWatchTime: 0,
  });
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [currentVideoKey, setCurrentVideoKey] = useState(0);
  
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoChangeTimeRef = useRef<number>(Date.now());
  const lastVideoIdRef = useRef<string | null>(null);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: ${message}`);
    }
  };

  // Get current video
  const currentVideo = getCurrentVideo();

  // Stable video key that only changes when video actually changes
  useEffect(() => {
    if (currentVideo && currentVideo.youtube_url !== lastVideoIdRef.current) {
      console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Video changed to: ${currentVideo.youtube_url}`);
      lastVideoIdRef.current = currentVideo.youtube_url;
      videoChangeTimeRef.current = Date.now();
      setCurrentVideoKey(prev => prev + 1);
      setLoadingTimeout(false);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Set loading timeout for this video
      loadingTimeoutRef.current = setTimeout(() => {
        console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Video loading timeout - instant skip`);
        setLoadingTimeout(true);
        handleInstantSkip('Loading timeout');
      }, 3000); // 3 second timeout
    }
  }, [currentVideo?.youtube_url]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Fetch videos on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchVideos(user.id);
      fetchUserStats();
    }
  }, [user, fetchVideos]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data: views } = await supabase
        .from('video_views')
        .select('coins_earned, watched_duration')
        .eq('viewer_id', user.id)
        .eq('completed', true);

      if (views) {
        const videosWatched = views.length;
        const coinsEarned = views.reduce((sum, view) => sum + view.coins_earned, 0);
        const totalWatchTime = views.reduce((sum, view) => sum + view.watched_duration, 0);

        setStats({ videosWatched, coinsEarned, totalWatchTime });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleVideoComplete = useCallback(async () => {
    if (!currentVideo || !user) return;

    console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Video completed: ${currentVideo.youtube_url}`);
    
    // Clear loading timeout since video completed successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    try {
      // Record video completion
      const { error } = await supabase.rpc('complete_video_view', {
        user_uuid: user.id,
        video_uuid: currentVideo.id,
        watch_duration: currentVideo.duration_seconds
      });

      if (error) {
        console.error('Error completing video view:', error);
        showToast('Error recording video completion');
      } else {
        showToast(`✅ Earned ${currentVideo.coin_reward} coins!`);
        
        // Refresh profile to get updated coin balance
        await refreshProfile();
        
        // Update local stats
        setStats(prev => ({
          videosWatched: prev.videosWatched + 1,
          coinsEarned: prev.coinsEarned + currentVideo.coin_reward,
          totalWatchTime: prev.totalWatchTime + currentVideo.duration_seconds,
        }));
      }
    } catch (error) {
      console.error('Error in handleVideoComplete:', error);
      showToast('Error completing video');
    }

    // Move to next video after a short delay
    setTimeout(() => {
      moveToNextVideo();
    }, 1000);
  }, [currentVideo, user, refreshProfile, moveToNextVideo]);

  const handleVideoSkip = useCallback(() => {
    console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Video skipped: ${currentVideo?.youtube_url}`);
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    showToast('Video skipped');
    moveToNextVideo();
  }, [currentVideo, moveToNextVideo]);

  const handleVideoUnplayable = useCallback(() => {
    console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Video unplayable: ${currentVideo?.youtube_url}`);
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    showToast('Video removed from queue');
    moveToNextVideo();
  }, [currentVideo, moveToNextVideo]);

  const handleVideoError = useCallback((error: string) => {
    console.error(`[ViewTab] ${new Date().toLocaleTimeString()}: Video error:`, error);
    showToast('Video error occurred');
    moveToNextVideo();
  }, [moveToNextVideo]);

  const handleInstantSkip = useCallback((reason: string) => {
    console.log(`[ViewTab] ${new Date().toLocaleTimeString()}: Instant skip: ${reason}`);
    
    // Clear loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    showToast(reason);
    moveToNextVideo();
  }, [moveToNextVideo]);

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      clearQueue();
      await fetchVideos(user.id);
      await fetchUserStats();
      showToast('Queue refreshed!');
    } catch (error) {
      console.error('Error refreshing:', error);
      showToast('Error refreshing queue');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Show loading state
  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <View style={styles.coinDisplay}>
            <DollarSign color="white" size={20} />
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  // Show empty state
  if (!isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <View style={styles.coinDisplay}>
            <DollarSign color="white" size={20} />
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.emptyContainer}>
            <Play color="#999" size={64} />
            <Text style={styles.emptyTitle}>No Videos Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new videos to watch and earn coins!
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <RefreshCw color="white" size={20} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Watch & Earn</Text>
        <View style={styles.coinDisplay}>
          <DollarSign color="white" size={20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Eye color="#4ECDC4" size={16} />
            <Text style={styles.statValue}>{stats.videosWatched}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </View>
          <View style={styles.statItem}>
            <Award color="#FFA726" size={16} />
            <Text style={styles.statValue}>{stats.coinsEarned}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Clock color="#2ECC71" size={16} />
            <Text style={styles.statValue}>{formatTime(stats.totalWatchTime)}</Text>
            <Text style={styles.statLabel}>Watch Time</Text>
          </View>
        </View>

        {/* Current Video */}
        {currentVideo && (
          <View style={styles.videoContainer}>
            <View style={styles.videoHeader}>
              <Text style={styles.videoTitle}>{currentVideo.title}</Text>
              <View style={styles.videoMeta}>
                <Text style={styles.videoMetaText}>
                  {currentVideo.duration_seconds}s • {currentVideo.coin_reward} coins
                </Text>
                <Text style={styles.queuePosition}>
                  {currentVideoIndex + 1} of {videoQueue.length}
                </Text>
              </View>
            </View>

            {/* Video Player with stable key */}
            <SeamlessVideoPlayer
              key={`video-${currentVideo.id}-${currentVideoKey}`}
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

        {/* Queue Preview */}
        <View style={styles.queueSection}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Up Next</Text>
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
              <RefreshCw 
                color={refreshing ? "#999" : "#FF4757"} 
                size={20} 
                style={refreshing ? styles.spinning : undefined}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.queueList}>
            {videoQueue.slice(currentVideoIndex + 1, currentVideoIndex + 4).map((video, index) => (
              <View key={video.id} style={styles.queueItem}>
                <View style={styles.queueItemNumber}>
                  <Text style={styles.queueItemNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.queueItemContent}>
                  <Text style={styles.queueItemTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.queueItemMeta}>
                    {video.duration_seconds}s • {video.coin_reward} coins
                  </Text>
                </View>
              </View>
            ))}
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
    marginTop: 16,
    fontSize: 16,
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
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
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
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  videoContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
  videoHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoMetaText: {
    fontSize: 12,
    color: '#666',
  },
  queuePosition: {
    fontSize: 12,
    color: '#FF4757',
    fontWeight: '500',
  },
  queueSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  spinning: {
    transform: [{ rotate: '180deg' }],
  },
  queueList: {
    padding: 16,
    gap: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueItemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  queueItemContent: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  queueItemMeta: {
    fontSize: 12,
    color: '#666',
  },
});