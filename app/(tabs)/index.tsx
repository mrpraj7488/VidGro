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
  BackHandler,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Clock, ExternalLink, Menu } from 'lucide-react-native';
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
  const [coinUpdateInProgress, setCoinUpdateInProgress] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(false);
  const [isBackgroundPaused, setIsBackgroundPaused] = useState(false);
  const [securityViolations, setSecurityViolations] = useState(0);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [securityPauseProcessing, setSecurityPauseProcessing] = useState(false);

  // Refs
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const securityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const securityPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSecurityPausedRef = useRef(false);

  // Animation values
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  const currentVideo = getCurrentVideo();
  const targetDuration = 30; // 30 seconds to earn coins
  const coinReward = 3; // 3 coins per video
  const maxRetries = 1;
  const loadingTimeoutDuration = 3000;
  const MAX_SECURITY_VIOLATIONS = 3;
  const INTERACTION_TIMEOUT = 60000; // 1 minute of inactivity

  // Calculate remaining time for UI display
  const remainingTime = Math.max(0, targetDuration - currentTime);

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

  // Enhanced security check function
  const performSecurityCheck = useCallback(() => {
    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionTime;
    
    // Check for suspicious inactivity
    if (timeSinceLastInteraction > INTERACTION_TIMEOUT && isPlaying) {
      console.log('🔒 Security: Suspicious inactivity detected, pausing video');
      pauseVideo();
      setSecurityViolations(prev => prev + 1);
      
      if (securityViolations >= MAX_SECURITY_VIOLATIONS) {
        console.log('🚨 Security: Maximum violations reached, skipping video');
        handleInstantSkip('Security violation - excessive inactivity');
      }
    }
    
    // Check app state consistency
    if (appState !== 'active' && isPlaying) {
      console.log('🔒 Security: App not active but video playing, forcing pause');
      pauseVideo();
      setIsBackgroundPaused(true);
    }
    
    // Check tab focus consistency
    if (!isTabFocused && isPlaying) {
      console.log('🔒 Security: Tab not focused but video playing, forcing pause');
      pauseVideo();
    }
  }, [lastInteractionTime, isPlaying, appState, isTabFocused, securityViolations]);

  // Start security monitoring
  useEffect(() => {
    if (currentVideo && isVideoLoaded) {
      securityCheckIntervalRef.current = setInterval(performSecurityCheck, 5000); // Check every 5 seconds
      
      return () => {
        if (securityCheckIntervalRef.current) {
          clearInterval(securityCheckIntervalRef.current);
        }
      };
    }
  }, [currentVideo, isVideoLoaded, performSecurityCheck]);

  // Track user interactions for security
  const trackInteraction = useCallback(() => {
    setLastInteractionTime(Date.now());
    setSecurityViolations(0); // Reset violations on interaction
  }, []);

  // Enhanced back handler for security
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPlaying) {
        console.log('🔒 Security: Back button pressed, pausing video');
        pauseVideo();
        setIsBackgroundPaused(true);
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isPlaying]);

  // Create HTML content for YouTube iframe with enhanced popup suppression
  const createHtmlContent = (videoId: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://www.youtube.com https://youtube.com; script-src 'self' 'unsafe-inline' https://www.youtube.com; frame-src https://www.youtube.com; style-src 'self' 'unsafe-inline';">
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
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        #player-container {
          position: relative;
          width: 100%;
          height: 100%;
          isolation: isolate;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
          pointer-events: none;
          sandbox: allow-scripts allow-same-origin;
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
        .security-overlay, .interaction-blocker {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          background: transparent;
          pointer-events: auto;
          cursor: default;
          touch-action: none;
        }
        * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
        }
        iframe {
          pointer-events: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        .security-warning {
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10001;
          display: none;
        }
      </style>
    </head>
    <body>
      <div id="player-container">
        <div id="player"></div>
        <div id="loading" class="loading">Loading video...</div>
        <div class="security-warning" id="security-warning">Security violation detected</div>
        <div class="security-overlay interaction-blocker" 
             oncontextmenu="return false;" 
             ondragstart="return false;" 
             onselectstart="return false;"
             onmousedown="return false;"
             ontouchstart="return false;"
             onclick="return false;"
             ondblclick="return false;"
             onkeydown="return false;"
             onkeyup="return false;"
             onkeypress="return false;"
             onfocus="this.blur(); return false;"
             oncut="return false;"
             oncopy="return false;"
             onpaste="return false;"></div>
      </div>
      
      <script>
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
        var debugMode = false; // Debug mode disabled
        var popupSuppressed = false;
        var securityViolations = 0;
        var lastInteractionTime = Date.now();
        var isSecurityLocked = false;
        var maxSecurityViolations = ${MAX_SECURITY_VIOLATIONS};
        
        // Enhanced security monitoring
        function checkSecurity() {
          var now = Date.now();
          var timeSinceInteraction = now - lastInteractionTime;
          
          // Check for suspicious activity
          if (timeSinceInteraction > 60000 && player && player.getPlayerState && player.getPlayerState() === 1) {
            securityViolations++;
            showSecurityWarning();
            
            if (securityViolations >= maxSecurityViolations) {
              isSecurityLocked = true;
              window.pauseVideo();
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SECURITY_VIOLATION',
                reason: 'Excessive inactivity',
                violations: securityViolations
              }));
            }
          }
          
          // Check document visibility
          if (document.hidden && player && player.getPlayerState && player.getPlayerState() === 1) {
            window.pauseVideo();
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'BACKGROUND_PAUSE',
              reason: 'Document hidden'
            }));
          }
        }
        
        function showSecurityWarning() {
          var warning = document.getElementById('security-warning');
          if (warning) {
            warning.style.display = 'block';
            setTimeout(function() {
              warning.style.display = 'none';
            }, 3000);
          }
        }
        
        function trackInteraction() {
          lastInteractionTime = Date.now();
          securityViolations = Math.max(0, securityViolations - 1);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'USER_INTERACTION',
            timestamp: lastInteractionTime
          }));
        }
        
        // Start security monitoring
        setInterval(checkSecurity, 5000);
        
        // Set loading timeout
        loadingTimeoutId = setTimeout(function() {
          if (!isPlayerReady && !hasTimedOut && !hasError) {
            hasTimedOut = true;
            
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
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 1,
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
                'widget_referrer': window.location.origin,
                'html5': 1,
                'wmode': 'opaque'
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
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
          
          isPlayerReady = true;
          if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
          document.getElementById('loading').style.display = 'none';
          
          // Apply enhanced security to iframe
          setTimeout(function() {
            var iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.style.pointerEvents = 'none';
              iframe.style.userSelect = 'none';
              iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
              iframe.setAttribute('allowfullscreen', 'false');
              iframe.setAttribute('allow', 'autoplay; encrypted-media');
              iframe.style.isolation = 'isolate';
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
                  player.playVideo();
                } catch (error) {
                  // Error handled silently
                }
              }
            }, 500);
          }
        }

        function onPlayerStateChange(event) {
          if (hasError || hasTimedOut || isSecurityLocked) {
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
          
          // Track interaction on state change
          trackInteraction();
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
          
          if (state === 1) { // PLAYING
            if (!hasStarted) {
              hasStarted = true;
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_STARTED'
              }));
            }
            
            // Additional security check on play
            if (!isTabVisible || document.hidden) {
              player.pauseVideo();
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SECURITY_PAUSE',
                reason: 'Tab not visible or document hidden'
              }));
            }
          }
          
          // Handle video end with popup suppression
          if (state === 0 && !hasCompleted) { // ENDED
            hasCompleted = true;
            
            // Immediately stop the video to prevent end screen popup
            if (player && player.stopVideo && !popupSuppressed) {
              try {
                player.stopVideo();
                popupSuppressed = true;
              } catch (error) {
                // Error handled silently
              }
            }
            
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
          
          progressInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady && !hasCompleted && !isSecurityLocked) {
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
                        
                        if (player && player.stopVideo) {
                          player.stopVideo();
                          popupSuppressed = true;
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
                // Error handled silently
              }
            }
          }, 1000);
        }

        // Enhanced control functions with security checks
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady && isTabVisible && !isSecurityLocked && !document.hidden) {
            trackInteraction();
            player.playVideo();
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            trackInteraction();
            player.pauseVideo();
          }
        };

        window.stopVideo = function() {
          if (player && player.stopVideo && isPlayerReady) {
            trackInteraction();
            player.stopVideo();
            popupSuppressed = true;
          }
        };

        // Enhanced tab visibility control
        window.setTabVisibility = function(visible) {
          isTabVisible = visible;
          
          if (!visible) {
            if (player && player.getPlayerState && player.getPlayerState() === 1) {
              wasPlayingBeforeHidden = true;
              window.pauseVideo();
            } else {
              wasPlayingBeforeHidden = false;
            }
          } else {
            if (wasPlayingBeforeHidden && autoPlayEnabled && !isSecurityLocked) {
              setTimeout(function() {
                window.playVideo();
              }, 500);
            }
          }
        };

        // Update auto-skip setting
        window.updateAutoSkip = function(enabled) {
          autoSkipEnabled = enabled;
        };

        // Enhanced page visibility handling
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            window.pauseVideo();
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DOCUMENT_HIDDEN',
              timestamp: Date.now()
            }));
          } else if (isTabVisible && autoPlayEnabled) {
            setTimeout(function() {
              window.playVideo();
            }, 500);
          }
        });

        // Enhanced security: Block all navigation and interactions
        window.open = function() {
          return null;
        };

        Object.defineProperty(window, 'location', {
          value: window.location,
          writable: false
        });
        
        // Block additional security risks
        window.alert = function() { return false; };
        window.confirm = function() { return false; };
        window.prompt = function() { return null; };
        
        // Prevent iframe breakout attempts
        if (window.top !== window.self) {
          try {
            window.top.location = window.self.location;
          } catch (e) {
            // Expected to fail, this is good
          }
        }
        
        // Additional event blocking
        document.addEventListener('keydown', function(e) {
          // Block F12, Ctrl+Shift+I, Ctrl+U, etc.
          if (e.keyCode === 123 || 
              (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
              (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            return false;
          }
          trackInteraction();
        });
        
        document.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          return false;
        });
        
        // Track mouse/touch interactions
        document.addEventListener('mousedown', trackInteraction);
        document.addEventListener('touchstart', trackInteraction);
        document.addEventListener('click', trackInteraction);
      </script>
    </body>
    </html>
  `;

  // Handle tab focus changes with enhanced security
  useFocusEffect(
    useCallback(() => {
      setIsTabFocused(true);
      setIsBackgroundPaused(false);
      trackInteraction();
      
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
      }

      return () => {
        setIsTabFocused(false);
        
        // Force pause when tab loses focus
        if (isPlaying) {
          pauseVideo();
          setIsBackgroundPaused(true);
        }
        
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(false); true;');
        }
      };
    }, [isPlaying])
  );

  // Enhanced app state change handling with fixed security pause logic
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🔒 App state change:', appState, '->', nextAppState);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // Clear security pause timeout when returning to active
        if (securityPauseTimeoutRef.current) {
          clearTimeout(securityPauseTimeoutRef.current);
          securityPauseTimeoutRef.current = null;
        }
        
        // Reset security pause flag after a delay
        setTimeout(() => {
          isSecurityPausedRef.current = false;
        }, 500);
        
        if (isTabFocused && webviewRef.current && !isBackgroundPaused) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
          trackInteraction();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('🔒 App going to background, forcing pause');
        
        // Set security pause flag immediately
        isSecurityPausedRef.current = true;
        
        // Set timeout to prevent immediate resume
        securityPauseTimeoutRef.current = setTimeout(() => {
          isSecurityPausedRef.current = false;
        }, 2000); // 2 second delay
        
        pauseVideo();
        setIsPlaying(false);
        setIsBackgroundPaused(true);
        
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(false); true;');
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isTabFocused, isBackgroundPaused]);

  // Reset states when video changes
  useEffect(() => {
    if (currentVideo) {
      // Reset all video-specific states
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
      setIsBackgroundPaused(false);
      setSecurityViolations(0);
      setLastInteractionTime(Date.now());
      setSecurityPauseProcessing(false);
      progressValue.value = 0;
      
      // Clear all timeouts
      [loadingTimeoutRef, completionTimeoutRef, skipTimeoutRef, securityCheckIntervalRef, interactionTimeoutRef, securityPauseTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
      
      // Reset security pause flag
      isSecurityPausedRef.current = false;
      
      // Set loading timeout for instant skip
      loadingTimeoutRef.current = setTimeout(() => {
        if (!isVideoLoaded && !isSkipping) {
          handleInstantSkip('Loading timeout');
        }
      }, loadingTimeoutDuration);
    }
  }, [currentVideo]);

  // Fetch videos on component mount
  useEffect(() => {
    if (user && videoQueue.length === 0) {
      fetchVideos(user.id);
    }
  }, [user, videoQueue.length, fetchVideos]);

  // Instant skip function for seamless experience
  const handleInstantSkip = useCallback((reason: string = 'Video unavailable') => {
    if (isSkipping) return;
    
    setIsSkipping(true);
    console.log('⏭️ Instant skip:', reason);
    
    // Clear all timeouts
    [loadingTimeoutRef, completionTimeoutRef, skipTimeoutRef, securityCheckIntervalRef, interactionTimeoutRef, securityPauseTimeoutRef].forEach(ref => {
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
    setIsBackgroundPaused(false);
    setSecurityViolations(0);
    setSecurityPauseProcessing(false);
    progressValue.value = 0;
    isSecurityPausedRef.current = false;
    
    // Move to next video instantly
    skipTimeoutRef.current = setTimeout(() => {
      moveToNextVideo();
      
      // Fetch more videos if queue is running low
      if (user && videoQueue.length <= 2) {
        fetchVideos(user.id);
      }
      
      setIsSkipping(false);
    }, 100); // Minimal delay for smooth transition
  }, [isSkipping, moveToNextVideo, user, videoQueue.length, fetchVideos]);

  // Enhanced award coins function with retry mechanism
  const awardCoins = useCallback(async (coins: number) => {
    if (!user || !currentVideo || coinsEarned || coinUpdateInProgress || coinsAwarded) {
      return;
    }
    
    setCoinUpdateInProgress(true);
    setCoinsEarned(true);
    setCoinsAwarded(true); // Set this immediately to prevent double awards
    
    const maxRetryAttempts = 3;
    let retryAttempt = 0;
    
    const attemptCoinUpdate = async (): Promise<boolean> => {
      try {
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
          throw error;
        }

        if (result) {
          // Add delay before refreshing profile to ensure database transaction is committed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const oldCoins = profile?.coins || 0;
          await refreshProfile();
          
          // Verify the update worked
          setTimeout(() => {
            const newCoins = profile?.coins || 0;
            if (newCoins !== oldCoins + coins) {
              // Try one more refresh after a longer delay
              setTimeout(() => {
                refreshProfile();
              }, 2000);
            }
          }, 500);
          
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
          
          return true;
        } else {
          throw new Error('No result returned from coin update function');
        }
      } catch (error: any) {
        // Check if it's a network error that we should retry
        const isRetryableError = error.code === 'PGRST301' || 
                                error.message?.includes('500') || 
                                error.message?.includes('network') ||
                                error.message?.includes('timeout');
        
        if (isRetryableError && retryAttempt < maxRetryAttempts - 1) {
          retryAttempt++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptCoinUpdate();
        }
        
        throw error;
      }
    };
    
    try {
      await attemptCoinUpdate();
    } catch (error: any) {
      // Reset states on final failure
      setCoinsEarned(false);
      setCoinsAwarded(false);
    } finally {
      setCoinUpdateInProgress(false);
    }
  }, [user, currentVideo, coinsEarned, coinUpdateInProgress, refreshProfile, profile?.coins]);

  // Enhanced WebView message handler with security features
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'USER_INTERACTION':
          trackInteraction();
          break;
          
        case 'SECURITY_VIOLATION':
          console.log('🚨 Security violation:', data.reason);
          setSecurityViolations(prev => prev + 1);
          if (data.violations >= MAX_SECURITY_VIOLATIONS) {
            handleInstantSkip('Security violation - ' + data.reason);
          }
          break;
          
        case 'BACKGROUND_PAUSE':
        case 'DOCUMENT_HIDDEN':
        case 'SECURITY_PAUSE':
          console.log('🔒 Security pause:', data.reason);
          setIsPlaying(false);
          setIsBackgroundPaused(true);
          break;
          
        case 'PLAYER_READY_SUCCESS':
          setIsVideoLoaded(true);
          setPlayerError(null);
          setSecurityViolations(0);
          trackInteraction();
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          break;
          
        case 'VIDEO_STARTED':
          setHasStarted(true);
          setIsPlaying(true);
          setIsBackgroundPaused(false);
          trackInteraction();
          break;
          
        case 'STATE_CHANGE':
          trackInteraction();
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
            setIsBackgroundPaused(false);
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          } else if (data.state === 0) { // ENDED
            // Inject stopVideo to suppress popup
            if (webviewRef.current) {
              webviewRef.current.injectJavaScript('window.stopVideo && window.stopVideo(); true;');
            }
          }
          break;
          
        case 'PROGRESS_UPDATE':
          setCurrentTime(data.currentTime);
          trackInteraction();
          const progress = Math.min(data.currentTime / targetDuration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'COINS_EARNED':
          if (!coinsEarned) {
            trackInteraction();
            awardCoins(data.coinsEarned);
          }
          break;
          
        case 'VIDEO_COMPLETED':
          // Award coins if video was watched for sufficient time and not already earned
          if (!coinsEarned && !coinsAwarded && data.currentTime >= (targetDuration * 0.9) && !coinUpdateInProgress) {
            await awardCoins(coinReward);
          }
          
          if (!videoCompleted) {
            setVideoCompleted(true);
            setIsPlaying(false);
            setIsBackgroundPaused(false);
            // Move to next video instantly without showing completion message
            completionTimeoutRef.current = setTimeout(() => {
              handleInstantSkip('Video completed');
            }, 500); // Brief delay for smooth transition
          }
          break;
          
        case 'LOADING_TIMEOUT':
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
        case 'PLAYER_ERROR':
          if (data.instantSkip) {
            handleInstantSkip(data.message);
          } else {
            handleInstantSkip('Video error occurred');
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
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
      handleInstantSkip('Message parse error');
    }
  }, [coinsEarned, targetDuration, videoCompleted, retryCount, maxRetries, handleInstantSkip, awardCoins, trackInteraction]);

  const pauseVideo = useCallback(() => {
    // Don't pause if security pause is active
    if (isSecurityPausedRef.current) {
      console.log('🔒 Security pause: Pause blocked');
      return;
    }
    
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    }
    trackInteraction();
  }, []);

  const playVideo = useCallback(() => {
    // Don't play if security pause is active
    if (isSecurityPausedRef.current) {
      console.log('🔒 Security pause: Play blocked');
      return;
    }
    
    if (webviewRef.current && isTabFocused && appState === 'active' && !isBackgroundPaused) {
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
    trackInteraction();
  }, [isTabFocused, appState, isBackgroundPaused]);

  const handlePlayPause = useCallback(() => {
    if (securityPauseProcessing) {
      console.log('⚠️ Play/pause blocked due to security pause');
      return;
    }
    
    if (!isTabFocused || appState !== 'active' || isBackgroundPaused || isSecurityPausedRef.current) {
      return;
    }
    
    trackInteraction();
    
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
    
    setIsPlaying(!isPlaying);
    
    // Reset watch time when manually pausing
    if (isPlaying) {
      setWatchTime(0);
    }
  }, [isPlaying, securityPauseProcessing]);

  const handleSkipVideo = () => {
    trackInteraction();
    handleInstantSkip('Manual skip');
  };

  const toggleAutoPlay = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    trackInteraction();
    
    // Update auto-skip setting in WebView
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`window.updateAutoSkip && window.updateAutoSkip(${newAutoPlay}); true;`);
    }
  };

  const openYouTubeVideo = () => {
    if (!currentVideo) return;
    
    trackInteraction();
    const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.youtube_url}`;
    
    if (Platform.OS === 'web') {
      window.open(youtubeUrl, '_blank');
    } else {
      Linking.openURL(youtubeUrl).catch(err => {
        console.error('Failed to open YouTube:', err);
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

  if (isLoading && videoQueue.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>VidGro</Text>
          <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
            <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
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
            <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
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
    <View style={styles.container} onTouchStart={trackInteraction}>
      {/* Header with VidGro branding */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>VidGro</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
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
                onLoadStart={() => trackInteraction()}
                onLoadEnd={() => trackInteraction()}
                onError={() => handleInstantSkip('WebView error')}
              />
            )}
            
            {/* Progress Bar */}
            <View style={styles.progressOverlay}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </View>
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
                <Text style={styles.coinIcon}>🪙</Text>
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
            <TouchableOpacity style={styles.youtubeContainer} onPress={openYouTubeVideo}>
              <ExternalLink color="#FF4757" size={16} />
              <Text style={styles.youtubeLabel}>YouTube</Text>
            </TouchableOpacity>
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
              style={[
                styles.playButton, 
                (!isVideoLoaded || !isTabFocused || isBackgroundPaused || isSecurityPausedRef.current) && styles.playButtonDisabled,
                !isPlaying && styles.playButtonPaused
              ]}
              onPress={handlePlayPause}
              disabled={!isVideoLoaded || !isTabFocused || isBackgroundPaused || isSecurityPausedRef.current}
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
          {(!isTabFocused || appState !== 'active' || isBackgroundPaused || isSecurityPausedRef.current) && (
            <View style={styles.securityWarning}>
              <Text style={styles.securityWarningText}>
                🔒 {isBackgroundPaused || isSecurityPausedRef.current ? 'Video paused - return to continue' : 'Stay on this tab to watch videos'}
              </Text>
            </View>
          )}
          
          {/* Security Violations Warning */}
          {securityViolations > 0 && (
            <View style={[styles.securityWarning, styles.violationWarning]}>
              <Text style={styles.securityWarningText}>
                ⚠️ Security violations: {securityViolations}/{MAX_SECURITY_VIOLATIONS}
              </Text>
            </View>
          )}
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
  coinIcon: {
    fontSize: 18,
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
  youtubeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 6 : 8,
  },
  youtubeLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#FF4757',
    fontWeight: '500',
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
  playButtonPaused: {
    backgroundColor: '#9CA3AF',
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
  violationWarning: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF9999',
  },
  securityWarningText: {
    color: '#856404',
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});