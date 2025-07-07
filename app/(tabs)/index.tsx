import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  ToastAndroid,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, DollarSign, Menu } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

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
    handleVideoError 
  } = useVideoStore();

  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [autoPlay, setAutoPlay] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(false);

  // Refs
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  const currentVideo = getCurrentVideo();
  const targetDuration = 30; // 30 seconds to earn coins
  const coinReward = 3; // 3 coins per video

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Extract YouTube video ID
  const extractVideoId = (url: string): string | null => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const youtubeVideoId = currentVideo ? extractVideoId(currentVideo.youtube_url) : null;

  // Create enhanced HTML content for YouTube iframe
  const createHtmlContent = (videoId: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
          font-family: 'Roboto', Arial, sans-serif;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
        .loading {
          color: white;
          text-align: center;
          padding: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <div id="loading" class="loading">Loading video...</div>
      
      <script>
        console.log('Initializing enhanced video player for: ${videoId}');
        
        var player;
        var isPlayerReady = false;
        var progressInterval;
        var hasCompleted = false;
        var targetDuration = ${targetDuration};
        var autoPlayEnabled = ${autoPlay};

        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = function() {
          console.error('Failed to load YouTube API');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'API_LOAD_ERROR',
            message: 'Failed to load YouTube API'
          }));
        };
        
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        function onYouTubeIframeAPIReady() {
          console.log('YouTube API ready');
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 0,
                'controls': 1,
                'modestbranding': 1,
                'showinfo': 0,
                'rel': 0,
                'fs': 0,
                'disablekb': 0,
                'playsinline': 1,
                'enablejsapi': 1,
                'origin': window.location.origin
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            console.error('Error creating player:', error);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_ERROR',
              message: 'Failed to create player'
            }));
          }
        }

        function onPlayerReady(event) {
          console.log('Player ready');
          isPlayerReady = true;
          document.getElementById('loading').style.display = 'none';
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${videoId}'
          }));
          
          // Start progress tracking
          startProgressTracking();
        }

        function onPlayerStateChange(event) {
          var state = event.data;
          var stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
          };
          
          console.log('Player state:', stateNames[state] || state);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
          
          if (state === 0 && autoPlayEnabled && !hasCompleted) { // ENDED
            hasCompleted = true;
            console.log('Video ended, auto-skipping...');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ENDED',
              autoSkip: true
            }));
          }
        }

        function onPlayerError(event) {
          console.error('Player error:', event.data);
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not embeddable',
            150: 'Video not embeddable'
          };
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: event.data,
            message: errorMessages[event.data] || 'Unknown error'
          }));
        }

        function startProgressTracking() {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          
          progressInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady) {
              try {
                var currentTime = player.getCurrentTime();
                var progress = Math.min(currentTime / targetDuration, 1) * 100;
                
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PROGRESS_UPDATE',
                  currentTime: currentTime,
                  progress: progress,
                  targetDuration: targetDuration
                }));
                
                // Check for coin earning completion
                if (currentTime >= targetDuration && !hasCompleted) {
                  hasCompleted = true;
                  console.log('Target duration reached, awarding coins');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'COINS_EARNED',
                    currentTime: currentTime,
                    coinsEarned: ${coinReward}
                  }));
                }
              } catch (error) {
                console.error('Error getting current time:', error);
              }
            }
          }, 1000);
        }

        // Control functions
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady) {
            player.playVideo();
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            player.pauseVideo();
          }
        };

        window.stopVideo = function() {
          if (player && player.stopVideo && isPlayerReady) {
            player.stopVideo();
          }
        };

        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            console.log('Page hidden, pausing video');
            window.pauseVideo();
          }
        });
      </script>
    </body>
    </html>
  `;

  // Handle app state changes for background playback prevention
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed:', appState, '->', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App resumed - can resume playback if it was playing
        console.log('App resumed');
      } else if (nextAppState.match(/inactive|background/)) {
        // App backgrounded - pause video immediately
        console.log('App backgrounded, pausing video');
        pauseVideo();
        setIsPlaying(false);
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user && videoQueue.length === 0) {
      fetchVideos(user.id);
    }
  }, [user, videoQueue.length, fetchVideos]);

  // Reset states when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('Video changed to:', currentVideo.youtube_url);
      setCurrentTime(0);
      setIsVideoLoaded(false);
      setPlayerError(null);
      setLoadingTimeout(false);
      setVideoCompleted(false);
      setCoinsEarned(false);
      setIsPlaying(false);
      progressValue.value = 0;
      
      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Set loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isVideoLoaded) {
          console.log('Video loading timeout');
          setLoadingTimeout(true);
          showToast('Video stuck, skipping...');
          handleSkipVideo();
        }
      }, 5000);
    }
  }, [currentVideo]);

  // WebView message handler
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          setIsVideoLoaded(true);
          setPlayerError(null);
          setLoadingTimeout(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
          
        case 'PROGRESS_UPDATE':
          setCurrentTime(data.currentTime);
          const progress = Math.min(data.currentTime / targetDuration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'COINS_EARNED':
          if (!coinsEarned) {
            setCoinsEarned(true);
            awardCoins(data.coinsEarned);
          }
          break;
          
        case 'VIDEO_ENDED':
          if (autoPlay && data.autoSkip) {
            handleAutoSkip();
          }
          break;
          
        case 'PLAYER_ERROR':
        case 'API_LOAD_ERROR':
          setPlayerError(data.message);
          showToast('Video error, skipping...');
          setTimeout(() => handleSkipVideo(), 2000);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [autoPlay, coinsEarned, targetDuration]);

  // Award coins function
  const awardCoins = async (coins: number) => {
    if (!user || !currentVideo) return;
    
    try {
      console.log(`Awarding ${coins} coins for video: ${currentVideo.youtube_url}`);
      
      const { data: result, error } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: coins,
          transaction_type_param: 'video_watch',
          description_param: `Watched video: ${currentVideo.title}`,
          reference_uuid: currentVideo.id
        });

      if (error) {
        console.error('Error awarding coins:', error);
        return;
      }

      if (result) {
        await refreshProfile();
        
        // Coin bounce animation
        coinBounce.value = withTiming(1.3, { duration: 200 }, () => {
          coinBounce.value = withTiming(1, { duration: 200 });
        });
        
        showToast(`Coins awarded: ${coins} for ${currentVideo.youtube_url}`);
        console.log(`Coins awarded: ${coins} for ${currentVideo.youtube_url}`);
      }
    } catch (error) {
      console.error('Error in awardCoins:', error);
    }
  };

  // Control functions
  const playVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.stopVideo && window.stopVideo(); true;');
    }
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const handleSkipVideo = () => {
    stopVideo();
    moveToNextVideo();
    if (user && videoQueue.length <= 2) {
      fetchVideos(user.id);
    }
  };

  const handleAutoSkip = () => {
    if (autoPlay) {
      setTimeout(() => {
        handleSkipVideo();
      }, 1000);
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    showToast(`Auto-play ${!autoPlay ? 'enabled' : 'disabled'}`);
  };

  // Animation styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  // Calculate iframe dimensions
  const iframeHeight = Math.min(screenHeight * 0.4, 300);
  const iframeWidth = iframeHeight * 0.75; // 70-80% of height for proper aspect ratio

  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="#FFD700" size={20} />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="#FFD700" size={20} />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>No videos available</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => user && fetchVideos(user.id)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Video Promoter</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          <DollarSign color="#FFD700" size={20} />
        </Animated.View>
      </LinearGradient>

      {/* Video Player Container */}
      <View style={styles.videoContainer}>
        {/* Loading State */}
        {(!isVideoLoaded || loadingTimeout) && (
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.videoLoadingText}>
              {loadingTimeout ? 'Video stuck, skipping...' : 'Loading video...'}
            </Text>
            <Text style={styles.videoIdText}>Video ID: {youtubeVideoId}</Text>
          </View>
        )}

        {/* WebView Player */}
        {youtubeVideoId && (
          <View style={[styles.iframeContainer, { height: iframeHeight, width: iframeWidth }]}>
            <WebView
              ref={webviewRef}
              source={{ html: createHtmlContent(youtubeVideoId) }}
              style={[styles.webview, !isVideoLoaded && styles.hidden]}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              scrollEnabled={false}
              bounces={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              originWhitelist={['*']}
              allowsFullscreenVideo={false}
            />
            
            {/* Progress Bar */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>
          </View>
        )}

        {/* Video Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.videoTitle} numberOfLines={1} ellipsizeMode="tail">
            {currentVideo.title}
          </Text>
        </View>
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        {/* Auto-play and Open YouTube */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.youtubeButton}>
            <Text style={styles.youtubeButtonText}>Open on Youtube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity 
              style={[styles.autoPlayToggle, autoPlay && styles.autoPlayToggleActive]}
              onPress={toggleAutoPlay}
            >
              <View style={[styles.autoPlayThumb, autoPlay && styles.autoPlayThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{targetDuration}</Text>
            <Text style={styles.statLabel}>Seconds to get coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{coinReward}</Text>
            <Text style={styles.statLabel}>Coins will be added</Text>
          </View>
        </View>

        {/* Play/Skip Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={handlePlayPause}
            disabled={!isVideoLoaded || loadingTimeout}
          >
            {isPlaying ? (
              <Pause color="rgba(255, 255, 255, 0.7)" size={24} />
            ) : (
              <Play color="rgba(255, 255, 255, 0.7)" size={24} />
            )}
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>

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
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  noVideoText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    paddingVertical: 20,
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    zIndex: 10,
  },
  videoLoadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  videoIdText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  iframeContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
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
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
  },
  controlsSection: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  youtubeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  youtubeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoPlayLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 12,
    fontWeight: '500',
  },
  autoPlayToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  autoPlayToggleActive: {
    backgroundColor: '#FF4757',
  },
  autoPlayThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  autoPlayThumbActive: {
    alignSelf: 'flex-end',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  playButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    position: 'absolute',
    bottom: -20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 140,
    height: 48,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  ToastAndroid,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, DollarSign, Menu } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

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
    handleVideoError 
  } = useVideoStore();

  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [autoPlay, setAutoPlay] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(false);

  // Refs
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  const currentVideo = getCurrentVideo();
  const targetDuration = 30; // 30 seconds to earn coins
  const coinReward = 3; // 3 coins per video

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Extract YouTube video ID
  const extractVideoId = (url: string): string | null => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const youtubeVideoId = currentVideo ? extractVideoId(currentVideo.youtube_url) : null;

  // Create enhanced HTML content for YouTube iframe
  const createHtmlContent = (videoId: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
          font-family: 'Roboto', Arial, sans-serif;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
        .loading {
          color: white;
          text-align: center;
          padding: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <div id="loading" class="loading">Loading video...</div>
      
      <script>
        console.log('Initializing enhanced video player for: ${videoId}');
        
        var player;
        var isPlayerReady = false;
        var progressInterval;
        var hasCompleted = false;
        var targetDuration = ${targetDuration};
        var autoPlayEnabled = ${autoPlay};

        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = function() {
          console.error('Failed to load YouTube API');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'API_LOAD_ERROR',
            message: 'Failed to load YouTube API'
          }));
        };
        
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        function onYouTubeIframeAPIReady() {
          console.log('YouTube API ready');
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 0,
                'controls': 1,
                'modestbranding': 1,
                'showinfo': 0,
                'rel': 0,
                'fs': 0,
                'disablekb': 0,
                'playsinline': 1,
                'enablejsapi': 1,
                'origin': window.location.origin
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            console.error('Error creating player:', error);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_ERROR',
              message: 'Failed to create player'
            }));
          }
        }

        function onPlayerReady(event) {
          console.log('Player ready');
          isPlayerReady = true;
          document.getElementById('loading').style.display = 'none';
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${videoId}'
          }));
          
          // Start progress tracking
          startProgressTracking();
        }

        function onPlayerStateChange(event) {
          var state = event.data;
          var stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
          };
          
          console.log('Player state:', stateNames[state] || state);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
          
          if (state === 0 && autoPlayEnabled && !hasCompleted) { // ENDED
            hasCompleted = true;
            console.log('Video ended, auto-skipping...');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ENDED',
              autoSkip: true
            }));
          }
        }

        function onPlayerError(event) {
          console.error('Player error:', event.data);
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not embeddable',
            150: 'Video not embeddable'
          };
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: event.data,
            message: errorMessages[event.data] || 'Unknown error'
          }));
        }

        function startProgressTracking() {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          
          progressInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady) {
              try {
                var currentTime = player.getCurrentTime();
                var progress = Math.min(currentTime / targetDuration, 1) * 100;
                
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PROGRESS_UPDATE',
                  currentTime: currentTime,
                  progress: progress,
                  targetDuration: targetDuration
                }));
                
                // Check for coin earning completion
                if (currentTime >= targetDuration && !hasCompleted) {
                  hasCompleted = true;
                  console.log('Target duration reached, awarding coins');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'COINS_EARNED',
                    currentTime: currentTime,
                    coinsEarned: ${coinReward}
                  }));
                }
              } catch (error) {
                console.error('Error getting current time:', error);
              }
            }
          }, 1000);
        }

        // Control functions
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady) {
            player.playVideo();
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            player.pauseVideo();
          }
        };

        window.stopVideo = function() {
          if (player && player.stopVideo && isPlayerReady) {
            player.stopVideo();
          }
        };

        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            console.log('Page hidden, pausing video');
            window.pauseVideo();
          }
        });
      </script>
    </body>
    </html>
  `;

  // Handle app state changes for background playback prevention
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed:', appState, '->', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App resumed - can resume playback if it was playing
        console.log('App resumed');
      } else if (nextAppState.match(/inactive|background/)) {
        // App backgrounded - pause video immediately
        console.log('App backgrounded, pausing video');
        pauseVideo();
        setIsPlaying(false);
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user && videoQueue.length === 0) {
      fetchVideos(user.id);
    }
  }, [user, videoQueue.length, fetchVideos]);

  // Reset states when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('Video changed to:', currentVideo.youtube_url);
      setCurrentTime(0);
      setIsVideoLoaded(false);
      setPlayerError(null);
      setLoadingTimeout(false);
      setVideoCompleted(false);
      setCoinsEarned(false);
      setIsPlaying(false);
      progressValue.value = 0;
      
      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Set loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isVideoLoaded) {
          console.log('Video loading timeout');
          setLoadingTimeout(true);
          showToast('Video stuck, skipping...');
          handleSkipVideo();
        }
      }, 5000);
    }
  }, [currentVideo]);

  // WebView message handler
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          setIsVideoLoaded(true);
          setPlayerError(null);
          setLoadingTimeout(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
          
        case 'PROGRESS_UPDATE':
          setCurrentTime(data.currentTime);
          const progress = Math.min(data.currentTime / targetDuration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'COINS_EARNED':
          if (!coinsEarned) {
            setCoinsEarned(true);
            awardCoins(data.coinsEarned);
          }
          break;
          
        case 'VIDEO_ENDED':
          if (autoPlay && data.autoSkip) {
            handleAutoSkip();
          }
          break;
          
        case 'PLAYER_ERROR':
        case 'API_LOAD_ERROR':
          setPlayerError(data.message);
          showToast('Video error, skipping...');
          setTimeout(() => handleSkipVideo(), 2000);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [autoPlay, coinsEarned, targetDuration]);

  // Award coins function
  const awardCoins = async (coins: number) => {
    if (!user || !currentVideo) return;
    
    try {
      console.log(`Awarding ${coins} coins for video: ${currentVideo.youtube_url}`);
      
      const { data: result, error } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: coins,
          transaction_type_param: 'video_watch',
          description_param: `Watched video: ${currentVideo.title}`,
          reference_uuid: currentVideo.id
        });

      if (error) {
        console.error('Error awarding coins:', error);
        return;
      }

      if (result) {
        await refreshProfile();
        
        // Coin bounce animation
        coinBounce.value = withTiming(1.3, { duration: 200 }, () => {
          coinBounce.value = withTiming(1, { duration: 200 });
        });
        
        showToast(`Coins awarded: ${coins} for ${currentVideo.youtube_url}`);
        console.log(`Coins awarded: ${coins} for ${currentVideo.youtube_url}`);
      }
    } catch (error) {
      console.error('Error in awardCoins:', error);
    }
  };

  // Control functions
  const playVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.stopVideo && window.stopVideo(); true;');
    }
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const handleSkipVideo = () => {
    stopVideo();
    moveToNextVideo();
    if (user && videoQueue.length <= 2) {
      fetchVideos(user.id);
    }
  };

  const handleAutoSkip = () => {
    if (autoPlay) {
      setTimeout(() => {
        handleSkipVideo();
      }, 1000);
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    showToast(`Auto-play ${!autoPlay ? 'enabled' : 'disabled'}`);
  };

  // Animation styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  // Calculate iframe dimensions
  const iframeHeight = Math.min(screenHeight * 0.4, 300);
  const iframeWidth = iframeHeight * 0.75; // 70-80% of height for proper aspect ratio

  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="#FFD700" size={20} />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="#FFD700" size={20} />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>No videos available</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => user && fetchVideos(user.id)}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Video Promoter</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          <DollarSign color="#FFD700" size={20} />
        </Animated.View>
      </LinearGradient>

      {/* Video Player Container */}
      <View style={styles.videoContainer}>
        {/* Loading State */}
        {(!isVideoLoaded || loadingTimeout) && (
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.videoLoadingText}>
              {loadingTimeout ? 'Video stuck, skipping...' : 'Loading video...'}
            </Text>
            <Text style={styles.videoIdText}>Video ID: {youtubeVideoId}</Text>
          </View>
        )}

        {/* WebView Player */}
        {youtubeVideoId && (
          <View style={[styles.iframeContainer, { height: iframeHeight, width: iframeWidth }]}>
            <WebView
              ref={webviewRef}
              source={{ html: createHtmlContent(youtubeVideoId) }}
              style={[styles.webview, !isVideoLoaded && styles.hidden]}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              scrollEnabled={false}
              bounces={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              originWhitelist={['*']}
              allowsFullscreenVideo={false}
            />
            
            {/* Progress Bar */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>
          </View>
        )}

        {/* Video Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.videoTitle} numberOfLines={1} ellipsizeMode="tail">
            {currentVideo.title}
          </Text>
        </View>
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        {/* Auto-play and Open YouTube */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.youtubeButton}>
            <Text style={styles.youtubeButtonText}>Open on Youtube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity 
              style={[styles.autoPlayToggle, autoPlay && styles.autoPlayToggleActive]}
              onPress={toggleAutoPlay}
            >
              <View style={[styles.autoPlayThumb, autoPlay && styles.autoPlayThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{targetDuration}</Text>
            <Text style={styles.statLabel}>Seconds to get coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{coinReward}</Text>
            <Text style={styles.statLabel}>Coins will be added</Text>
          </View>
        </View>

        {/* Play/Skip Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={handlePlayPause}
            disabled={!isVideoLoaded || loadingTimeout}
          >
            {isPlaying ? (
              <Pause color="rgba(255, 255, 255, 0.7)" size={24} />
            ) : (
              <Play color="rgba(255, 255, 255, 0.7)" size={24} />
            )}
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>

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
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  noVideoText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    paddingVertical: 20,
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    zIndex: 10,
  },
  videoLoadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  videoIdText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  iframeContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
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
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
  },
  controlsSection: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  youtubeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  youtubeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoPlayLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 12,
    fontWeight: '500',
  },
  autoPlayToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  autoPlayToggleActive: {
    backgroundColor: '#FF4757',
  },
  autoPlayThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  autoPlayThumbActive: {
    alignSelf: 'flex-end',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  playButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    position: 'absolute',
    bottom: -20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 140,
    height: 48,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});