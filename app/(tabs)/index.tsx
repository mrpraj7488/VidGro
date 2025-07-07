import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  ToastAndroid,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Clock, Coins, ExternalLink, Menu } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

interface Video {
  id: string;
  youtube_url: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
}

const isSmallScreen = false; // Simplified for web platform
const videoHeight = 220;

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
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [coinUpdateInProgress, setCoinUpdateInProgress] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(false);

  // Refs
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  const currentVideo = getCurrentVideo();
  const targetDuration = 30; // 30 seconds to earn coins
  const coinReward = 3; // 3 coins per video
  const maxRetries = 1;
  const loadingTimeoutDuration = 3000;

  // Calculate remaining time for UI display
  const remainingTime = Math.max(0, targetDuration - currentTime);

  // Debug logging function
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(`[ViewTab] ${logMessage}`);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]);
  }, []);

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

  // Show toast only on Android platform
  const showToast = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  }, []);

  // Create HTML content for YouTube iframe with enhanced debugging
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
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        #player-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
          pointer-events: none;
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
        .security-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 9999;
          background: transparent;
          pointer-events: auto;
          cursor: default;
        }
        * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        iframe {
          pointer-events: none !important;
        }
      </style>
    </head>
    <body>
      <div id="player-container">
        <div id="player"></div>
        <div id="loading" class="loading">Loading video...</div>
        <div class="security-overlay" 
             oncontextmenu="return false;" 
             ondragstart="return false;" 
             onselectstart="return false;"
             onmousedown="return false;"
             ontouchstart="return false;"
             onclick="return false;"
             ondblclick="return false;"></div>
      </div>
      
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
        var isTabVisible = true;
        var wasPlayingBeforeHidden = false;
        var loadingTimeoutId;
        var hasTimedOut = false;
        var hasError = false;
        var debugMode = true;
        function debugLog(message) {
          if (debugMode) {
            console.log('[WebView Debug] ' + message);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DEBUG_LOG',
              message: message
            }));
          }
        }

        debugLog('Initializing video player for: ${videoId}');

        // Set loading timeout
        loadingTimeoutId = setTimeout(function() {
          if (!isPlayerReady && !hasTimedOut && !hasError) {
            hasTimedOut = true;
            debugLog('Loading timeout reached, seamless skip');
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'LOADING_TIMEOUT',
              error: 'LOADING_TIMEOUT',
              message: 'Video loading timeout',
              errorType: 'TIMEOUT',
              isEmbeddingError: true,
              instantSkip: true
            }));
          }
        }, 3000);

        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = function() {
          debugLog('Failed to load YouTube API - seamless skip');
          if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
          hasError = true;
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'API_LOAD_ERROR',
            error: 'API_LOAD_FAILED',
            message: 'Failed to load YouTube API',
            errorType: 'API_ERROR',
            isEmbeddingError: true,
            instantSkip: true
          }));
        };
        
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        function onYouTubeIframeAPIReady() {
          if (hasError || hasTimedOut) {
            return;
          }
          
          debugLog('YouTube API ready');
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 0,
                'controls': 0,
                'modestbranding': 1,
                'showinfo': 0,
                'rel': 0,
                'fs': 0,
                'disablekb': 1,
                'playsinline': 1,
                'enablejsapi': 1,
                'origin': window.location.origin,
                'iv_load_policy': 3,
                'cc_load_policy': 0,
                'end': targetDuration,
                'widget_referrer': window.location.origin
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            debugLog('Error creating player: ' + error);
            hasError = true;
            if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_INIT_ERROR',
              error: 'PLAYER_INIT_ERROR',
              message: 'Failed to create player',
              errorType: 'INIT_ERROR',
              isEmbeddingError: true,
              instantSkip: true
            }));
          }
        }

        function onPlayerReady(event) {
          if (hasError || hasTimedOut) {
            return;
          }
          
          debugLog('Player ready');
          isPlayerReady = true;
          if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
          document.getElementById('loading').style.display = 'none';
          
          // Apply security to iframe
          setTimeout(function() {
            var iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.style.pointerEvents = 'none';
              iframe.style.userSelect = 'none';
              iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
              iframe.setAttribute('allowfullscreen', 'false');
            }
          }, 100);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY_SUCCESS',
            videoId: '${videoId}'
          }));
          
          startProgressTracking();
          
          // Auto-start playback if enabled
          if (autoPlayEnabled && isTabVisible) {
            setTimeout(function() {
              if (player && player.playVideo && isPlayerReady && !hasError) {
                try {
                  debugLog('Starting auto-playback');
                  player.playVideo();
                } catch (error) {
                  debugLog('Error starting playback: ' + error);
                }
              }
            }, 500);
          }
        }

        function onPlayerStateChange(event) {
          if (hasError || hasTimedOut) {
            return;
          }
          
          var state = event.data;
          var stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
          };
          
          debugLog('Player state: ' + (stateNames[state] || state));
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
          
          if (state === 1) { // PLAYING
            if (!hasStarted) {
              hasStarted = true;
              debugLog('Video playback started successfully');
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_STARTED'
              }));
            }
          }
          
          // Handle video end
          if (state === 0 && !hasCompleted) { // ENDED
            hasCompleted = true;
            debugLog('Video ended naturally - checking for coin award');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_COMPLETED',
              reason: 'natural_end',
              shouldAwardCoins: currentTime >= targetDuration,
              currentTime: currentTime,
              autoSkip: autoSkipEnabled
            }));
          }
        }

        function onPlayerError(event) {
          debugLog('Player error: ' + event.data);
          hasError = true;
          if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
          
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not embeddable',
            150: 'Video not embeddable'
          };
          
          var isEmbeddingError = event.data === 101 || event.data === 150 || event.data === 100;
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: event.data,
            message: errorMessages[event.data] || 'Unknown error',
            errorType: isEmbeddingError ? 'NOT_EMBEDDABLE' : 'PLAYBACK_ERROR',
            isEmbeddingError: isEmbeddingError,
            instantSkip: true
          }));
        }

        function startProgressTracking() {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          
          debugLog('Starting progress tracking');
          
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
                
                // Check for completion
                if (currentTime >= targetDuration && !hasEarnedCoins) {
                  hasEarnedCoins = true;
                  debugLog('Target duration reached (' + currentTime + 's), triggering coin award');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'COINS_EARNED',
                    currentTime: currentTime,
                    coinsEarned: ${coinReward}
                  }));
                  
                  // Auto-complete if enabled
                  if (autoSkipEnabled) {
                    setTimeout(function() {
                      if (!hasCompleted) {
                        hasCompleted = true;
                        debugLog('Auto-completing after earning coins');
                        
                        if (player && player.stopVideo) {
                          player.stopVideo();
                        }
                        
                        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'VIDEO_COMPLETED',
                          reason: 'auto_complete_after_coins',
                          shouldAwardCoins: false,
                          currentTime: currentTime,
                          autoSkip: true
                        }));
                      }
                    }, 500);
                  }
                }
              } catch (error) {
                debugLog('Error getting current time: ' + error);
              }
            }
          }, 1000);
        }

        // Control functions
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady && isTabVisible) {
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

        // Tab visibility control
        window.setTabVisibility = function(visible) {
          isTabVisible = visible;
          debugLog('Tab visibility changed: ' + visible);
          
          if (!visible) {
            if (player && player.getPlayerState && player.getPlayerState() === 1) {
              wasPlayingBeforeHidden = true;
              window.pauseVideo();
            } else {
              wasPlayingBeforeHidden = false;
            }
          } else {
            if (wasPlayingBeforeHidden && autoPlayEnabled) {
              setTimeout(function() {
                window.playVideo();
              }, 500);
            }
          }
        };

        // Update auto-skip setting
        window.updateAutoSkip = function(enabled) {
          autoSkipEnabled = enabled;
          debugLog('Auto-skip updated: ' + enabled);
        };

        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            debugLog('Page hidden, pausing video');
            window.pauseVideo();
          } else if (isTabVisible && autoPlayEnabled) {
            debugLog('Page visible, resuming video');
            setTimeout(function() {
              window.playVideo();
            }, 500);
          }
        });

        // Security: Block navigation
        window.open = function() {
          debugLog('Navigation blocked for security');
          return null;
        };

        Object.defineProperty(window, 'location', {
          value: window.location,
          writable: false
        });
      </script>
    </body>
    </html>
  `;

  // Handle tab focus changes
  useFocusEffect(
    useCallback(() => {
      addDebugLog('Tab focused');
      setIsTabFocused(true);
      
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
      }

      return () => {
        addDebugLog('Tab unfocused');
        setIsTabFocused(false);
        
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(false); true;');
        }
      };
    }, [addDebugLog])
  );

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      addDebugLog(`App state changed: ${appState} -> ${nextAppState}`);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        addDebugLog('App resumed');
        if (isTabFocused && webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
        }
      } else if (nextAppState.match(/inactive|background/)) {
        addDebugLog('App backgrounded, pausing video');
        pauseVideo();
        setIsPlaying(false);
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(false); true;');
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isTabFocused, addDebugLog]);

  // Reset states when video changes
  useEffect(() => {
    if (currentVideo) {
      addDebugLog(`Video changed to: ${currentVideo.youtube_url}`);
      setCurrentTime(0);
      setIsVideoLoaded(false);
      setPlayerError(null);
      setVideoCompleted(false);
      setCoinsEarned(false);
      setIsPlaying(false);
      setCoinUpdateInProgress(false);
      setHasStarted(false);
      setRetryCount(0);
      setIsSkipping(false);
      setCoinsAwarded(false);
      setShowCompletionMessage(false);
      progressValue.value = 0;
      
      // Clear all timeouts
      [loadingTimeoutRef, completionTimeoutRef, skipTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
      
      // Set loading timeout for instant skip
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isVideoLoaded && !isSkipping) {
          addDebugLog('Video loading timeout - instant skip');
          handleInstantSkip('Loading timeout');
        }
      }, loadingTimeoutDuration);
    }
  }, [currentVideo, addDebugLog]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user && videoQueue.length === 0) {
      addDebugLog('Fetching initial video queue');
      fetchVideos(user.id);
    }
  }, [user, videoQueue.length, fetchVideos, addDebugLog]);

  // Instant skip function for seamless experience
  const handleInstantSkip = useCallback((reason: string = 'Video unavailable') => {
    if (isSkipping) return;
    
    addDebugLog(`Instant skip: ${reason}`);
    setIsSkipping(true);
    
    // Clear all timeouts
    [loadingTimeoutRef, completionTimeoutRef, skipTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
    
    // Reset states
    setIsPlaying(false);
    setCurrentTime(0);
    setIsVideoLoaded(false);
    setPlayerError(null);
    setVideoCompleted(false);
    setCoinsEarned(false);
    setHasStarted(false);
    setShowCompletionMessage(false);
    progressValue.value = 0;
    
    // Move to next video instantly
    skipTimeoutRef.current = setTimeout(() => {
      moveToNextVideo();
      
      // Fetch more videos if queue is running low
      if (user && videoQueue.length <= 2) {
        fetchVideos(user.id);
      }
      
      setIsSkipping(false);
    }, 100); // Minimal delay for smooth transition
  }, [isSkipping, moveToNextVideo, user, videoQueue.length, fetchVideos, addDebugLog]);

  // Enhanced award coins function with detailed logging
  const awardCoins = useCallback(async (coins: number) => {
    if (!user || !currentVideo || coinsEarned || coinUpdateInProgress) {
      addDebugLog(`Coin award skipped - user: ${!!user}, video: ${!!currentVideo}, earned: ${coinsEarned}, inProgress: ${coinUpdateInProgress}, awarded: ${coinsAwarded}`);
      return;
    }
    
    setCoinUpdateInProgress(true);
    setCoinsEarned(true);
    
    try {
      addDebugLog(`Starting coin award process for ${coins} coins`);
      addDebugLog(`Awarding ${coins} coins for video: ${currentVideo.youtube_url}`);
      
      // Call Supabase function to update coins
      const { data: result, error } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: coins,
          transaction_type_param: 'video_watch',
          description_param: `Watched video: ${currentVideo.title}`,
          reference_uuid: currentVideo.id
        });

      if (error) {
        addDebugLog(`Error awarding coins: ${error.message}`);
        addDebugLog(`Supabase error details: ${JSON.stringify(error)}`);
        addDebugLog(`Error code: ${error.code}, hint: ${error.hint}`);
        console.error('Error awarding coins:', error);
        return;
      }

      if (result) {
        addDebugLog(`Coins awarded successfully: ${coins}`);
        // Refresh profile to update coin count in UI immediately
        addDebugLog('Refreshing profile to update coin balance...');
        setCoinsAwarded(true);
        await refreshProfile();
        addDebugLog('Profile refreshed after coin award');
        
        // Subtle coin animation
        coinBounce.value = withSpring(1.2, {
          damping: 15,
          stiffness: 150,
        }, () => {
          coinBounce.value = withSpring(1, {
            damping: 15,
            stiffness: 150,
          });
        });
        
        addDebugLog(`Coin balance updated for ${currentVideo.youtube_url}`);
      } else {
        addDebugLog('Coin award failed: no result returned');
        addDebugLog('Supabase function returned null or false');
        // Reset states on failure
        setCoinsEarned(false);
      }
    } catch (error) {
      addDebugLog(`Error in awardCoins: ${error}`);
      console.error('Error in awardCoins:', error);
      // Reset states on error
      setCoinsEarned(false);
    } finally {
      addDebugLog('Coin award process completed');
      setCoinUpdateInProgress(false);
    }
  }, [user, currentVideo, coinsEarned, coinUpdateInProgress, refreshProfile, addDebugLog]);

  // WebView message handler with seamless experience
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'DEBUG_LOG':
          addDebugLog(`WebView: ${data.message}`);
          break;
          
        case 'PLAYER_READY_SUCCESS':
          addDebugLog('Player ready message received');
          setIsVideoLoaded(true);
          setPlayerError(null);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          break;
          
        case 'VIDEO_STARTED':
          addDebugLog('Video started playing');
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
          addDebugLog(`Coins earned event received: ${data.coinsEarned}`);
          if (!coinsEarned) {
            addDebugLog('Processing coin award...');
            awardCoins(data.coinsEarned);
          } else {
            addDebugLog('Coins already earned for this video');
          }
          break;
          
        case 'VIDEO_COMPLETED':
          addDebugLog(`Video completion received: ${data.reason}, shouldAwardCoins: ${data.shouldAwardCoins}, currentTime: ${data.currentTime}`);
          
          // Award coins for natural completion if target duration reached
          if (data.reason === 'natural_end' && data.currentTime >= targetDuration && !coinsAwarded && !coinsEarned) {
            addDebugLog(`Video watched for ${data.currentTime}s, awarding ${coinReward} coins`);
            await awardCoins(coinReward);
          }
          
          // Only award coins if explicitly indicated and not already earned
          if (data.shouldAwardCoins && !coinsEarned) {
            addDebugLog('Video completed with coin eligibility');
            awardCoins(coinReward);
          }
          
          if (!videoCompleted) {
            setVideoCompleted(true);
            setIsPlaying(false);
            setShowCompletionMessage(true);
            // Hide completion message and move to next video seamlessly
            completionTimeoutRef.current = setTimeout(() => {
              setShowCompletionMessage(false);
              handleInstantSkip('Video completed');
            }, 1000); // Brief completion message
          }
          break;
          
        case 'LOADING_TIMEOUT':
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
        case 'PLAYER_ERROR':
          addDebugLog(`Video error: ${data.message}`);
          if (data.instantSkip) {
            handleInstantSkip(data.message);
          } else {
            handleInstantSkip('Video error occurred');
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
          addDebugLog(`Video unplayable: ${data.message}`);
          if (data.instantSkip) {
            handleInstantSkip(data.message);
          } else if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            // Retry with new webview
            setTimeout(() => {
              if (webviewRef.current) {
                webviewRef.current.reload();
              }
            }, 1000);
          } else {
            handleInstantSkip('Max retries reached');
          }
          break;
      }
    } catch (error) {
      addDebugLog(`Error parsing WebView message: ${error}`);
      handleInstantSkip('Message parse error');
    }
  }, [coinsEarned, targetDuration, videoCompleted, retryCount, maxRetries, handleInstantSkip, awardCoins, addDebugLog]);

  const pauseVideo = useCallback(() => {
    if (webviewRef.current) {
      addDebugLog('Manual pause triggered');
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    }
  }, [addDebugLog]);

  const playVideo = useCallback(() => {
    if (webviewRef.current && isTabFocused && appState === 'active') {
      addDebugLog('Manual play triggered');
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
  }, [isTabFocused, appState, addDebugLog]);

  const handlePlayPause = () => {
    if (!isTabFocused || appState !== 'active') {
      return;
    }
    
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const handleSkipVideo = () => {
    addDebugLog('Manual skip requested');
    handleInstantSkip('Manual skip');
  };

  const toggleAutoPlay = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    addDebugLog(`Auto-play toggled: ${newAutoPlay}`);
    
    // Update auto-skip setting in WebView
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`window.updateAutoSkip && window.updateAutoSkip(${newAutoPlay}); true;`);
    }
  };

  // Animation styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>VidGro</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <Coins color="#FFD700" size={20} />
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
          <Text style={styles.headerTitle}>VidGro</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <Coins color="#FFD700" size={20} />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>Loading next video...</Text>
          <ActivityIndicator size="large" color="#FF4757" style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with VidGro branding */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>VidGro</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Player Container */}
        <View style={styles.videoSection}>
          <View style={styles.videoContainer}>
            {/* Loading State - Only show when not skipping */}
            {(!isVideoLoaded && !isSkipping) && (
              <View style={styles.videoLoadingContainer}>
                <ActivityIndicator size="large" color="#FF4757" />
                <Text style={styles.videoLoadingText}>Loading video...</Text>
                <Text style={styles.videoIdText}>Video ID: {youtubeVideoId}</Text>
              </View>
            )}

            {/* Skipping State */}
            {isSkipping && (
              <View style={styles.videoLoadingContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.videoLoadingText}>Loading next video...</Text>
              </View>
            )}

            {/* WebView Player - Only render when not skipping */}
            {youtubeVideoId && !isSkipping && (
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
                allowsProtectedMedia={false}
                dataDetectorTypes={['none']}
                injectedJavaScript=""
                onShouldStartLoadWithRequest={() => true}
                onNavigationStateChange={() => {}}
                allowsLinkPreview={false}
                allowsBackForwardNavigationGestures={false}
              />
            )}
            
            {/* Progress Bar */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>

            {/* Completion Message Overlay */}
            {showCompletionMessage && (
              <View style={styles.completionOverlay}>
                <View style={styles.completionMessage}>
                  <Coins color="#FFD700" size={32} />
                  <Text style={styles.completionText}>+{coinReward} coins earned!</Text>
                </View>
              </View>
            )}
          </View>

          {/* Video Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
              {currentVideo.title}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Clock color="#FF4757" size={18} />
              </View>
              <Text style={styles.statValue}>{Math.ceil(remainingTime)}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            
            <View style={styles.statCard}>
              <Animated.View style={[styles.statIconContainer, coinAnimatedStyle]}>
                <Coins color="#FFA726" size={18} />
              </Animated.View>
              <Text style={styles.statValue}>{coinReward}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <View style={styles.autoPlayContainer}>
              <ExternalLink color="#666" size={16} />
              <Text style={styles.autoPlayLabel}>YouTube</Text>
            </View>
            <View style={styles.autoPlayContainer}>
              <Text style={styles.autoPlayLabel}>Auto Play</Text>
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
                        translateX: autoPlay ? 16 : 0
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
              style={[styles.playButton, (!isVideoLoaded || !isTabFocused) && styles.playButtonDisabled]}
              onPress={handlePlayPause}
              disabled={!isVideoLoaded || !isTabFocused}
            >
              {isPlaying ? (
                <Pause color="white" size={20} />
              ) : (
                <Play color="white" size={20} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
              <SkipForward color="white" size={16} />
              <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
            </TouchableOpacity>
          </View>

          {/* Security Status */}
          {(!isTabFocused || appState !== 'active') && (
            <View style={styles.securityWarning}>
              <Text style={styles.securityWarningText}>
                🔒 Stay on this tab to watch videos
              </Text>
            </View>
          )}
        </View>

        {/* Debug Information */}
        {debugLogs.length > 0 && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Log:</Text>
            {debugLogs.map((log, index) => (
              <Text key={index} style={styles.debugText}>{log}</Text>
            ))}
            {coinUpdateInProgress && (
              <Text style={styles.coinUpdateText}>Updating coins...</Text>
            )}
          </View>
        )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    minHeight: Platform.OS === 'ios' ? 100 : 90,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
    minWidth: isSmallScreen ? 70 : 80,
    justifyContent: 'center',
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginRight: isSmallScreen ? 4 : 6,
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
  loadingSpinner: {
    marginTop: 10,
  },
  videoSection: {
    backgroundColor: 'white',
    marginHorizontal: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 12 : 16,
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
    height: videoHeight,
    backgroundColor: '#000',
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
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
    marginTop: 12,
    textAlign: 'center',
  },
  videoIdText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
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
    zIndex: 1000,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 2000,
  },
  completionMessage: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
  },
  completionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  titleContainer: {
    padding: isSmallScreen ? 12 : 16,
  },
  videoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  statsSection: {
    marginHorizontal: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 12 : 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 8 : 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 12,
  },
  statValue: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isSmallScreen ? 2 : 4,
  },
  statLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  controlsSection: {
    backgroundColor: 'white',
    marginHorizontal: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 20 : 24,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
    marginBottom: isSmallScreen ? 16 : 20,
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 6 : 8,
  },
  autoPlayLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#333',
    fontWeight: '500',
  },
  autoPlayToggle: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 20 : 24,
    borderRadius: isSmallScreen ? 10 : 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'relative',
  },
  autoPlayToggleActive: {
    backgroundColor: '#FF4757',
  },
  autoPlayThumb: {
    width: isSmallScreen ? 16 : 20,
    height: isSmallScreen ? 16 : 20,
    borderRadius: isSmallScreen ? 8 : 10,
    backgroundColor: 'white',
    position: 'absolute',
    left: 2,
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
  autoPlayThumbActive: {
    // Animation handled by transform
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 12 : 16,
  },
  playButton: {
    width: isSmallScreen ? 56 : 64,
    height: isSmallScreen ? 56 : 64,
    borderRadius: isSmallScreen ? 28 : 32,
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
    paddingVertical: isSmallScreen ? 16 : 18,
    borderRadius: 12,
    gap: isSmallScreen ? 6 : 8,
    ...Platform.select({
      ios: {
        shadowColor: '#6B7280',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(107, 114, 128, 0.2)',
      },
    }),
  },
  skipButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  securityWarning: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 12 : 16,
  },
  securityWarningText: {
    color: '#856404',
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  debugSection: {
    backgroundColor: '#F0F8FF',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  coinUpdateText: {
    color: '#FFA726',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});