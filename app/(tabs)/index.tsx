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
  Menu, 
  Clock, 
  ExternalLink,
  RotateCcw
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const videoHeight = Math.min(screenHeight * 0.35, 280);

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  error: string | null;
  retryCount: number;
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
    clearQueue 
  } = useVideoStore();

  const webViewRef = useRef<WebView>(null);
  const watchStartTimeRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const securityPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSecurityPausedRef = useRef(false);

  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isReady: false,
    hasStarted: false,
    isCompleted: false,
    error: null,
    retryCount: 0,
  });

  const [autoPlay, setAutoPlay] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Animation values
  const coinBounce = useSharedValue(1);
  const playButtonScale = useSharedValue(1);

  const currentVideo = getCurrentVideo();

  // Handle app state changes for security
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log(`🔒 App state change: ${appStateRef.current} -> ${nextAppState}`);
      
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('🔒 App going to background, forcing pause');
        isSecurityPausedRef.current = true;
        
        // Clear any existing timeout
        if (securityPauseTimeoutRef.current) {
          clearTimeout(securityPauseTimeoutRef.current);
        }
        
        // Force pause immediately
        handlePause(true);
        
        // Set a timeout to prevent immediate resume
        securityPauseTimeoutRef.current = setTimeout(() => {
          isSecurityPausedRef.current = false;
        }, 1000); // 1 second delay
        
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔒 App returning to foreground');
        // Don't automatically resume - user must manually play
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Focus effect to handle tab switching
  useFocusEffect(
    useCallback(() => {
      if (user && (!currentVideo || videoQueue.length === 0)) {
        fetchVideos(user.id);
      }
      
      return () => {
        // Pause video when leaving tab
        if (playerState.isPlaying) {
          handlePause(true);
        }
      };
    }, [user, currentVideo, videoQueue.length])
  );

  // Reset player state when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log(`🎬 Loading new video: ${currentVideo.youtube_url}`);
      setPlayerState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isReady: false,
        hasStarted: false,
        isCompleted: false,
        error: null,
        retryCount: 0,
      });
      watchStartTimeRef.current = 0;
      lastProgressTimeRef.current = 0;
      isSecurityPausedRef.current = false;
      
      // Clear any existing security timeout
      if (securityPauseTimeoutRef.current) {
        clearTimeout(securityPauseTimeoutRef.current);
        securityPauseTimeoutRef.current = null;
      }
    }
  }, [currentVideo?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (securityPauseTimeoutRef.current) {
        clearTimeout(securityPauseTimeoutRef.current);
      }
    };
  }, []);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      if (playerState.isPlaying && !isSecurityPausedRef.current) {
        const now = Date.now();
        const elapsed = Math.floor((now - lastProgressTimeRef.current) / 1000);
        
        if (elapsed >= 1) {
          setPlayerState(prev => ({
            ...prev,
            currentTime: prev.currentTime + elapsed
          }));
          lastProgressTimeRef.current = now;
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handlePlay = () => {
    // Prevent play if security paused
    if (isSecurityPausedRef.current) {
      console.log('🔒 Security pause: Play blocked');
      return;
    }

    if (!currentVideo || !playerState.isReady) return;

    console.log(`▶️ Playing video: ${currentVideo.youtube_url}`);
    
    playButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    webViewRef.current?.postMessage(JSON.stringify({ action: 'play' }));
    
    if (!playerState.hasStarted) {
      watchStartTimeRef.current = Date.now();
      setPlayerState(prev => ({ ...prev, hasStarted: true }));
    }
    
    lastProgressTimeRef.current = Date.now();
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
    startProgressTracking();
  };

  const handlePause = (isSecurityPause = false) => {
    if (!currentVideo) return;

    if (isSecurityPause) {
      console.log('🔒 Security pause: Forced pause');
    } else {
      console.log(`⏸️ Pausing video: ${currentVideo.youtube_url}`);
    }
    
    webViewRef.current?.postMessage(JSON.stringify({ action: 'pause' }));
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
    stopProgressTracking();
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || playerState.isCompleted) return;

    console.log(`✅ Video completed: ${currentVideo.youtube_url}`);
    
    setPlayerState(prev => ({ ...prev, isCompleted: true, isPlaying: false }));
    stopProgressTracking();

    try {
      const watchDuration = Math.max(playerState.currentTime, currentVideo.duration_seconds * 0.8);
      
      const { error } = await supabase.rpc('complete_video_view', {
        user_uuid: user.id,
        video_uuid: currentVideo.id,
        watch_duration: Math.floor(watchDuration)
      });

      if (error) throw error;

      await refreshProfile();
      
      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Auto-advance to next video
      setTimeout(() => {
        console.log('⏭️ Auto-advancing to next video');
        moveToNextVideo();
      }, 1500);

    } catch (error) {
      console.error('❌ Error completing video view:', error);
      Alert.alert('Error', 'Failed to complete video view');
    }
  };

  const handleSkipVideo = () => {
    if (!currentVideo) return;
    
    console.log(`⏭️ Instant skip: Video skipped manually`);
    Alert.alert(
      'Skip Video',
      'Are you sure you want to skip this video? You won\'t earn coins.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            setPlayerState(prev => ({ ...prev, isPlaying: false }));
            stopProgressTracking();
            moveToNextVideo();
          }
        }
      ]
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          console.log(`🎬 Video ready: ${currentVideo?.youtube_url}`);
          setPlayerState(prev => ({ 
            ...prev, 
            isReady: true, 
            duration: data.duration || currentVideo?.duration_seconds || 0,
            error: null 
          }));
          
          if (autoPlay && !isSecurityPausedRef.current) {
            setTimeout(() => handlePlay(), 500);
          }
          break;

        case 'ended':
          console.log(`⏭️ Video ended: ${currentVideo?.youtube_url}`);
          handleVideoComplete();
          break;

        case 'error':
          console.error(`❌ Video error: ${data.error}`);
          setPlayerState(prev => ({ 
            ...prev, 
            error: data.error,
            isPlaying: false,
            retryCount: prev.retryCount + 1
          }));
          
          if (currentVideo && playerState.retryCount < 3) {
            setTimeout(() => {
              webViewRef.current?.reload();
            }, 2000);
          } else if (currentVideo) {
            handleVideoError(currentVideo.youtube_url, data.error);
          }
          break;

        case 'timeupdate':
          if (data.currentTime && !isSecurityPausedRef.current) {
            setPlayerState(prev => ({ 
              ...prev, 
              currentTime: Math.floor(data.currentTime) 
            }));
            
            // Check if video should be completed
            const completionThreshold = Math.min(
              currentVideo?.duration_seconds || 30,
              (currentVideo?.duration_seconds || 30) * 0.8
            );
            
            if (data.currentTime >= completionThreshold && !playerState.isCompleted) {
              handleVideoComplete();
            }
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  };

  const handleRefresh = () => {
    if (user) {
      clearQueue();
      fetchVideos(user.id);
    }
  };

  const handleOpenYouTube = () => {
    if (currentVideo) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.youtube_url}`;
      Linking.openURL(youtubeUrl).catch(err => {
        console.error('Failed to open YouTube:', err);
        Alert.alert('Error', 'Could not open YouTube');
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to watch videos</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>VidGro</Text>
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
          <Text style={styles.headerTitle}>VidGro</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
          </Animated.View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Videos Available</Text>
          <Text style={styles.emptySubtitle}>
            There are no videos to watch right now. Try refreshing or check back later.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RotateCcw color="white" size={20} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const videoEmbedUrl = `data:text/html,<!DOCTYPE html>
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
    var isReady = false;

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${currentVideo.youtube_url}',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          start: 0
        },
        events: {
          onReady: function(event) {
            isReady = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready',
              duration: player.getDuration()
            }));
          },
          onStateChange: function(event) {
            if (event.data === YT.PlayerState.ENDED) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ended'
              }));
            }
          },
          onError: function(event) {
            var errorMessages = {
              2: 'INVALID_PARAMETER',
              5: 'HTML5_ERROR',
              100: 'VIDEO_NOT_FOUND',
              101: 'NOT_EMBEDDABLE',
              150: 'NOT_EMBEDDABLE'
            };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: errorMessages[event.data] || 'UNKNOWN_ERROR'
            }));
          }
        }
      });

      // Time update tracking
      setInterval(function() {
        if (isReady && player && player.getCurrentTime) {
          try {
            var currentTime = player.getCurrentTime();
            if (currentTime > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'timeupdate',
                currentTime: currentTime
              }));
            }
          } catch (e) {
            console.error('Time update error:', e);
          }
        }
      }, 1000);
    }

    // Message handler
    document.addEventListener('message', function(event) {
      if (!isReady || !player) return;
      
      try {
        var data = JSON.parse(event.data);
        if (data.action === 'play') {
          player.playVideo();
        } else if (data.action === 'pause') {
          player.pauseVideo();
        }
      } catch (e) {
        console.error('Message handler error:', e);
      }
    });

    window.addEventListener('message', function(event) {
      document.dispatchEvent(new MessageEvent('message', { data: event.data }));
    });
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>VidGro</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: videoEmbedUrl }}
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
        
        {playerState.error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Video Error: {playerState.error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => webViewRef.current?.reload()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Video Info */}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {currentVideo.title}
        </Text>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Clock color="#FF4757" size={16} />
            <Text style={styles.statText}>
              {formatTime(playerState.currentTime)} / {formatTime(currentVideo.duration_seconds)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={styles.statText}>{currentVideo.coin_reward} Coins</Text>
          </View>
        </View>

        {/* YouTube Link */}
        <TouchableOpacity style={styles.youtubeLink} onPress={handleOpenYouTube}>
          <ExternalLink color="#FF0000" size={16} />
          <Text style={styles.youtubeLinkText}>YouTube</Text>
        </TouchableOpacity>

        {/* Auto Play Toggle */}
        <View style={styles.autoPlayContainer}>
          <Text style={styles.autoPlayLabel}>Auto Play</Text>
          <TouchableOpacity
            style={[styles.toggle, autoPlay && styles.toggleActive]}
            onPress={() => setAutoPlay(!autoPlay)}
          >
            <View style={[styles.toggleThumb, autoPlay && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Animated.View style={playButtonAnimatedStyle}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={playerState.isPlaying ? () => handlePause() : handlePlay}
              disabled={!playerState.isReady || isSecurityPausedRef.current}
            >
              {playerState.isPlaying ? (
                <Pause color="white" size={32} />
              ) : (
                <Play color="white" size={32} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
            <SkipForward color="white" size={20} />
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
    fontWeight: 'bold',
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
  videoContainer: {
    height: videoHeight,
    backgroundColor: '#000',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -20,
  },
  videoTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: isSmallScreen ? 24 : 28,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 0.48,
    justifyContent: 'center',
  },
  coinIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  youtubeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  youtubeLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF0000',
    marginLeft: 8,
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  autoPlayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FF4757',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: isSmallScreen ? 60 : 70,
    height: isSmallScreen ? 60 : 70,
    borderRadius: isSmallScreen ? 30 : 35,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: isSmallScreen ? 14 : 16,
    borderRadius: 12,
    gap: 8,
  },
  skipButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});