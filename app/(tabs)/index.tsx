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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, RefreshCw, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, Play, Pause, SkipForward } from 'lucide-react-native';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';
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
  
  const [videosWatched, setVideosWatched] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [queueState, setQueueState] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  useEffect(() => {
    if (user && !currentVideo && !loading && !isLoadingQueue) {
      console.log('🔄 No current video, auto-reloading queue...');
      loadVideoQueue();
    }
  }, [currentVideo, user, loading, isLoadingQueue]);

  useEffect(() => {
    const { videoQueue, currentVideoIndex } = useVideoStore.getState();
    setQueueState(`${currentVideoIndex + 1}/${videoQueue.length}`);
  }, [currentVideo]);

  const loadVideoQueue = async () => {
    if (!user || isLoadingQueue || loading) return;

    try {
      setLoading(true);
      setError(null);
      setSystemStatus('healthy');
      setStatusMessage('Loading videos...');
      
      console.log('🔄 Loading enhanced video queue for user:', user.id);
      
      await fetchVideos(user.id);
      
      const video = getCurrentVideo();
      if (!video) {
        console.log('⚠️ No active videos in queue, attempting reset...');
        setStatusMessage('Refreshing video queue...');
        
        await resetQueue(user.id);
        
        const newVideo = getCurrentVideo();
        if (!newVideo) {
          setError('No active videos available for viewing at the moment.');
          setSystemStatus('warning');
          setStatusMessage('No videos available');
        } else {
          setSystemStatus('healthy');
          setStatusMessage('Ready to watch');
          console.log('✅ Active video loaded after reset:', newVideo.youtube_url);
        }
      } else {
        setSystemStatus('healthy');
        setStatusMessage('Ready to watch');
        console.log('✅ Current active video loaded:', video.youtube_url);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading enhanced video queue:', error);
      setError(error.message || 'Failed to load videos. Please try again.');
      setSystemStatus('error');
      setStatusMessage('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || !profile) {
      console.error('❌ Missing required data for completing video');
      return;
    }

    try {
      console.log('🎯 Completing enhanced video silently:', currentVideo.youtube_url);
      setStatusMessage('Processing completion...');

      const { data: existingView } = await supabase
        .from('video_views')
        .select('id, coins_earned')
        .eq('video_id', currentVideo.id)
        .eq('viewer_id', user.id)
        .single();

      let coinsToAward = currentVideo.coin_reward;
      let shouldUpdateVideoCount = true;

      if (existingView) {
        console.log('🔄 User has watched this video before, updating existing view...');
        
        const { error: updateError } = await supabase
          .from('video_views')
          .update({
            watched_duration: currentVideo.duration_seconds,
            completed: true,
            coins_earned: existingView.coins_earned + currentVideo.coin_reward,
            created_at: new Date().toISOString()
          })
          .eq('id', existingView.id);

        if (updateError) {
          console.error('❌ Error updating existing video view:', updateError);
          throw new Error(`Failed to update video view: ${updateError.message}`);
        }

        shouldUpdateVideoCount = false;
        console.log('✅ Existing video view updated successfully');
      } else {
        console.log('🆕 First time watching this video, creating new view...');
        
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
          console.error('❌ Error creating video view:', viewError);
          throw new Error(`Failed to record video view: ${viewError.message}`);
        }

        console.log('✅ New video view recorded successfully');
      }

      const { error: coinError } = await supabase
        .from('profiles')
        .update({ 
          coins: (profile.coins || 0) + coinsToAward,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (coinError) {
        console.error('❌ Error updating coins:', coinError);
        throw new Error(`Failed to update coins: ${coinError.message}`);
      }

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
        console.error('⚠️ Error recording transaction:', transactionError);
      }

      if (shouldUpdateVideoCount) {
        const { data: videoData, error: fetchError } = await supabase
          .from('videos')
          .select('views_count')
          .eq('id', currentVideo.id)
          .single();

        if (fetchError) {
          console.error('⚠️ Error fetching video data:', fetchError);
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
            console.error('⚠️ Error updating video view count:', videoUpdateError);
          }
        }
      }

      console.log('✅ Enhanced video completion processed successfully');

      await refreshProfile();

      coinBounce.value = withSpring(1.3, { damping: 8 }, () => {
        coinBounce.value = withSpring(1);
      });
      
      progressScale.value = withTiming(1.2, { duration: 300 }, () => {
        progressScale.value = withTiming(1, { duration: 200 });
      });

      setVideosWatched(prev => prev + 1);

      setTimeout(() => {
        console.log('🔄 Moving to next video after enhanced completion...');
        moveToNextVideo();
        
        setTimeout(() => {
          const nextVideo = getCurrentVideo();
          if (!nextVideo) {
            console.log('🔄 No next video, triggering reload...');
            loadVideoQueue();
          } else {
            console.log('✅ Next video ready:', nextVideo.youtube_url);
          }
        }, 100);
      }, 100);

    } catch (error: any) {
      console.error('❌ Error completing enhanced video:', error);
      setError(error.message || 'Failed to complete video. Please try again.');
      setSystemStatus('error');
      setStatusMessage('Failed to complete video');
    }
  };

  const handleVideoSkip = () => {
    console.log('⏭️ Skipping enhanced video (user choice)');
    setStatusMessage('Skipping video...');
    showToast('Skipped video');
    
    moveToNextVideo();
    
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('🔄 No next video after skip, triggering reload...');
        loadVideoQueue();
      } else {
        console.log('✅ Next video ready after skip:', nextVideo.youtube_url);
      }
    }, 100);
  };

  const handleVideoUnplayable = async () => {
    console.log('🚨 Enhanced video is unplayable, removing from queue...');
    showToast('Removed unplayable video');
    
    await removeCurrentVideo();
    
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('🔄 No next video after removal, triggering reload...');
        loadVideoQueue();
      } else {
        console.log('✅ Next video ready after removal:', nextVideo.youtube_url);
      }
    }, 100);
  };

  const handleVideoError = (errorMessage: string) => {
    console.error('❌ Enhanced video error:', errorMessage);
    setError(errorMessage);
    setSystemStatus('error');
    setStatusMessage('Video playback error');
    
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.logo}>VidGro</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinText}>0</Text>
            <DollarSign color="#FFD700" size={16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#4CAF50" size={32} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (loading || isLoadingQueue) {
    return (
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.logo}>VidGro</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinText}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="#FFD700" size={16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#4CAF50" size={32} />
          <Text style={styles.loadingText}>Loading enhanced videos...</Text>
          <Text style={styles.loadingSubtext}>Filtering for embeddable content...</Text>
          {queueState && (
            <Text style={styles.loadingSubtext}>{queueState}</Text>
          )}
        </View>
      </View>
    );
  }

  if (error && !currentVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.logo}>VidGro</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinText}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="#FFD700" size={16} />
          </View>
        </View>
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
  const progressPercentage = currentVideo ? Math.round((currentTime / currentVideo.duration_seconds) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C2C2C" />
      
      {/* Modern Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.logo}>VidGro</Text>
        <View style={styles.coinDisplay}>
          <Animated.View style={coinAnimatedStyle}>
            <Text style={styles.coinText}>{profile?.coins || 0}</Text>
          </Animated.View>
          <DollarSign color="#FFD700" size={16} />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Video Player Section */}
        {currentVideo && videoId && (
          <View style={styles.videoSection}>
            <EnhancedVideoPlayer
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

        {/* Progress Bar */}
        {currentVideo && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>{progressPercentage}% complete</Text>
          </View>
        )}

        {/* Control Buttons */}
        {currentVideo && (
          <View style={styles.controlsSection}>
            <TouchableOpacity 
              style={styles.playPauseButton}
              onPress={() => {
                // This would be handled by the EnhancedVideoPlayer
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? (
                <Pause color="white" size={20} />
              ) : (
                <Play color="white" size={20} />
              )}
            </TouchableOpacity>
            
            {screenWidth >= 350 && (
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleVideoSkip}
              >
                <SkipForward color="#4CAF50" size={16} />
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Video Info */}
        {currentVideo && (
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {currentVideo.title}
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatTime(currentVideo.duration_seconds)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Animated.View style={coinAnimatedStyle}>
                  <Text style={styles.statValue}>{currentVideo.coin_reward}</Text>
                </Animated.View>
                <Text style={styles.statLabel}>Coins</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{queueState}</Text>
                <Text style={styles.statLabel}>Queue</Text>
              </View>
            </View>
          </View>
        )}

        {/* Status Display */}
        <View style={styles.statusSection}>
          <View style={styles.statusIndicator}>
            {systemStatus === 'healthy' && <CheckCircle color="#4CAF50" size={16} />}
            {systemStatus === 'warning' && <AlertTriangle color="#FFA726" size={16} />}
            {systemStatus === 'error' && <AlertTriangle color="#E74C3C" size={16} />}
            <Text style={[styles.statusText, { 
              color: systemStatus === 'healthy' ? '#4CAF50' : 
                     systemStatus === 'warning' ? '#FFA726' : '#E74C3C' 
            }]}>
              {statusMessage}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2C',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  videoSection: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    height: isSmallScreen ? screenHeight * 0.7 * 0.7 : screenHeight * 0.8 * 0.7,
    maxHeight: 400,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  progressSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 20,
  },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  skipButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  statusSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
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
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});