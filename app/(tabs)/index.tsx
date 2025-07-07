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
  Linking,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, DollarSign, Menu, ExternalLink, Timer, Coins } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
// Increase video height to 80-90% of screen height for better visibility
const videoHeight = Math.min(screenHeight * 0.85, screenHeight - 200);

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
  const [hasStarted, setHasStarted] = useState(false);

  // Refs
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const loadingRotation = useSharedValue(0);

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

  // Create enhanced HTML content for YouTube iframe with improved completion detection
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
        var currentTime = 0;
        var hasEarnedCoins = false;
        var hasStarted = false;
        var autoSkipEnabled = ${autoPlay};

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
                'autoplay': autoPlayEnabled ? 1 : 0,
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
          
          // Start progress tracking immediately
          startProgressTracking();
          
          // Auto-start playback if enabled
          if (autoPlayEnabled) {
            setTimeout(function() {
              if (player && player.playVideo && isPlayerReady) {
                try {
                  console.log('Starting auto-playback');
                  player.playVideo();
                } catch (error) {
                  console.error('Error starting playback:', error);
                }
              }
            }, 1000);
          }
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
          
          if (state === 1) { // PLAYING
            if (!hasStarted) {
              hasStarted = true;
              console.log('Video playback started');
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_STARTED'
              }));
            }
          }
          
          // Handle video end - but only trigger completion if we haven't already
          if (state === 0 && !hasCompleted) { // ENDED
            hasCompleted = true;
            console.log('Video ended naturally - triggering completion');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_COMPLETED',
              reason: 'natural_end',
              currentTime: currentTime,
              autoSkip: autoSkipEnabled
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
          
          console.log('Starting progress tracking');
          
          progressInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady && !hasCompleted) {
              try {
                currentTime = player.getCurrentTime();
                var progress = Math.min(currentTime / targetDuration, 1) * 100;
                
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PROGRESS_UPDATE',
                  currentTime: currentTime,
                  progress: progress,
                  targetDuration: targetDuration
                }));
                
                // Check for completion based on target duration
                if (currentTime >= targetDuration && !hasEarnedCoins) {
                  hasEarnedCoins = true;
                  console.log('Target duration reached, awarding coins');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'COINS_EARNED',
                    currentTime: currentTime,
                    coinsEarned: ${coinReward}
                  }));
                  
                  // Stop the video and trigger completion if auto-skip is enabled
                  if (autoSkipEnabled) {
                    setTimeout(function() {
                      if (!hasCompleted) {
                        hasCompleted = true;
                        console.log('Auto-completing after earning coins');
                        
                        // Stop the video
                        if (player && player.stopVideo) {
                          player.stopVideo();
                        }
                        
                        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'VIDEO_COMPLETED',
                          reason: 'target_reached',
                          currentTime: currentTime,
                          autoSkip: true
                        }));
                      }
                    }, 1000); // Wait 1 second after earning coins
                  } else {
                    // If auto-skip is disabled, just pause the video
                    if (player && player.pauseVideo) {
                      player.pauseVideo();
                    }
                  }
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

        // Update auto-skip setting
        window.updateAutoSkip = function(enabled) {
          autoSkipEnabled = enabled;
          console.log('Auto-skip updated:', enabled);
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
        // App resumed
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
      setHasStarted(false);
      progressValue.value = 0;
      
      // Clear all intervals and timeouts
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      
      // Set loading timeout
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isVideoLoaded) {
          console.log('Video loading timeout');
          setLoadingTimeout(true);
          showToast('Video stuck, skipping...');
          handleSkipVideo();
        }
      }, 10000);
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
          
        case 'VIDEO_STARTED':
          setHasStarted(true);
          setIsPlaying(true);
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
          
        case 'VIDEO_COMPLETED':
          console.log('Video completion received:', data.reason, 'autoSkip:', data.autoSkip);
          if (!videoCompleted) {
            setVideoCompleted(true);
            setIsPlaying(false);
            
            // Show completion feedback
            showToast('Video completed! Moving to next...');
            
            // Auto-skip if enabled
            if (autoPlay && data.autoSkip) {
              completionTimeoutRef.current = setTimeout(() => {
                handleSkipVideo();
              }, 1500); // 1.5 second delay for user feedback
            }
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
  }, [autoPlay, coinsEarned, targetDuration, videoCompleted]);

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
        coinBounce.value = withSpring(1.3, {
          damping: 10,
          stiffness: 100,
        }, () => {
          coinBounce.value = withSpring(1, {
            damping: 10,
            stiffness: 100,
          });
        });
        
        showToast(`Earned ${coins} coins! 🎉`);
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
    console.log('Skipping video manually');
    
    // Clear all timeouts
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    
    stopVideo();
    moveToNextVideo();
    
    // Fetch more videos if queue is running low
    if (user && videoQueue.length <= 2) {
      fetchVideos(user.id);
    }
  };

  const toggleAutoPlay = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    
    // Update the WebView's auto-skip setting
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`window.updateAutoSkip && window.updateAutoSkip(${newAutoPlay}); true;`);
    }
    
    showToast(`Auto-skip ${newAutoPlay ? 'enabled' : 'disabled'}`);
  };

  const openOnYoutube = () => {
    if (youtubeVideoId) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      Linking.openURL(youtubeUrl).catch(err => {
        console.error('Failed to open YouTube:', err);
        showToast('Failed to open YouTube');
      });
    }
  };

  // Animation styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = Math.max(0, targetDuration - currentTime);

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Player Container - Increased size */}
        <View style={styles.videoSection}>
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
            )}
            
            {/* Progress Bar */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>

            {/* Completion Overlay */}
            {videoCompleted && (
              <View style={styles.completionOverlay}>
                <View style={styles.completionContent}>
                  <Award color="#4CAF50" size={32} />
                  <Text style={styles.completionText}>Video Completed!</Text>
                  <Text style={styles.completionSubtext}>
                    {autoPlay ? 'Moving to next video...' : 'Tap skip to continue'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Video Title - Bold white with shadow */}
          <View style={styles.titleContainer}>
            <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
              {currentVideo.title}
            </Text>
          </View>
        </View>

        {/* Stats Cards - Removed Progress, kept only Remaining and Coins */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Timer color="#FF4757" size={20} />
              </View>
              <Text style={styles.statValue}>{formatTime(remainingTime)}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            
            <View style={styles.statCard}>
              <Animated.View style={[styles.statIconContainer, coinAnimatedStyle]}>
                <Coins color="#FFA726" size={20} />
              </Animated.View>
              <Text style={styles.statValue}>{coinReward}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {/* Auto-play and Open YouTube */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.youtubeButton} onPress={openOnYoutube}>
              <ExternalLink color="#666" size={16} />
              <Text style={styles.youtubeButtonText}>Open on YouTube</Text>
            </TouchableOpacity>
            
            <View style={styles.autoPlayContainer}>
              <Text style={styles.autoPlayLabel}>Auto Skip</Text>
              <TouchableOpacity 
                style={[styles.autoPlayToggle, autoPlay && styles.autoPlayToggleActive]}
                onPress={toggleAutoPlay}
              >
                <View 
                  style={[
                    styles.autoPlayThumb, 
                    autoPlay && styles.autoPlayThumbActive,
                    {
                      transform: [{
                        translateX: autoPlay ? 20 : 0
                      }]
                    }
                  ]} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Play/Skip Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.playButton, (!isVideoLoaded || loadingTimeout) && styles.playButtonDisabled]}
              onPress={handlePlayPause}
              disabled={!isVideoLoaded || loadingTimeout}
            >
              {isPlaying ? (
                <Pause color="white" size={24} />
              ) : (
                <Play color="white" size={24} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
              <SkipForward color="white" size={20} />
              <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
            </TouchableOpacity>
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
    backgroundColor: '#2C2C2C', // Dark navbar
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
    color: '#FFD700', // Gold color for coins
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  noVideoText: {
    color: '#666',
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
  videoContainer: {
    height: videoHeight, // Increased height (80-90% of screen)
    backgroundColor: '#000',
    position: 'relative',
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  videoLoadingText: {
    color: 'white',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  videoIdText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
    backgroundColor: '#4CAF50', // Green gradient for progress
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  completionContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
  },
  completionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 8,
  },
  completionSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF', // Bold white color
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Subtle shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    paddingHorizontal: 5,
  },
  statsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Balanced spacing for 2 items
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
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controlsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
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
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  youtubeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoPlayLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  autoPlayToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'relative',
  },
  autoPlayToggleActive: {
    backgroundColor: '#FF4757',
  },
  autoPlayThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    position: 'absolute',
    left: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  autoPlayThumbActive: {
    // Animation handled by transform
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 40, // Circular play/pause button (40px)
    height: 40,
    borderRadius: 20,
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
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    height: 30, // Rectangular skip button (30px height)
    minWidth: 80, // Minimum width (80px)
    ...Platform.select({
      ios: {
        shadowColor: '#6B7280',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(107, 114, 128, 0.2)',
      },
    }),
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});