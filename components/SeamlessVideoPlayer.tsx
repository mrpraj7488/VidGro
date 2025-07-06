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
import { Play, Pause, SkipForward, Award, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface SeamlessVideoPlayerProps {
  videoId: string;
  youtubeUrl: string; // This now contains the video ID
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
  onVideoUnplayable: () => void; // New prop for handling unplayable videos
}

export default function SeamlessVideoPlayer({
  videoId,
  youtubeUrl, // This is actually the video ID from database
  duration,
  coinReward,
  onVideoComplete,
  onVideoSkip,
  onError: reportErrorToParent,
  onVideoUnplayable
}: SeamlessVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastProgressTime, setLastProgressTime] = useState(0);
  const [stuckProgressCount, setStuckProgressCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMarkedInactive, setIsMarkedInactive] = useState(false);
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stuckCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { handleVideoError } = useVideoStore();
  const maxRetries = 0; // No retries for faster skipping
  const errorTimeoutDuration = 5000; // 5 seconds timeout
  const maxStuckCount = 3; // Max times progress can be stuck before action

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Extract YouTube video ID from the stored value (which is now just the video ID)
  const extractVideoIdFromUrl = (videoIdOrUrl: string): string | null => {
    console.log('Processing video ID/URL:', videoIdOrUrl);
    
    // If it's already a video ID (11 characters), return it directly
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
      console.log('Already a video ID:', videoIdOrUrl);
      return videoIdOrUrl;
    }
    
    // Otherwise, try to extract from URL patterns
    const patterns = [
      // Embed URLs: https://www.youtube.com/embed/VIDEO_ID (most common in our case)
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
      // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      // Short URLs: https://youtu.be/VIDEO_ID
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
      // Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
      /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      // Gaming URLs: https://gaming.youtube.com/watch?v=VIDEO_ID
      /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = videoIdOrUrl.match(pattern);
      if (match && match[1]) {
        console.log('Extracted video ID:', match[1], 'from pattern:', pattern.source);
        return match[1];
      }
    }
    
    console.log('Could not extract video ID from:', videoIdOrUrl);
    return null;
  };

  const youtubeVideoId = extractVideoIdFromUrl(youtubeUrl);

  // Mark video as inactive in Supabase
  const markVideoInactive = async (videoId: string, reason: string) => {
    if (isMarkedInactive) return; // Prevent duplicate calls
    
    try {
      setIsMarkedInactive(true);
      console.log(`Marking video ${videoId} as inactive due to: ${reason}`);
      
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('youtube_url', videoId); // youtube_url field contains the video ID
      
      if (error) {
        console.error('Error marking video as inactive:', error);
      } else {
        console.log(`✅ Video ${videoId} marked as inactive in Supabase`);
        showToast(`Video unavailable, skipping... (${reason})`);
      }
    } catch (error) {
      console.error('Error in markVideoInactive:', error);
    }
  };

  // Enhanced HTML content with runtime validation and immediate error detection
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
      </style>
    </head>
    <body>
      <div id="player"></div>
      <div id="loading" class="loading">Loading YouTube player...</div>
      <div id="error" class="error" style="display: none;"></div>
      
      <script>
        console.log('Initializing YouTube player for video ID: ${youtubeVideoId}');
        
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
            type: 'VIDEO_UNPLAYABLE',
            error: 'API_LOAD_FAILED',
            message: 'Failed to load YouTube iframe API',
            errorType: 'API_LOAD_FAILED'
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
        var maxErrors = 2;
        var retryAttempts = 0;
        var maxRetries = 0; // No retries for faster skipping
        var isBuffering = false;
        var stuckCount = 0;
        var maxStuckCount = 3;
        var progressCheckInterval;
        var autoPlayAttempted = false;
        var runtimeValidationDone = false;

        function onYouTubeIframeAPIReady() {
          console.log('YouTube API ready, creating player for video ID: ${youtubeVideoId}');
          document.getElementById('loading').textContent = 'Creating player...';
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${youtubeVideoId}',
              playerVars: {
                'autoplay': 1, // Enable autoplay for immediate testing
                'controls': 0,
                'modestbranding': 1,
                'rel': 0,
                'fs': 0,
                'disablekb': 1,
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
              type: 'VIDEO_UNPLAYABLE',
              error: 'PLAYER_CREATION_FAILED',
              message: 'Failed to create YouTube player: ' + error.message,
              errorType: 'PLAYER_CREATION_FAILED'
            }));
          }
        }

        function onPlayerReady(event) {
          console.log('Player ready for video ID: ${youtubeVideoId}');
          document.getElementById('loading').style.display = 'none';
          isPlayerReady = true;
          
          // CRITICAL: Runtime validation on player ready
          performRuntimeValidation();
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${youtubeVideoId}'
          }));
          
          // Auto-start playing immediately for testing
          setTimeout(function() {
            if (player && player.playVideo && isPlayerReady && !autoPlayAttempted) {
              console.log('Auto-starting video playback for testing');
              autoPlayAttempted = true;
              try {
                player.playVideo();
              } catch (error) {
                console.error('Error starting playback:', error);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_UNPLAYABLE',
                  error: 'PLAYBACK_START_FAILED',
                  message: 'Failed to start video playback',
                  errorType: 'PLAYBACK_START_FAILED'
                }));
              }
            }
          }, 200); // Very fast auto-play for immediate testing
          
          // Start enhanced progress tracking
          startProgressTracking();
        }

        // CRITICAL: Runtime validation function
        function performRuntimeValidation() {
          if (runtimeValidationDone) return;
          runtimeValidationDone = true;
          
          console.log('Performing runtime validation for video: ${youtubeVideoId}');
          
          try {
            // Check player state immediately
            var playerState = player.getPlayerState();
            console.log('Initial player state:', playerState);
            
            // Get video data for validation
            var videoData = player.getVideoData();
            console.log('Video data:', videoData);
            
            if (!videoData || !videoData.title) {
              console.warn('Video data unavailable - may indicate embedding issues');
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_UNPLAYABLE',
                error: 'NO_VIDEO_DATA',
                message: 'Video data unavailable - may be private or restricted',
                errorType: 'NO_VIDEO_DATA'
              }));
              return;
            }
            
            // Test playback capability
            setTimeout(function() {
              try {
                var currentState = player.getPlayerState();
                console.log('Player state after 1 second:', currentState);
                
                // If player is in error state or unstarted after auto-play attempt
                if (currentState === -1 || currentState === 5) {
                  console.log('Player in unstarted/cued state, attempting manual play');
                  player.playVideo();
                  
                  // Check again after manual play attempt
                  setTimeout(function() {
                    var finalState = player.getPlayerState();
                    console.log('Final player state after manual play:', finalState);
                    
                    if (finalState === -1) {
                      console.error('Video failed to start - likely embedding issue');
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'VIDEO_UNPLAYABLE',
                        error: 'PLAYBACK_FAILED',
                        message: 'Video failed to start - likely embedding restriction',
                        errorType: 'PLAYBACK_FAILED'
                      }));
                    }
                  }, 1000);
                }
              } catch (error) {
                console.error('Error in runtime validation:', error);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_UNPLAYABLE',
                  error: 'VALIDATION_ERROR',
                  message: 'Runtime validation failed: ' + error.message,
                  errorType: 'VALIDATION_ERROR'
                }));
              }
            }, 1000);
            
          } catch (error) {
            console.error('Error in performRuntimeValidation:', error);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: 'VALIDATION_EXCEPTION',
              message: 'Runtime validation exception: ' + error.message,
              errorType: 'VALIDATION_EXCEPTION'
            }));
          }
        }

        function startProgressTracking() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
          }
          
          console.log('Starting progress monitoring');
          
          progressCheckInterval = setInterval(function() {
            if (player && player.getCurrentTime && isPlayerReady && !hasCompleted) {
              try {
                var newTime = player.getCurrentTime();
                
                // Check if progress is stuck
                if (Math.abs(newTime - lastReportedTime) < 0.1 && newTime > 0) {
                  stuckCount++;
                  console.log('Progress stuck at', newTime, 'count:', stuckCount);
                  
                  if (stuckCount >= maxStuckCount) {
                    console.log('Progress stuck too long, attempting to resume playback');
                    try {
                      // Try to resume playback
                      if (player.getPlayerState() !== 1) { // Not playing
                        player.playVideo();
                      }
                      // Reset stuck count after intervention
                      stuckCount = 0;
                    } catch (error) {
                      console.error('Error resuming playback:', error);
                    }
                  }
                } else {
                  stuckCount = 0; // Reset stuck count if progress is moving
                }
                
                currentTime = newTime;
                lastReportedTime = newTime;
                
                // Limit to user-set duration
                if (currentTime >= maxDuration && !hasCompleted) {
                  hasCompleted = true;
                  try {
                    player.pauseVideo();
                  } catch (error) {
                    console.error('Error pausing video:', error);
                  }
                  console.log('Video completed at', currentTime, 'seconds');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'VIDEO_COMPLETED',
                    currentTime: currentTime
                  }));
                } else if (currentTime < maxDuration) {
                  // Only send progress updates if time has actually changed
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PROGRESS_UPDATE',
                    currentTime: currentTime,
                    progress: (currentTime / maxDuration) * 100
                  }));
                }
              } catch (error) {
                console.error('Error getting current time:', error);
                errorCount++;
                if (errorCount > maxErrors) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'VIDEO_UNPLAYABLE',
                    error: 'PROGRESS_ERROR',
                    message: 'Failed to track video progress',
                    errorType: 'PROGRESS_ERROR'
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
          
          console.log('Player state changed to:', stateNames[state] || state);
          
          // Handle buffering state
          if (state === 3) { // BUFFERING
            isBuffering = true;
            console.log('Video buffering...');
          } else {
            isBuffering = false;
          }
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));

          // Handle video ended before user-set duration
          if (state === 0 && currentTime < maxDuration && !hasCompleted) {
            console.log('Video ended early at', currentTime, 'seconds');
            hasCompleted = true;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ENDED_EARLY',
              currentTime: currentTime
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
          console.error('YouTube player error:', event.data, errorMessage);
          
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          document.getElementById('error').textContent = errorMessage;
          
          // CRITICAL: Immediately report embedding errors (101, 150) as unplayable
          if (event.data === 101 || event.data === 150) {
            console.log('Video not embeddable (error ' + event.data + '), reporting as unplayable');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: event.data,
              message: errorMessage,
              errorType: 'NOT_EMBEDDABLE'
            }));
            return;
          }
          
          // For other errors, also report as unplayable (no retries)
          console.log('Video error ' + event.data + ', reporting as unplayable');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIDEO_UNPLAYABLE',
            error: event.data,
            message: errorMessage,
            errorType: 'PLAYER_ERROR'
          }));
        }

        // Expose functions for React Native to call
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady) {
            console.log('Playing video');
            try {
              player.playVideo();
            } catch (error) {
              console.error('Error playing video:', error);
            }
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            console.log('Pausing video');
            try {
              player.pauseVideo();
            } catch (error) {
              console.error('Error pausing video:', error);
            }
          }
        };

        // Handle page errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          console.error('Page error:', msg, 'at', url, ':', lineNo);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIDEO_UNPLAYABLE',
            error: 'PAGE_ERROR',
            message: 'Page error: ' + msg,
            errorType: 'PAGE_ERROR'
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
    console.log('Video changed, resetting player state for:', videoId, youtubeUrl);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setRetryCount(0);
    setIsBuffering(false);
    setLastProgressTime(0);
    setStuckProgressCount(0);
    setIsRetrying(false);
    setIsMarkedInactive(false);
    progressValue.value = 0;
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (stuckCheckRef.current) {
      clearTimeout(stuckCheckRef.current);
      stuckCheckRef.current = null;
    }

    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }
  }, [videoId]);

  const injectJavaScript = useCallback((script: string) => {
    try {
      webviewRef.current?.injectJavaScript(script);
    } catch (error) {
      console.error('JavaScript injection failed:', error);
      handleVideoErrorInternal('Failed to control video player', 'INJECTION_FAILED');
    }
  }, []);

  const playVideo = useCallback(() => {
    injectJavaScript('window.playVideo && window.playVideo(); true;');
  }, [injectJavaScript]);

  const pauseVideo = useCallback(() => {
    injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
  }, [injectJavaScript]);

  const handleVideoErrorInternal = useCallback(async (errorMessage: string, errorType: string) => {
    // Prevent infinite re-renders by checking if already retrying
    if (isRetrying) {
      return;
    }

    console.log('Video error detected:', errorMessage, 'for video:', youtubeVideoId, 'type:', errorType);
    
    // Clear any existing timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    // Mark video as inactive in Supabase immediately
    if (youtubeVideoId && !isMarkedInactive) {
      await markVideoInactive(youtubeVideoId, errorType);
    }

    // Use video store error handling for queue management
    await handleVideoError(videoId, errorType);

    // Set a timeout to skip video if error persists
    const timeout = setTimeout(() => {
      showToast(`Video unavailable, skipping... (${errorType})`);
      onVideoUnplayable();
    }, errorTimeoutDuration);

    setErrorTimeout(timeout);
    setPlayerError(errorMessage);
    setIsRetrying(true);
  }, [isRetrying, errorTimeout, onVideoUnplayable, youtubeVideoId, errorTimeoutDuration, handleVideoError, videoId, isMarkedInactive]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message received:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          console.log('Player ready message received for video:', data.videoId || youtubeVideoId);
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
          console.warn('Player warning:', data.message);
          // Don't treat warnings as errors, just log them
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            console.log('Video started playing:', youtubeVideoId);
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
            console.log('Video buffering...');
          }
          break;
          
        case 'PROGRESS_UPDATE':
          const newTime = data.currentTime;
          
          // Check for stuck progress
          if (Math.abs(newTime - lastProgressTime) < 0.1 && newTime > 0) {
            setStuckProgressCount(prev => {
              const newCount = prev + 1;
              if (newCount >= maxStuckCount) {
                console.log('Progress stuck, attempting to resume playback');
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
            console.log('Video completed:', youtubeVideoId);
            setIsCompleted(true);
            setIsPlaying(false);
            setIsBuffering(false);
            
            // Silent coin animation
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            // Complete video without popup - instant transition
            setTimeout(() => {
              onVideoComplete();
            }, 100); // Reduced delay for instant looping
          }
          break;

        case 'VIDEO_ENDED_EARLY':
          // Video ended before user-set duration, still award coins
          if (!isCompleted) {
            console.log('Video ended early:', youtubeVideoId);
            setIsCompleted(true);
            setIsPlaying(false);
            setIsBuffering(false);
            
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              onVideoComplete();
            }, 100); // Instant transition
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
          console.log('Video unplayable received:', data.message, 'for video:', youtubeVideoId, 'errorType:', data.errorType);
          handleVideoErrorInternal(data.message || 'Video unplayable', data.errorType || 'UNPLAYABLE');
          break;
          
        case 'PLAYER_ERROR':
          console.log('Player error received:', data.message, 'for video:', youtubeVideoId);
          handleVideoErrorInternal(data.message || 'Video playback error', data.errorType || 'PLAYER_ERROR');
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      handleVideoErrorInternal('Failed to parse video message', 'MESSAGE_PARSE_ERROR');
    }
  }, [duration, hasStarted, isCompleted, onVideoComplete, handleVideoErrorInternal, errorTimeout, youtubeVideoId, lastProgressTime, maxStuckCount, playVideo]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

  const handleSkip = useCallback(() => {
    // Silent skip without confirmation for seamless experience
    pauseVideo();
    onVideoSkip();
  }, [pauseVideo, onVideoSkip]);

  const handleWebViewLoad = useCallback(() => {
    console.log('WebView loaded for video:', youtubeVideoId);
    // Video will auto-play via iframe settings
  }, [youtubeVideoId]);

  const handleWebViewError = useCallback(() => {
    console.log('WebView error for video:', youtubeVideoId);
    handleVideoErrorInternal('Failed to load video player', 'WEBVIEW_ERROR');
  }, [handleVideoErrorInternal, youtubeVideoId]);

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
    console.error('Could not extract video ID from:', youtubeUrl);
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
        {!isLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.loadingText}>Loading video...</Text>
            <Text style={styles.loadingSubtext}>Video ID: {youtubeVideoId}</Text>
            <Text style={styles.loadingSubtext}>Runtime validation enabled</Text>
          </View>
        )}
        
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent }}
          style={[styles.webview, !isLoaded && styles.hidden]}
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
        />
        
        {/* Progress Bar Overlay */}
        <View style={styles.progressOverlay}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>
        
        {/* Error Overlay */}
        {playerError && (
          <View style={styles.errorOverlay}>
            <AlertTriangle color="#FF4757" size={24} />
            <Text style={styles.errorText}>Loading next video...</Text>
            <Text style={styles.errorSubtext}>{playerError}</Text>
          </View>
        )}

        {/* Buffering Overlay */}
        {isBuffering && isLoaded && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.bufferingText}>Buffering...</Text>
          </View>
        )}
      </View>

      {/* Minimal Video Info */}
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

        {/* Minimal Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={!isLoaded || playerError !== null}
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
        </View>
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
});