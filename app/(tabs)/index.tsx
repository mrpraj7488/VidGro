import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ToastAndroid,
  StatusBar,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, RefreshCw, TriangleAlert as AlertTriangle, Menu, Play, Pause, SkipForward, ExternalLink } from 'lucide-react-native';
import SeamlessVideoPlayer from '@/components/SeamlessVideoPlayer';
import { useVideoStore } from '@/store/videoStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isVerySmallScreen = screenWidth < 350;

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
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [videoTitle, setVideoTitle] = useState<string>('');

  const coinBounce = useSharedValue(1);
  const progressValue = useSharedValue(0);
  const webviewRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentVideo = getCurrentVideo();

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Handle app state changes for background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed from', appState, 'to', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('App resumed, checking video state');
        if (hasStarted && !isCompleted && autoPlay) {
          // Resume timer if video was playing and auto-play is enabled
          if (isPlaying) {
            console.log('Resuming timer on app resume');
            startTimer();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background - pause video and stop timer
        console.log('App backgrounded, pausing video and stopping timer for security');
        pauseVideo();
        stopTimer();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, hasStarted, isCompleted, isPlaying, autoPlay]);

  // Load video queue on mount
  useEffect(() => {
    if (user && profile) {
      loadVideoQueue();
    }
  }, [user, profile]);

  // Auto-reload queue when no current video
  useEffect(() => {
    if (user && !currentVideo && !loading && !isLoadingQueue) {
      console.log('🔄 No current video, auto-reloading queue...');
      loadVideoQueue();
    }
  }, [currentVideo, user, loading, isLoadingQueue]);

  // Reset video state when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('🎬 New video loaded:', currentVideo.title);
      setVideoTitle(currentVideo.title);
      setIsPlaying(false);
      setCurrentTime(0);
      setHasStarted(false);
      setIsCompleted(false);
      setPlayerError(null);
      progressValue.value = 0;
      stopTimer();
    }
  }, [currentVideo?.id]);

  const loadVideoQueue = async () => {
    if (!user || isLoadingQueue || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading video queue for user:', user.id);
      
      await fetchVideos(user.id);
      
      const video = getCurrentVideo();
      if (!video) {
        console.log('⚠️ No active videos in queue, attempting reset...');
        
        await resetQueue(user.id);
        
        const newVideo = getCurrentVideo();
        if (!newVideo) {
          setError('No active videos available for viewing at the moment.');
        } else {
          console.log('✅ Active video loaded after reset:', newVideo.youtube_url);
        }
      } else {
        console.log('✅ Current active video loaded:', video.youtube_url);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading video queue:', error);
      setError(error.message || 'Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Timer management functions
  const startTimer = useCallback(() => {
    if (timerRef.current || !hasStarted || isCompleted || !currentVideo) {
      return;
    }

    console.log('⏱️ Starting progress timer');
    
    timerRef.current = setInterval(() => {
      if (isPlaying && !isCompleted && appState === 'active') {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const progress = Math.min(newTime / currentVideo.duration_seconds, 1);
          
          // Smooth progress animation
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });

          // Check for completion
          if (newTime >= currentVideo.duration_seconds && !isCompleted) {
            console.log('🎯 Video completion detected via timer at', newTime, 'seconds');
            setIsCompleted(true);
            setIsPlaying(false);
            stopTimer();
            
            // Coin bounce animation
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            // Complete video after animation
            setTimeout(() => {
              handleVideoComplete();
            }, 500);
          }

          return newTime;
        });
      }
    }, 1000);
  }, [isPlaying, hasStarted, isCompleted, currentVideo, appState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      console.log('⏹️ Stopping progress timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Video control functions
  const playVideo = useCallback(() => {
    if (webviewRef.current && currentVideo) {
      console.log('▶️ Playing video:', currentVideo.youtube_url);
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
      setIsPlaying(true);
      if (!hasStarted) {
        setHasStarted(true);
      }
      startTimer();
    }
  }, [currentVideo, hasStarted, startTimer]);

  const pauseVideo = useCallback(() => {
    if (webviewRef.current) {
      console.log('⏸️ Pausing video');
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
      setIsPlaying(false);
      stopTimer();
    }
  }, [stopTimer]);

  const handlePlayPause = useCallback(() => {
    if (!currentVideo) return;
    
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo, currentVideo]);

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || !profile) {
      console.error('❌ Missing required data for completing video');
      return;
    }

    try {
      console.log('🎯 Completing video:', currentVideo.youtube_url);

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

      // Update user coins
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

      // Record transaction
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

      // Update video view count if first time watching
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

      console.log(`✅ Coins awarded: ${coinsToAward} for ${currentVideo.youtube_url}`);
      showToast(`Earned ${coinsToAward} coins!`);

      await refreshProfile();

      // Move to next video only if auto-play is enabled
      setTimeout(() => {
        if (autoPlay) {
          console.log('🔄 Auto-play enabled, moving to next video...');
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
        } else {
          console.log('⏸️ Auto-play disabled, staying on completed video');
          showToast('Video completed! Tap skip to continue.');
        }
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error completing video:', error);
      setError(error.message || 'Failed to complete video. Please try again.');
    }
  };

  const handleVideoSkip = () => {
    console.log('⏭️ Skipping video (user choice)');
    showToast('Skipped video');
    
    stopTimer();
    setIsPlaying(false);
    setCurrentTime(0);
    setHasStarted(false);
    setIsCompleted(false);
    progressValue.value = 0;
    
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
    console.log('🚨 Video is unplayable, removing from queue...');
    showToast('Removed unplayable video');
    
    stopTimer();
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
    console.error('❌ Video error:', errorMessage);
    setError(errorMessage);
    setPlayerError(errorMessage);
    
    setTimeout(() => {
      handleVideoUnplayable();
    }, 5000);
  };

  const openInYouTube = () => {
    if (currentVideo) {
      if (Platform.OS === 'web') {
        window.open(`https://www.youtube.com/watch?v=${currentVideo.youtube_url}`, '_blank');
      } else {
        showToast('Opening in YouTube...');
      }
    }
  };

  const handleAutoPlayToggle = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    console.log('🔄 Auto-play toggled:', newAutoPlay ? 'ON' : 'OFF');
    showToast(`Auto-play ${newAutoPlay ? 'enabled' : 'disabled'}`);
  };

  // Animated styles
  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>0</Text>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={isVerySmallScreen ? 28 : 32} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  // Loading videos state
  if (loading || isLoadingQueue) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={isVerySmallScreen ? 28 : 32} />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !currentVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.errorContainer}>
          <AlertTriangle color="#E74C3C" size={isVerySmallScreen ? 40 : 48} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              clearQueue();
              loadVideoQueue();
            }}
          >
            <RefreshCw color="white" size={isVerySmallScreen ? 16 : 20} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4757" />
      
      {/* Header */}
      <View style={styles.header}>
        <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
        <Text style={styles.headerTitle}>Video Promoter</Text>
        <View style={styles.coinDisplay}>
          <Animated.View style={coinAnimatedStyle}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
          <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
        </View>
      </View>

      {/* Video Player Section */}
      {currentVideo && (
        <View style={styles.videoSection}>
          <View style={styles.playerContainer}>
            <SeamlessVideoPlayer
              ref={webviewRef}
              videoId={currentVideo.id}
              youtubeUrl={currentVideo.youtube_url}
              duration={currentVideo.duration_seconds}
              coinReward={currentVideo.coin_reward}
              onVideoComplete={handleVideoComplete}
              onVideoSkip={handleVideoSkip}
              onError={handleVideoError}
              onVideoUnplayable={handleVideoUnplayable}
              autoPlay={autoPlay}
              onPlayerReady={() => {
                if (autoPlay && !hasStarted) {
                  setTimeout(() => {
                    playVideo();
                  }, 1500);
                }
              }}
              onStateChange={(state) => {
                if (state === 1) { // PLAYING
                  setIsPlaying(true);
                  if (!hasStarted) {
                    setHasStarted(true);
                  }
                  startTimer();
                } else if (state === 2) { // PAUSED
                  setIsPlaying(false);
                  stopTimer();
                }
              }}
            />
            
            {/* Progress Bar Overlay */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>
          </View>

          {/* Video Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
              {videoTitle}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Controls Section */}
      <View style={styles.bottomSection}>
        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.youtubeButton}
            onPress={openInYouTube}
          >
            <ExternalLink color="#666" size={isVerySmallScreen ? 14 : 16} />
            <Text style={styles.youtubeButtonText}>Open on Youtube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity
              style={[styles.toggleSwitch, autoPlay && styles.toggleSwitchActive]}
              onPress={handleAutoPlayToggle}
            >
              <View style={[styles.toggleThumb, autoPlay && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {currentVideo && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Math.max(0, currentVideo.duration_seconds - currentTime)}
              </Text>
              <Text style={styles.statLabel}>Seconds to get coins</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentVideo.coin_reward}</Text>
              <Text style={styles.statLabel}>Coins will be added</Text>
            </View>
          </View>
        )}

        {/* Progress Info */}
        {currentVideo && hasStarted && (
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {formatTime(currentTime)} / {formatTime(currentVideo.duration_seconds)} 
              {' '}({Math.round((currentTime / currentVideo.duration_seconds) * 100)}%)
            </Text>
            {isCompleted && (
              <Text style={styles.completedText}>
                ✅ Video completed! {autoPlay ? 'Moving to next...' : 'Tap skip to continue'}
              </Text>
            )}
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.playButton, !currentVideo && styles.buttonDisabled]}
            onPress={handlePlayPause}
            disabled={!currentVideo}
          >
            {isPlaying ? (
              <Pause color="white" size={isVerySmallScreen ? 16 : 20} />
            ) : (
              <Play color="white" size={isVerySmallScreen ? 16 : 20} />
            )}
            <Text style={styles.playButtonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleVideoSkip}>
            <SkipForward color="white" size={isVerySmallScreen ? 16 : 20} />
            <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF4757',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isVerySmallScreen ? 10 : 12,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 20,
  },
  coinCount: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    marginRight: 4,
  },
  videoSection: {
    backgroundColor: '#000',
    marginHorizontal: isVerySmallScreen ? 8 : 16,
    marginTop: isVerySmallScreen ? 8 : 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playerContainer: {
    position: 'relative',
    height: isVerySmallScreen 
      ? screenHeight * 0.3 
      : isSmallScreen 
        ? screenHeight * 0.35 
        : screenHeight * 0.4,
    backgroundColor: '#000',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  titleContainer: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  videoTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: isVerySmallScreen ? 18 : 22,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingTop: isVerySmallScreen ? 16 : 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: isVerySmallScreen ? 10 : 12,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  youtubeButtonText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#666',
    fontWeight: '500',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isVerySmallScreen ? 8 : 12,
  },
  autoPlayLabel: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    fontWeight: '500',
  },
  toggleSwitch: {
    width: isVerySmallScreen ? 44 : 50,
    height: isVerySmallScreen ? 26 : 30,
    borderRadius: isVerySmallScreen ? 13 : 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: isVerySmallScreen ? 22 : 26,
    height: isVerySmallScreen ? 22 : 26,
    borderRadius: isVerySmallScreen ? 11 : 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: isVerySmallScreen ? 20 : 30,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: isVerySmallScreen ? 28 : isSmallScreen ? 32 : 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isVerySmallScreen ? 4 : 6,
  },
  statLabel: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 12 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 14 : 18,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 16 : 20,
    paddingHorizontal: 16,
  },
  progressText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  completedText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    flex: 1,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    flex: 1,
    gap: 8,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    lineHeight: isVerySmallScreen ? 20 : 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
  },
});