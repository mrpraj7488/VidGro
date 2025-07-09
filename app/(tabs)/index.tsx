import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  AppState,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Menu,
  ExternalLink
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  hasError: boolean;
  isReady: boolean;
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
    handleVideoError,
    resetQueue 
  } = useVideoStore();

  // Video player state
  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    hasError: false,
    isReady: false,
  });

  // Control states
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isBackgroundPaused, setIsBackgroundPaused] = useState(false);

  // Refs
  const webViewRef = useRef<WebView>(null);
  const watchTimeRef = useRef(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundPauseRef = useRef(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const controlsOpacity = useSharedValue(1);
  const playButtonScale = useSharedValue(1);

  const currentVideo = getCurrentVideo();

  // Fixed app state change handler to prevent continuous play/pause
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log(`🔒 App state change: ${appStateRef.current} -> ${nextAppState}`);
      
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('🔒 App going to background, forcing pause');
        if (playerState.isPlaying) {
          backgroundPauseRef.current = true;
          setIsBackgroundPaused(true);
          pauseVideo();
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔒 App returning to foreground');
        // Don't auto-resume, let user manually play
        if (backgroundPauseRef.current) {
          setIsBackgroundPaused(false);
          backgroundPauseRef.current = false;
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [playerState.isPlaying]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user && videoQueue.length === 0) {
      fetchVideos(user.id);
    }
  }, [user, videoQueue.length, fetchVideos]);

  // Reset player state when video changes
  useEffect(() => {
    if (currentVideo) {
      setPlayerState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isBuffering: false,
        hasError: false,
        isReady: false,
      });
      setHasCompletedVideo(false);
      setRetryCount(0);
      setIsBackgroundPaused(false);
      backgroundPauseRef.current = false;
      watchTimeRef.current = 0;
      setWatchStartTime(null);
      
      // Clear any existing intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [currentVideo?.id]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && playerState.isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 300 });
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, playerState.isPlaying]);

  // Progress tracking
  useEffect(() => {
    if (playerState.isPlaying && !isBackgroundPaused) {
      progressIntervalRef.current = setInterval(() => {
        webViewRef.current?.postMessage(JSON.stringify({ action: 'getCurrentTime' }));
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [playerState.isPlaying, isBackgroundPaused]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  const playVideo = useCallback(() => {
    if (isBackgroundPaused) {
      console.log('🔒 Background pause active, cannot play');
      return;
    }
    
    webViewRef.current?.postMessage(JSON.stringify({ action: 'play' }));
    playButtonScale.value = withSequence(
      withSpring(0.8, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
  }, [isBackgroundPaused]);

  const pauseVideo = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ action: 'pause' }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isBackgroundPaused) {
      Alert.alert(
        'Video Paused',
        'Video was paused when you left the app. Tap play to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (playerState.isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
    showControlsTemporarily();
  }, [playerState.isPlaying, playVideo, pauseVideo, showControlsTemporarily, isBackgroundPaused]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    webViewRef.current?.postMessage(JSON.stringify({ 
      action: 'setMuted', 
      muted: newMutedState 
    }));
    showControlsTemporarily();
  }, [isMuted, showControlsTemporarily]);

  const skipVideo = useCallback(() => {
    if (!currentVideo) return;
    
    Alert.alert(
      'Skip Video',
      'Are you sure you want to skip this video? You won\'t earn coins for incomplete videos.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            console.log('⏭️ Manual skip: User requested');
            moveToNextVideo();
          }
        }
      ]
    );
  }, [currentVideo, moveToNextVideo]);

  const retryVideo = useCallback(() => {
    if (!currentVideo) return;
    
    setRetryCount(prev => prev + 1);
    setPlayerState(prev => ({ ...prev, hasError: false, isReady: false }));
    
    // Force WebView reload
    webViewRef.current?.reload();
  }, [currentVideo]);

  const completeVideoView = useCallback(async () => {
    if (!user || !currentVideo || hasCompletedVideo) return;

    const watchDuration = Math.floor(watchTimeRef.current);
    const requiredDuration = Math.min(currentVideo.duration_seconds, currentVideo.duration_seconds * 0.8);
    
    if (watchDuration < requiredDuration) {
      console.log(`⚠️ Video not completed: watched ${watchDuration}s, required ${requiredDuration}s`);
      return;
    }

    setHasCompletedVideo(true);
    
    try {
      const { data, error } = await supabase.rpc('complete_video_view', {
        user_uuid: user.id,
        video_uuid: currentVideo.id,
        watch_duration: watchDuration
      });

      if (error) throw error;

      if (data) {
        await refreshProfile();
        
        // Animate coin update
        coinBounce.value = withSequence(
          withSpring(1.3, { damping: 15, stiffness: 150 }),
          withSpring(1, { damping: 15, stiffness: 150 })
        );

        console.log('⏭️ Instant skip: Video completed');
        setTimeout(() => {
          moveToNextVideo();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error completing video view:', error);
    }
  }, [user, currentVideo, hasCompletedVideo, refreshProfile, moveToNextVideo]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setPlayerState(prev => ({ ...prev, isReady: true, hasError: false }));
          break;
          
        case 'stateChange':
          const isPlaying = data.state === 1;
          const isBuffering = data.state === 3;
          
          setPlayerState(prev => ({ 
            ...prev, 
            isPlaying: isPlaying && !isBackgroundPaused,
            isBuffering 
          }));
          
          if (isPlaying && !watchStartTime && !isBackgroundPaused) {
            setWatchStartTime(Date.now());
          }
          break;
          
        case 'timeUpdate':
          const currentTime = data.currentTime;
          const duration = data.duration;
          
          setPlayerState(prev => ({ ...prev, currentTime, duration }));
          
          if (watchStartTime && !isBackgroundPaused) {
            watchTimeRef.current = currentTime;
            
            // Check for completion
            const watchedPercentage = (currentTime / duration) * 100;
            const requiredPercentage = 80;
            
            if (watchedPercentage >= requiredPercentage && !hasCompletedVideo) {
              runOnJS(completeVideoView)();
            }
          }
          break;
          
        case 'error':
          console.error('🚨 YouTube Player Error:', data.error);
          setPlayerState(prev => ({ ...prev, hasError: true, isPlaying: false }));
          
          if (retryCount < 3) {
            setTimeout(() => retryVideo(), 2000);
          } else {
            handleVideoError(currentVideo?.youtube_url || '', data.error);
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  }, [watchStartTime, hasCompletedVideo, completeVideoView, retryCount, retryVideo, handleVideoError, currentVideo, isBackgroundPaused]);

  // New function to open video in YouTube
  const openVideoInYouTube = useCallback(() => {
    if (!currentVideo) return;
    
    const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.youtube_url}`;
    Linking.openURL(youtubeUrl).catch(err => {
      console.error('Failed to open YouTube URL:', err);
      Alert.alert('Error', 'Could not open YouTube app');
    });
  }, [currentVideo]);

  const generateYouTubeEmbedHTML = useCallback((videoId: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #000; }
            #player { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="player"></div>
          <script>
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            var player;
            
            function onYouTubeIframeAPIReady() {
              player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '${videoId}',
                playerVars: {
                  'autoplay': 0,
                  'controls': 0,
                  'disablekb': 1,
                  'fs': 0,
                  'modestbranding': 1,
                  'playsinline': 1,
                  'rel': 0,
                  'showinfo': 0
                },
                events: {
                  'onReady': onPlayerReady,
                  'onStateChange': onPlayerStateChange,
                  'onError': onPlayerError
                }
              });
            }

            function onPlayerReady(event) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready'
              }));
              
              setInterval(function() {
                if (player && player.getCurrentTime) {
                  try {
                    var currentTime = player.getCurrentTime();
                    var duration = player.getDuration();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'timeUpdate',
                      currentTime: currentTime,
                      duration: duration
                    }));
                  } catch (e) {}
                }
              }, 1000);
            }

            function onPlayerStateChange(event) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'stateChange',
                state: event.data
              }));
            }

            function onPlayerError(event) {
              var errorMessages = {
                2: 'INVALID_PARAMETER',
                5: 'HTML5_ERROR',
                100: 'VIDEO_NOT_FOUND',
                101: 'NOT_EMBEDDABLE',
                150: 'NOT_EMBEDDABLE'
              };
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                error: errorMessages[event.data] || 'UNKNOWN_ERROR',
                code: event.data
              }));
            }

            window.addEventListener('message', function(event) {
              try {
                var data = JSON.parse(event.data);
                
                switch(data.action) {
                  case 'play':
                    if (player && player.playVideo) {
                      player.playVideo();
                    }
                    break;
                  case 'pause':
                    if (player && player.pauseVideo) {
                      player.pauseVideo();
                    }
                    break;
                  case 'setMuted':
                    if (player) {
                      if (data.muted) {
                        player.mute();
                      } else {
                        player.unMute();
                      }
                    }
                    break;
                  case 'getCurrentTime':
                    if (player && player.getCurrentTime) {
                      var currentTime = player.getCurrentTime();
                      var duration = player.getDuration();
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'timeUpdate',
                        currentTime: currentTime,
                        duration: duration
                      }));
                    }
                    break;
                }
              } catch (e) {
                console.error('Error handling message:', e);
              }
            });
          </script>
        </body>
      </html>
    `;
  }, []);

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>View</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>View</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Videos Available</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new videos to watch and earn coins!
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => user && resetQueue(user.id)}
          >
            <RotateCcw color="white" size={20} />
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>View</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      {/* Video Player Container */}
      <View style={styles.videoContainer}>
        <TouchableOpacity 
          style={styles.videoWrapper}
          activeOpacity={1}
          onPress={showControlsTemporarily}
        >
          {playerState.hasError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Video Error</Text>
              <Text style={styles.errorMessage}>
                Failed to load video. Retrying... ({retryCount}/3)
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryVideo}>
                <RotateCcw color="white" size={20} />
                <Text style={styles.retryButtonText}>Retry Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ 
                html: generateYouTubeEmbedHTML(currentVideo.youtube_url)
              }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Video Controls Overlay */}
          <Animated.View style={[styles.controlsOverlay, controlsAnimatedStyle]}>
            {/* Background pause indicator */}
            {isBackgroundPaused && (
              <View style={styles.backgroundPauseIndicator}>
                <Text style={styles.backgroundPauseText}>
                  Video was paused when you left the app
                </Text>
              </View>
            )}

            {/* Main Controls */}
            <View style={styles.mainControls}>
              <Animated.View style={playButtonAnimatedStyle}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayPause}
                  disabled={!playerState.isReady}
                >
                  {playerState.isBuffering ? (
                    <Text style={styles.bufferingText}>⏳</Text>
                  ) : playerState.isPlaying && !isBackgroundPaused ? (
                    <Pause color="white" size={isSmallScreen ? 32 : 40} />
                  ) : (
                    <Play color="white" size={isSmallScreen ? 32 : 40} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                {isMuted ? (
                  <VolumeX color="white" size={20} />
                ) : (
                  <Volume2 color="white" size={20} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={skipVideo}>
                <SkipForward color="white" size={20} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Video Info */}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {currentVideo.title}
        </Text>
        
        {/* Clickable YouTube Link */}
        <TouchableOpacity 
          style={styles.youtubeLink}
          onPress={openVideoInYouTube}
        >
          <Text style={styles.youtubeLinkText}>YouTube</Text>
          <ExternalLink color="#FF4757" size={16} />
        </TouchableOpacity>

        <View style={styles.videoStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{currentVideo.duration_seconds}s</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Reward</Text>
            <Text style={styles.statValue}>🪙{currentVideo.coin_reward}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Progress</Text>
            <Text style={styles.statValue}>
              {Math.floor((watchTimeRef.current / currentVideo.duration_seconds) * 100)}%
            </Text>
          </View>
        </View>

        {/* Queue Info */}
        <View style={styles.queueInfo}>
          <Text style={styles.queueText}>
            Video {currentVideoIndex + 1} of {videoQueue.length}
          </Text>
          {videoQueue.length > 1 && (
            <Text style={styles.nextVideoText}>
              Next: {videoQueue[currentVideoIndex + 1]?.title || 'Loading...'}
            </Text>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 143, 177, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#F48FB1',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  videoContainer: {
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
    maxHeight: screenHeight * 0.4,
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backgroundPauseIndicator: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  backgroundPauseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mainControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
    borderRadius: isSmallScreen ? 30 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bufferingText: {
    fontSize: isSmallScreen ? 24 : 32,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  videoTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: isSmallScreen ? 24 : 28,
  },
  youtubeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  },
  youtubeLinkText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '600',
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  queueInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  nextVideoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});