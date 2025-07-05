import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Menu, DollarSign, RefreshCw, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, ExternalLink } from 'lucide-react-native';
import SeamlessVideoPlayer from '@/components/SeamlessVideoPlayer';
import { useVideoStore } from '@/store/videoStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { 
    getCurrentVideo, 
    moveToNextVideo, 
    fetchVideos, 
    isLoading: isLoadingQueue,
    clearQueue,
    removeCurrentVideo,
    resetQueue
  } = useVideoStore();
  
  const [showMenu, setShowMenu] = useState(false);
  const [videosWatched, setVideosWatched] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const coinBounce = useSharedValue(1);
  const progressScale = useSharedValue(0);
  const currentVideo = getCurrentVideo();

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadVideoQueue();
    }
  }, [user, profile]);

  // Auto-reload when queue is empty
  useEffect(() => {
    if (user && !currentVideo && !loading && !isLoadingQueue) {
      console.log('No current video, auto-reloading queue...');
      loadVideoQueue();
    }
  }, [currentVideo, user, loading, isLoadingQueue]);

  const loadVideoQueue = async () => {
    if (!user || isLoadingQueue || loading) return;

    try {
      setLoading(true);
      setError(null);
      setSystemStatus('healthy');
      setStatusMessage('Loading videos...');
      
      console.log('Loading video queue for user:', user.id);
      
      await fetchVideos(user.id);
      
      const video = getCurrentVideo();
      if (!video) {
        // No videos available, try reset
        console.log('No videos in queue, attempting reset...');
        setStatusMessage('Refreshing video queue...');
        
        await resetQueue(user.id);
        
        // Check again after reset
        const newVideo = getCurrentVideo();
        if (!newVideo) {
          setError('No videos available for viewing at the moment.');
          setSystemStatus('warning');
          setStatusMessage('No videos available');
        } else {
          setSystemStatus('healthy');
          setStatusMessage('Ready to watch');
          console.log('Video loaded after reset:', newVideo);
        }
      } else {
        setSystemStatus('healthy');
        setStatusMessage('Ready to watch');
        console.log('Current video loaded:', video);
      }
      
    } catch (error: any) {
      console.error('Error loading video queue:', error);
      setError(error.message || 'Failed to load videos. Please try again.');
      setSystemStatus('error');
      setStatusMessage('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || !profile) {
      console.error('Missing required data for completing video');
      return;
    }

    try {
      console.log('Completing video silently:', currentVideo.id);
      setStatusMessage('Processing completion...');

      // Check if user has already watched this video
      const { data: existingView } = await supabase
        .from('video_views')
        .select('id, coins_earned')
        .eq('video_id', currentVideo.id)
        .eq('viewer_id', user.id)
        .single();

      let coinsToAward = currentVideo.coin_reward;
      let shouldUpdateVideoCount = true;

      if (existingView) {
        // User has watched this video before (looping scenario)
        console.log('User has watched this video before, updating existing view...');
        
        // Update the existing view record
        const { error: updateError } = await supabase
          .from('video_views')
          .update({
            watched_duration: currentVideo.duration_seconds,
            completed: true,
            coins_earned: existingView.coins_earned + currentVideo.coin_reward,
            created_at: new Date().toISOString() // Update timestamp for latest view
          })
          .eq('id', existingView.id);

        if (updateError) {
          console.error('Error updating existing video view:', updateError);
          throw new Error(`Failed to update video view: ${updateError.message}`);
        }

        // Don't update video view count for repeat views
        shouldUpdateVideoCount = false;
        console.log('Existing video view updated successfully');
      } else {
        // First time watching this video
        console.log('First time watching this video, creating new view...');
        
        const { error: viewError } = await supabase
          .from('video_views')
          .insert({
            video_id: currentVideo.id,
            viewer_id: user.id,
            watched_duration: currentVideo.duration_seconds,
            completed: true,
            coins_earned: currentVideo.coin_reward
          });

        if (viewError) {
          console.error('Error creating video view:', viewError);
          throw new Error(`Failed to record video view: ${viewError.message}`);
        }

        console.log('New video view recorded successfully');
      }

      // Always update user coins (both for new and repeat views)
      const { error: coinError } = await supabase
        .from('profiles')
        .update({ 
          coins: (profile.coins || 0) + coinsToAward,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (coinError) {
        console.error('Error updating coins:', coinError);
        throw new Error(`Failed to update coins: ${coinError.message}`);
      }

      // Record coin transaction
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: coinsToAward,
          transaction_type: 'video_watch',
          description: `Watched video: ${currentVideo.title}${existingView ? ' (repeat view)' : ''}`,
          reference_id: currentVideo.id
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
        // Don't throw error for transaction recording failure
      }

      // Update video view count only for first-time views
      if (shouldUpdateVideoCount) {
        // Get current views count first, then increment it
        const { data: videoData, error: fetchError } = await supabase
          .from('videos')
          .select('views_count')
          .eq('id', currentVideo.id)
          .single();

        if (fetchError) {
          console.error('Error fetching video data:', fetchError);
        } else {
          const newViewsCount = (videoData.views_count || 0) + 1;
          
          const { error: videoUpdateError } = await supabase
            .from('videos')
            .update({ 
              views_count: newViewsCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentVideo.id);

          if (videoUpdateError) {
            console.error('Error updating video view count:', videoUpdateError);
            // Don't throw error for view count update failure
          }
        }
      }

      console.log('Video completion processed successfully');

      // Silently refresh profile
      await refreshProfile();

      // Silent coin animation
      coinBounce.value = withSpring(1.3, { damping: 8 }, () => {
        coinBounce.value = withSpring(1);
      });
      
      progressScale.value = withTiming(1.2, { duration: 300 }, () => {
        progressScale.value = withTiming(1, { duration: 200 });
      });

      setVideosWatched(prev => prev + 1);

      // Move to next video immediately without popup
      setTimeout(() => {
        moveToNextVideo();
        
        // Check if we need to reload queue
        setTimeout(() => {
          const nextVideo = getCurrentVideo();
          if (!nextVideo) {
            console.log('No next video, triggering reload...');
            loadVideoQueue();
          }
        }, 100);
      }, 500);

    } catch (error: any) {
      console.error('Error completing video:', error);
      setError(error.message || 'Failed to complete video. Please try again.');
      setSystemStatus('error');
      setStatusMessage('Failed to complete video');
    }
  };

  const handleVideoSkip = () => {
    // Silent skip without confirmation
    setStatusMessage('Skipping video...');
    moveToNextVideo();
    
    // Check if we need to reload queue
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('No next video after skip, triggering reload...');
        loadVideoQueue();
      }
    }, 100);
  };

  const handleVideoUnplayable = async () => {
    console.log('Video is unplayable, removing from queue...');
    showToast('Video unavailable, skipping...');
    
    // Remove the unplayable video and move to next
    await removeCurrentVideo();
    
    // Check if we need to reload queue
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('No next video after removal, triggering reload...');
        loadVideoQueue();
      }
    }, 100);
  };

  const handleVideoError = (errorMessage: string) => {
    console.error('Video error:', errorMessage);
    setError(errorMessage);
    setSystemStatus('error');
    setStatusMessage('Video playback error');
    
    // Auto-skip after 5 seconds
    setTimeout(() => {
      handleVideoUnplayable();
    }, 5000);
  };

  const extractVideoId = (youtubeUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const openInYouTube = () => {
    if (currentVideo) {
      if (Platform.OS === 'web') {
        window.open(currentVideo.youtube_url, '_blank');
      } else {
        showToast('Opening in YouTube...');
      }
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy':
        return <CheckCircle color="#2ECC71" size={14} />;
      case 'warning':
        return <AlertTriangle color="#FFA726" size={14} />;
      case 'error':
        return <AlertTriangle color="#E74C3C" size={14} />;
      default:
        return <Info color="#666" size={14} />;
    }
  };

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'healthy':
        return '#2ECC71';
      case 'warning':
        return '#FFA726';
      case 'error':
        return '#E74C3C';
      default:
        return '#666';
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>VidGro</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={32} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (loading || isLoadingQueue) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => setShowMenu(true)}
            style={styles.menuButton}
          >
            <Menu color="white" size={20} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>VidGro</Text>
          
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <View style={styles.coinIcon}>
              <Text style={styles.coinSymbol}>$</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={32} />
          <Text style={styles.loadingText}>Loading videos...</Text>
          <Text style={styles.loadingSubtext}>Please wait...</Text>
        </View>
      </View>
    );
  }

  if (error && !currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => setShowMenu(true)}
            style={styles.menuButton}
          >
            <Menu color="white" size={20} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>VidGro</Text>
          
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <View style={styles.coinIcon}>
              <Text style={styles.coinSymbol}>$</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <AlertTriangle color="#E74C3C" size={48} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              setSystemStatus('healthy');
              clearQueue();
              loadVideoQueue();
            }}
          >
            <RefreshCw color="white" size={20} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const videoId = currentVideo ? extractVideoId(currentVideo.youtube_url) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => setShowMenu(true)}
          style={styles.menuButton}
        >
          <Menu color="white" size={20} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>VidGro</Text>
        
        <View style={styles.coinDisplay}>
          <Animated.View style={coinAnimatedStyle}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
          <View style={styles.coinIcon}>
            <Text style={styles.coinSymbol}>$</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Seamless Video Player */}
        {currentVideo && videoId && (
          <View style={styles.videoSection}>
            <SeamlessVideoPlayer
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

        {/* Video Info Card */}
        {currentVideo && (
          <View style={styles.videoInfoCard}>
            <View style={styles.videoHeader}>
              <View style={styles.statusIndicator}>
                {getStatusIcon()}
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {statusMessage}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.youtubeButton}
                onPress={openInYouTube}
              >
                <ExternalLink color="#FF4757" size={16} />
                <Text style={styles.youtubeButtonText}>YouTube</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.videoTitle} numberOfLines={2}>
              {currentVideo.title}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
              <Animated.View style={[styles.statItem, progressAnimatedStyle]}>
                <Text style={styles.statNumber}>{Math.floor(currentVideo.duration_seconds / 60)}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </Animated.View>
              
              <View style={styles.statDivider} />
              
              <Animated.View style={[styles.statItem, coinAnimatedStyle]}>
                <Text style={styles.statNumber}>{currentVideo.coin_reward}</Text>
                <Text style={styles.statLabel}>Coins</Text>
              </Animated.View>
            </View>
          </View>
        )}

        {/* Auto Play Toggle */}
        <View style={styles.autoPlayCard}>
          <View style={styles.autoPlayInfo}>
            <View style={styles.autoPlayIcon}>
              <Text style={styles.autoPlayIconText}>AP</Text>
            </View>
            <Text style={styles.autoPlayText}>Auto Play</Text>
          </View>
          <View style={styles.toggleContainer}>
            <View style={[styles.toggle, styles.toggleActive]}>
              <View style={styles.toggleThumb} />
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
  },
  coinCount: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    marginRight: 4,
  },
  coinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSymbol: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  videoSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
  },
  youtubeButtonText: {
    fontSize: 11,
    color: '#FF4757',
    fontWeight: '500',
  },
  videoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  autoPlayCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  autoPlayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoPlayIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoPlayIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  autoPlayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  toggleContainer: {
    padding: 4,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FF4757',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignSelf: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});