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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, TriangleAlert as AlertTriangle, RefreshCw } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface EnhancedVideoPlayerProps {
  videoId: string;
  youtubeUrl: string; // This now contains the video ID
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
  onVideoUnplayable: () => void; // New prop for handling unplayable videos
}

interface EmbedStrategy {
  name: string;
  getUrl: (videoId: string) => string;
  description: string;
}

export default function EnhancedVideoPlayer({
  videoId,
  youtubeUrl, // This is actually the video ID from database
  duration,
  coinReward,
  onVideoComplete,
  onVideoSkip,
  onError: reportErrorToParent,
  onVideoUnplayable
}: EnhancedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastProgressTime, setLastProgressTime] = useState(0);
  const [stuckProgressCount, setStuckProgressCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const webviewRef = useRef<WebView>(null);
  const maxRetries = 3; // Increased retries
  const maxStrategies = 4; // Multiple embed strategies
  const errorTimeoutDuration = 8000; // Increased timeout
  const maxStuckCount = 3;

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Add debug logging
  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-3), `${timestamp}: ${info}`]);
    console.log(`[EnhancedPlayer] ${info}`);
  };

  // Multiple embedding strategies to try
  const embedStrategies: EmbedStrategy[] = [
    {
      name: 'Standard',
      getUrl: (id: string) => `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&modestbranding=1&rel=0&fs=0&disablekb=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
      description: 'Standard embed with autoplay'
    },
    {
      name: 'No-Cookie',
      getUrl: (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&modestbranding=1&rel=0&fs=0&disablekb=1&playsinline=1`,
      description: 'Privacy-enhanced embedding'
    },
    {
      name: 'Minimal',
      getUrl: (id: string) => `https://www.youtube.com/embed/${id}?autoplay=0&controls=1&modestbranding=1&rel=0&fs=0`,
      description: 'Minimal parameters with controls'
    },
    {
      name: 'Fallback',
      getUrl: (id: string) => `https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
      description: 'Basic embed with API only'
    }
  ];

  // Extract YouTube video ID from the stored value
  const extractVideoIdFromUrl = (videoIdOrUrl: string): string | null => {
    addDebugInfo(`Processing video ID/URL: ${videoIdOrUrl}`);
    
    // If it's already a video ID (11 characters), return it directly
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
      addDebugInfo(`Already a video ID: ${videoIdOrUrl}`);
      return videoIdOrUrl;
    }
    
    // Otherwise, try to extract from URL patterns
    const patterns = [
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = videoIdOrUrl.match(pattern);
      if (match && match[1]) {
        addDebugInfo(`Extracted video ID: ${match[1]} from pattern: ${pattern.source}`);
        return match[1];
      }
    }
    
    addDebugInfo(`Could not extract video ID from: ${videoIdOrUrl}`);
    return null;
  };

  const youtubeVideoId = extractVideoIdFromUrl(youtubeUrl);

  // Enhanced HTML content with better error handling and multiple strategies
  const getCurrentEmbedUrl = () => {
    if (!youtubeVideoId) return '';
    return embedStrategies[currentStrategy].getUrl(youtubeVideoId);
  };

  const htmlContent = `
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
          font-family: Arial, sans-serif;
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
        }
        .error {
          color: #ff4757;
          text-align: center;
          padding: 20px;
        }
        .strategy-info {
          position: absolute;
          top: 10px;
          left: 10px;
          color: white;
          font-size: 10px;
          background: rgba(0,0,0,0.7);
          padding: 5px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <div id="loading" class="loading">
        Loading video...<br>
        Strategy: ${embedStrategies[currentStrategy].name}<br>
        Attempt: ${retryAttempt + 1}/${maxRetries + 1}
      </div>
      <div id="error" class="error" style="display: none;"></div>
      <div class="strategy-info">
        ${embedStrategies[currentStrategy].description}
      </div>
      
      <script>
        console.log('Enhanced player initializing for video ID: ${youtubeVideoId}');
        console.log('Strategy: ${embedStrategies[currentStrategy].name}');
        console.log('Embed URL: ${getCurrentEmbedUrl()}');
        
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        tag.onload = function() {
          console.log('YouTube API script loaded successfully');
        };
        tag.onerror = function() {
          console.error('Failed to load YouTube iframe API');
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          document.getElementById('error').textContent = 'Failed to load YouTube API';
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: 'API_LOAD_FAILED',
            message: 'Failed to load YouTube iframe API',
            strategy: '${embedStrategies[currentStrategy].name}',
            attempt: ${retryAttempt}
          }));
        };
        
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player;
        var isPlayerReady = false;
        var currentTime = 0;
        var lastReportedTime = 0;
        var maxDuration = ${duration};
        var hasCompleted = false;
        var errorCount = 0;
        var maxErrors = 5;
        var progressCheckInterval;
        var embedStrategy = '${embedStrategies[currentStrategy].name}';
        var attemptNumber = ${retryAttempt};

        function onYouTubeIframeAPIReady() {
          console.log('YouTube API ready, creating player with strategy: ' + embedStrategy);
          document.getElementById('loading').textContent = 'Creating player with ' + embedStrategy + ' strategy...';
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${youtubeVideoId}',
              playerVars: {
                'autoplay': ${currentStrategy < 2 ? 1 : 0},
                'controls': ${currentStrategy >= 2 ? 1 : 0},
                'modestbranding': 1,
                'rel': 0,
                'fs': 0,
                'disablekb': ${currentStrategy < 2 ? 1 : 0},
                'playsinline': 1,
                'enablejsapi': 1,
                'origin': window.location.origin,
                'iv_load_policy': 3,
                'cc_load_policy': 0,
                'start': 0,
                'mute': 0,
                'loop': 0
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            console.error('Error creating YouTube player:', error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Failed to create player: ' + error.message;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_ERROR',
              error: 'PLAYER_CREATION_FAILED',
              message: 'Failed to create YouTube player: ' + error.message,
              strategy: embedStrategy,
              attempt: attemptNumber
            }));
          }
        }

        function onPlayerReady(event) {
          console.log('Player ready with strategy:', embedStrategy);
          document.getElementById('loading').style.display = 'none';
          isPlayerReady = true;
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${youtubeVideoId}',
            strategy: embedStrategy,
            attempt: attemptNumber
          }));
          
          // Test video availability
          try {
            var videoData = player.getVideoData();
            console.log('Video data:', videoData);
            
            if (!videoData || !videoData.title) {
              console.warn('Video may not be available');
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYER_WARNING',
                message: 'Video may not be available or private',
                strategy: embedStrategy,
                attempt: attemptNumber
              }));
            } else {
              console.log('Video verified successfully:', videoData.title);
            }
          } catch (error) {
            console.error('Error getting video data:', error);
          }
          
          // Auto-start playing with delay based on strategy
          setTimeout(function() {
            if (player && player.playVideo && isPlayerReady) {
              console.log('Auto-starting video playback with strategy:', embedStrategy);
              try {
                if (${currentStrategy} < 2) {
                  // For autoplay strategies, just ensure it's playing
                  var state = player.getPlayerState();
                  if (state !== 1) {
                    player.playVideo();
                  }
                } else {
                  // For manual strategies, explicitly start
                  player.playVideo();
                }
              } catch (error) {
                console.error('Error starting playback:', error);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PLAYER_ERROR',
                  error: 'PLAYBACK_START_FAILED',
                  message: 'Failed to start video playback',
                  strategy: embedStrategy,
                  attempt: attemptNumber
                }));
              }
            }
          }, ${currentStrategy < 2 ? 1000 : 2000});
          
          // Start enhanced progress tracking
          startProgressTracking();
        }

        function startProgressTracking() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
          }
          
          progressCheckInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady && !hasCompleted) {
              try {
                var newTime = player.getCurrentTime();
                
                // Check if progress is stuck
                if (Math.abs(newTime - lastReportedTime) < 0.1 && newTime > 0) {
                  console.log('Progress may be stuck at', newTime);
                } else {
                  lastReportedTime = newTime;
                }
                
                currentTime = newTime;
                
                // Limit to user-set duration
                if (currentTime >= maxDuration && !hasCompleted) {
                  hasCompleted = true;
                  try {
                    player.pauseVideo();
                  } catch (error) {
                    console.error('Error pausing video:', error);
                  }
                  console.log('Video completed at', currentTime, 'seconds with strategy:', embedStrategy);
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'VIDEO_COMPLETED',
                    currentTime: currentTime,
                    strategy: embedStrategy,
                    attempt: attemptNumber
                  }));
                } else if (currentTime < maxDuration) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PROGRESS_UPDATE',
                    currentTime: currentTime,
                    progress: (currentTime / maxDuration) * 100,
                    strategy: embedStrategy,
                    attempt: attemptNumber
                  }));
                }
              } catch (error) {
                console.error('Error getting current time:', error);
                errorCount++;
                if (errorCount > maxErrors) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PLAYER_ERROR',
                    error: 'PROGRESS_ERROR',
                    message: 'Failed to track video progress',
                    strategy: embedStrategy,
                    attempt: attemptNumber
                  }));
                }
              }
            }
          }, 1000);
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
          
          console.log('Player state changed to:', stateNames[state] || state, 'with strategy:', embedStrategy);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN',
            strategy: embedStrategy,
            attempt: attemptNumber
          }));

          // Handle video ended before user-set duration
          if (state === 0 && currentTime < maxDuration && !hasCompleted) {
            console.log('Video ended early at', currentTime, 'seconds with strategy:', embedStrategy);
            hasCompleted = true;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ENDED_EARLY',
              currentTime: currentTime,
              strategy: embedStrategy,
              attempt: attemptNumber
            }));
          }
        }

        function onPlayerError(event) {
          var errorMessages = {
            2: 'Invalid video ID - Video may have been removed',
            5: 'HTML5 player error - Try refreshing',
            100: 'Video not found or private',
            101: 'Video not allowed to be played in embedded players',
            150: 'Video not allowed to be played in embedded players'
          };
          
          var errorMessage = errorMessages[event.data] || 'Video playback error';
          console.error('YouTube player error:', event.data, errorMessage, 'with strategy:', embedStrategy);
          
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          document.getElementById('error').textContent = errorMessage + ' (Strategy: ' + embedStrategy + ')';
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: event.data,
            message: errorMessage,
            strategy: embedStrategy,
            attempt: attemptNumber,
            canRetry: ${currentStrategy < maxStrategies - 1 || retryAttempt < maxRetries}
          }));
        }

        // Expose functions for React Native to call
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady) {
            console.log('Playing video with strategy:', embedStrategy);
            try {
              player.playVideo();
            } catch (error) {
              console.error('Error playing video:', error);
            }
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            console.log('Pausing video with strategy:', embedStrategy);
            try {
              player.pauseVideo();
            } catch (error) {
              console.error('Error pausing video:', error);
            }
          }
        };

        // Handle page errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          console.error('Page error:', msg, 'at', url, ':', lineNo, 'with strategy:', embedStrategy);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: 'PAGE_ERROR',
            message: 'Page error: ' + msg,
            strategy: embedStrategy,
            attempt: attemptNumber
          }));
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background - pause video
        pauseVideo();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Reset states when video changes
  useEffect(() => {
    addDebugInfo(`Video changed, resetting enhanced player state for: ${videoId} ${youtubeUrl}`);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setCurrentStrategy(0);
    setRetryAttempt(0);
    setIsBuffering(false);
    setLastProgressTime(0);
    setStuckProgressCount(0);
    setDebugInfo([]);
    setIsRetrying(false);
    progressValue.value = 0;
    
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }
  }, [videoId]);

  const injectJavaScript = useCallback((script: string) => {
    try {
      webviewRef.current?.injectJavaScript(script);
    } catch (error) {
      addDebugInfo(`JavaScript injection failed: ${error}`);
      handleVideoError('Failed to control video player');
    }
  }, []);

  const playVideo = useCallback(() => {
    injectJavaScript('window.playVideo && window.playVideo(); true;');
  }, [injectJavaScript]);

  const pauseVideo = useCallback(() => {
    injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
  }, [injectJavaScript]);

  const handleVideoError = useCallback((errorMessage: string) => {
    addDebugInfo(`Video error detected: ${errorMessage} for video: ${youtubeVideoId}`);
    
    // Clear any existing timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    setPlayerError(errorMessage);
    
    // Try next strategy or retry
    if (currentStrategy < maxStrategies - 1) {
      addDebugInfo(`Trying next strategy: ${embedStrategies[currentStrategy + 1].name}`);
      setCurrentStrategy(prev => prev + 1);
      setRetryAttempt(0);
      setIsRetrying(true);
      return;
    } else if (retryAttempt < maxRetries) {
      addDebugInfo(`Retrying current strategy: ${embedStrategies[currentStrategy].name}, attempt ${retryAttempt + 1}`);
      setRetryAttempt(prev => prev + 1);
      setIsRetrying(true);
      return;
    }

    // All strategies exhausted
    addDebugInfo('All strategies exhausted, marking video as unplayable');
    const timeout = setTimeout(() => {
      showToast('Video unavailable, skipping...');
      onVideoUnplayable();
    }, errorTimeoutDuration);

    setErrorTimeout(timeout);
  }, [errorTimeout, onVideoUnplayable, youtubeVideoId, currentStrategy, retryAttempt]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      addDebugInfo(`WebView message received: ${data.type} ${JSON.stringify(data)}`);
      
      switch (data.type) {
        case 'PLAYER_READY':
          addDebugInfo(`Player ready with strategy: ${data.strategy}`);
          setIsLoaded(true);
          setPlayerError(null);
          setIsBuffering(false);
          setIsRetrying(false);
          if (errorTimeout) {
            clearTimeout(errorTimeout);
            setErrorTimeout(null);
          }
          break;
          
        case 'PLAYER_WARNING':
          addDebugInfo(`Player warning: ${data.message}`);
          // Don't treat warnings as errors for enhanced player
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            addDebugInfo(`Video started playing with strategy: ${data.strategy}`);
            setIsPlaying(true);
            setIsBuffering(false);
            if (!hasStarted) {
              setHasStarted(true);
            }
            // Clear error timeout when video starts playing
            if (errorTimeout) {
              clearTimeout(errorTimeout);
              setErrorTimeout(null);
            }
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
            setIsBuffering(false);
          } else if (data.state === 3) { // BUFFERING
            setIsBuffering(true);
            addDebugInfo('Video buffering...');
          }
          break;
          
        case 'PROGRESS_UPDATE':
          const newTime = data.currentTime;
          
          // Check for stuck progress
          if (Math.abs(newTime - lastProgressTime) < 0.1 && newTime > 0) {
            setStuckProgressCount(prev => {
              const newCount = prev + 1;
              if (newCount >= maxStuckCount) {
                addDebugInfo('Progress stuck, attempting to resume playback');
                playVideo(); // Try to resume
                return 0; // Reset count
              }
              return newCount;
            });
          } else {
            setStuckProgressCount(0);
            setLastProgressTime(newTime);
          }
          
          setCurrentTime(newTime);
          const progress = Math.min(newTime / duration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'VIDEO_COMPLETED':
          if (!isCompleted) {
            addDebugInfo(`Video completed with strategy: ${data.strategy}`);
            setIsCompleted(true);
            setIsPlaying(false);
            setIsBuffering(false);
            
            // Silent coin animation
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            // Complete video without popup
            setTimeout(() => {
              onVideoComplete();
            }, 500);
          }
          break;

        case 'VIDEO_ENDED_EARLY':
          // Video ended before user-set duration, still award coins
          if (!isCompleted) {
            addDebugInfo(`Video ended early with strategy: ${data.strategy}`);
            setIsCompleted(true);
            setIsPlaying(false);
            setIsBuffering(false);
            
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              onVideoComplete();
            }, 500);
          }
          break;
          
        case 'PLAYER_ERROR':
          addDebugInfo(`Player error received: ${data.message} with strategy: ${data.strategy}`);
          
          // Check if we can retry with different strategy
          if (data.canRetry && (data.error === 101 || data.error === 150)) {
            handleVideoError(data.message || 'Video playback error');
          } else {
            // Final error - mark as unplayable
            handleVideoError(data.message || 'Video playback error');
          }
          break;
      }
    } catch (error) {
      addDebugInfo(`Error parsing WebView message: ${error}`);
      handleVideoError('Failed to parse video message');
    }
  }, [duration, hasStarted, isCompleted, onVideoComplete, handleVideoError, errorTimeout, youtubeVideoId, lastProgressTime, maxStuckCount, playVideo]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

  const handleSkip = useCallback(() => {
    // Silent skip without confirmation
    pauseVideo();
    onVideoSkip();
  }, [pauseVideo, onVideoSkip]);

  const handleManualRetry = useCallback(() => {
    addDebugInfo('Manual retry requested');
    setPlayerError(null);
    setIsRetrying(true);
    if (currentStrategy < maxStrategies - 1) {
      setCurrentStrategy(prev => prev + 1);
      setRetryAttempt(0);
    } else {
      setCurrentStrategy(0);
      setRetryAttempt(prev => prev + 1);
    }
  }, [currentStrategy]);

  const handleWebViewLoad = useCallback(() => {
    addDebugInfo(`WebView loaded for video: ${youtubeVideoId} with strategy: ${embedStrategies[currentStrategy].name}`);
  }, [youtubeVideoId, currentStrategy]);

  const handleWebViewError = useCallback(() => {
    addDebugInfo(`WebView error for video: ${youtubeVideoId}`);
    handleVideoError('Failed to load video player');
  }, [handleVideoError, youtubeVideoId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressPercentage = Math.round((currentTime / duration) * 100);
  const remainingTime = Math.max(0, duration - currentTime);

  // Show error if no video ID could be extracted
  if (!youtubeVideoId) {
    addDebugInfo(`Could not extract video ID from: ${youtubeUrl}`);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle color="#FF4757" size={32} />
          <Text style={styles.errorText}>Invalid video ID format</Text>
          <Text style={styles.errorSubtext}>Video ID/URL: {youtubeUrl}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <SkipForward color="#666" size={16} />
            <Text style={styles.skipButtonText}>Skip Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WebView Video Player */}
      <View style={styles.playerContainer}>
        {(!isLoaded || isRetrying) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.loadingText}>
              {isRetrying ? 'Retrying video...' : 'Loading video...'}
            </Text>
            <Text style={styles.loadingSubtext}>Video ID: {youtubeVideoId}</Text>
            <Text style={styles.loadingSubtext}>
              Strategy: {embedStrategies[currentStrategy].name} ({currentStrategy + 1}/{maxStrategies})
            </Text>
            <Text style={styles.loadingSubtext}>
              Attempt: {retryAttempt + 1}/{maxRetries + 1}
            </Text>
            {isRetrying && (
              <Text style={styles.retryText}>
                Trying {embedStrategies[currentStrategy].description}...
              </Text>
            )}
          </View>
        )}
        
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent }}
          style={[styles.webview, (!isLoaded || isRetrying) && styles.hidden]}
          onMessage={handleWebViewMessage}
          onLoad={handleWebViewLoad}
          onError={handleWebViewError}
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
          allowsProtectedMedia={false}
          dataDetectorTypes={['none']}
          key={`${videoId}-${currentStrategy}-${retryAttempt}`} // Force re-render on strategy change
        />
        
        {/* Progress Bar Overlay */}
        <View style={styles.progressOverlay}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>
        
        {/* Error Overlay */}
        {playerError && !isRetrying && (
          <View style={styles.errorOverlay}>
            <AlertTriangle color="#FF4757" size={24} />
            <Text style={styles.errorText}>Loading next video...</Text>
            <Text style={styles.errorSubtext}>{playerError}</Text>
            <Text style={styles.strategyText}>
              Tried: {embedStrategies[currentStrategy].name} strategy
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry}>
              <RefreshCw color="white" size={16} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Buffering Overlay */}
        {isBuffering && isLoaded && !isRetrying && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.bufferingText}>Buffering...</Text>
            <Text style={styles.strategyText}>
              Using: {embedStrategies[currentStrategy].name}
            </Text>
          </View>
        )}
      </View>

      {/* Enhanced Video Info */}
      <View style={styles.videoInfo}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Clock color="#666" size={14} />
            <Text style={styles.statValue}>{formatTime(remainingTime)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progressPercentage}%</Text>
          </View>
          
          <View style={styles.statItem}>
            <Animated.View style={[styles.coinContainer, coinAnimatedStyle]}>
              <Award color="#FFA726" size={14} />
              <Text style={styles.statValue}>{coinReward}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Strategy Info */}
        <View style={styles.strategyInfo}>
          <Text style={styles.strategyLabel}>
            Strategy: {embedStrategies[currentStrategy].name} 
            {retryAttempt > 0 && ` (Attempt ${retryAttempt + 1})`}
          </Text>
        </View>

        {/* Enhanced Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={!isLoaded || playerError !== null || isRetrying}
          >
            {isPlaying ? (
              <Pause color="#FF4757" size={16} />
            ) : (
              <Play color="#FF4757" size={16} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <SkipForward color="#666" size={16} />
          </TouchableOpacity>

          {playerError && !isRetrying && (
            <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry}>
              <RefreshCw color="white" size={12} />
            </TouchableOpacity>
          )}
        </View>

        {/* Debug Information */}
        {debugInfo.length > 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Log:</Text>
            {debugInfo.map((info, index) => (
              <Text key={index} style={styles.debugText}>{info}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  playerContainer: {
    position: 'relative',
    backgroundColor: '#000',
    height: isSmallScreen ? 180 : 220,
    borderRadius: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
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
  loadingText: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  retryText: {
    color: '#FFA726',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4757',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 20,
    padding: 20,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 15,
  },
  bufferingText: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  strategyText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  videoInfo: {
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strategyInfo: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  strategyLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  debugContainer: {
    backgroundColor: '#F0F8FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 9,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
});