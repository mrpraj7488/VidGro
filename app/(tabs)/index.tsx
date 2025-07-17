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
import { Play, Pause, SkipForward, Clock, ExternalLink } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import GlobalHeader from '@/components/GlobalHeader';
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
    handleVideoError,
    clearQueue
  } = useVideoStore();

  // State management
  const [menuVisible, setMenuVisible] = useState(false);
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
  const targetDuration = currentVideo?.duration_seconds || 30; // Use video's selected duration
  const coinReward = currentVideo?.coin_reward || 10; // Use video's calculated coin reward
  const maxRetries = 1;
  const loadingTimeoutDuration = 3000;

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

  // Create HTML content for YouTube iframe with enhanced popup suppression
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
                'widget_referrer': window.location.origin
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
                  player.playVideo();
                } catch (error) {
                  // Error handled silently
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
            
          const completionThreshold = targetDuration * 0.95; // 95% completion threshold
          if (currentTime >= completionThreshold && !hasEarnedCoins) {
              type: 'VIDEO_COMPLETED',
              reason: 'natural_end',
              shouldAwardCoins: currentTime >= targetDuration,
              currentTime: currentTime,
              coinsEarned: ${currentVideo?.coin_reward || 3},
              completionThreshold: completionThreshold
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
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'COINS_EARNED',
                    currentTime: currentTime,
                    coinsEarned: ${currentVideo?.coin_reward || 3}
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
            popupSuppressed = true;
          }
        };

        // Tab visibility control
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
        };

        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            window.pauseVideo();
          } else if (isTabVisible && autoPlayEnabled) {
            setTimeout(function() {
              window.playVideo();
            }, 500);
          }
        });

        // Security: Block navigation
        window.open = function() {
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
      setIsTabFocused(true);
      
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
      }

      return () => {
        setIsTabFocused(false);
        
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(false); true;');
        }
      };
    }, [])
  );

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (isTabFocused && webviewRef.current) {
          webviewRef.current.injectJavaScript('window.setTabVisibility && window.setTabVisibility(true); true;');
        }
      } else if (nextAppState.match(/inactive|background/)) {
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
  }, [appState, isTabFocused]);

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
    setCoinUpdateInProgress(false);
    progressValue.value = 0;
    
    // Move to next video instantly
    skipTimeoutRef.current = setTimeout(() => {
      moveToNextVideo();
      
      // Fetch more videos if queue is running low
      if (user && videoQueue.length <= 2) {
        fetchVideos(user.id);
      }
      
      setIsSkipping(false);
    }, 200); // Minimal delay for smooth transition
  }, [isSkipping, moveToNextVideo, user, videoQueue.length, fetchVideos]);

  // Enhanced award coins function with retry mechanism
  const awardCoins = useCallback(async () => {
    if (!user || !currentVideo) {
      console.log('🪙 Cannot award coins - missing user or video');
      return;
    }
    
    if (coinsEarned || coinUpdateInProgress || coinsAwarded) {
      console.log(`🪙 Coins already processed - coinsEarned:${coinsEarned}, coinUpdateInProgress:${coinUpdateInProgress}, coinsAwarded:${coinsAwarded}`);
      return;
    }
    
    console.log(`🪙 Starting coin award process - currentTime:${currentTime}, targetDuration:${targetDuration}`);
    
    // Check if user watched enough of the video (with 2-second tolerance for timing precision)
    const watchTimeThreshold = Math.max(targetDuration - 2, targetDuration * 0.95); // 95% or 2 seconds tolerance
    if (currentTime < watchTimeThreshold) {
      console.log(`🪙 Insufficient watch time - watched:${currentTime}s, required:${watchTimeThreshold}s (target:${targetDuration}s)`);
      return;
    }
    
    console.log(`🪙 Watch time sufficient - watched:${currentTime}s, threshold:${watchTimeThreshold}s, target:${targetDuration}s`);
    
    setCoinUpdateInProgress(true);
    setCoinsEarned(true);
    setCoinsAwarded(true);
    
    try {
      console.log(`💰 Starting coin award process for video ${currentVideo.id}, duration: ${Math.floor(currentTime)}s`);
      
      // SIMPLIFIED AND RELIABLE COIN AWARDING PROCESS
      
      // Step 1: Calculate coins based on duration
      const calculatedCoins = calculateCoinsByDuration(currentVideo.duration_seconds);
      console.log(`💰 Calculated coins for ${currentVideo.duration_seconds}s video: ${calculatedCoins}`);
      
      // Step 2: Check if user already watched this video
      const { data: existingView, error: checkError } = await supabase
        .from('video_views')
        .select('id')
        .eq('video_id', currentVideo.id)
        .eq('viewer_id', user.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('❌ Error checking existing view:', checkError);
        throw checkError;
      }
      
      if (existingView) {
        console.log('⚠️ User already watched this video, skipping coin award');
        return;
      }
      
      // Step 3: Get current coin balance
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error getting current profile:', profileError);
        throw profileError;
      }
      
      const oldBalance = currentProfile.coins;
      const newBalance = oldBalance + calculatedCoins;
      
      console.log(`💰 Coin update: ${oldBalance} + ${calculatedCoins} = ${newBalance}`);
      
      // Step 4: Create video view record
      const { error: viewError } = await supabase
        .from('video_views')
        .insert({
          video_id: currentVideo.id,
          viewer_id: user.id,
          watched_duration: Math.floor(Math.max(currentTime, targetDuration)), // Ensure we record at least target duration
          completed: true,
          coins_earned: calculatedCoins
        });
      
      if (viewError) {
        console.error('❌ Error creating video view:', viewError);
        throw viewError;
      }
      
      console.log('✅ Video view record created successfully');
      
      // Step 5: Update user coins directly
      const { error: coinError } = await supabase
        .from('profiles')
        .update({ 
          coins: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (coinError) {
        console.error('❌ Error updating coins:', coinError);
        throw coinError;
      }
      
      console.log('✅ Coins updated successfully in database');
      
      // Step 6: Create transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: calculatedCoins,
          transaction_type: 'video_watch',
          description: `Watched ${currentVideo.duration_seconds}s video: ${currentVideo.title} (${calculatedCoins} coins)`,
          reference_id: currentVideo.id
        });
      
      if (transactionError) {
        console.error('❌ Error creating transaction:', transactionError);
        // Don't throw here as coins were already awarded
      } else {
        console.log('✅ Transaction record created successfully');
      }
      
      // Step 7: Update video view count
      const { error: videoUpdateError } = await supabase
        .from('videos')
        .update({ 
          views_count: supabase.sql`views_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentVideo.id);
      
      if (videoUpdateError) {
        console.error('❌ Error updating video view count:', videoUpdateError);
        // Don't throw here as coins were already awarded
      } else {
        console.log('✅ Video view count updated successfully');
      }
      
      // Step 8: Force immediate profile refresh
      await refreshProfile();
      
      // Step 9: Show success feedback
      coinBounce.value = withSpring(1.2, {
        damping: 15,
        stiffness: 150,
      }, () => {
        coinBounce.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      });
      
      showToast(`+${calculatedCoins} coins earned!`);
      
      console.log(`💰 COIN AWARD COMPLETED: User ${user.id} earned ${calculatedCoins} coins for video ${currentVideo.id}`);
      
      // Step 10: Clear queue and move to next video after delay
      clearQueue();
      setTimeout(() => {
        handleInstantSkip('Video completed - moving to next');
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error awarding coins:', error);
      setCoinsEarned(false);
      setCoinsAwarded(false);
      
      try {
        await refreshProfile();
      } catch (refreshError) {
        console.error('❌ Failed to refresh profile after error:', refreshError);
      }
    } finally {
      setCoinUpdateInProgress(false);
    }
  }, [user, currentVideo, coinsEarned, coinUpdateInProgress, coinsAwarded, refreshProfile, currentTime, showToast, clearQueue, handleInstantSkip, targetDuration]);

  // Helper function to calculate coins based on duration (matching database function)
  const calculateCoinsByDuration = (durationSeconds: number): number => {
    if (durationSeconds >= 540) return 200;  // 540s = 200 coins
    if (durationSeconds >= 480) return 150;  // 480s = 150 coins
    if (durationSeconds >= 420) return 130;  // 420s = 130 coins
    if (durationSeconds >= 360) return 100;  // 360s = 100 coins
    if (durationSeconds >= 300) return 90;   // 300s = 90 coins
    if (durationSeconds >= 240) return 70;   // 240s = 70 coins
    if (durationSeconds >= 180) return 55;   // 180s = 55 coins
    if (durationSeconds >= 150) return 50;   // 150s = 50 coins
    if (durationSeconds >= 120) return 45;   // 120s = 45 coins
    if (durationSeconds >= 90) return 35;    // 90s = 35 coins
    if (durationSeconds >= 60) return 25;    // 60s = 25 coins
    if (durationSeconds >= 45) return 15;    // 45s = 15 coins
    if (durationSeconds >= 30) return 10;    // 30s = 10 coins
    return 5;  // Default for very short durations
  };

  // WebView message handler with enhanced coin logic
  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'PLAYER_READY_SUCCESS':
          setIsVideoLoaded(true);
          setPlayerError(null);
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
          } else if (data.state === 0) { // ENDED
            // Inject stopVideo to suppress popup
            if (webviewRef.current) {
              webviewRef.current.injectJavaScript('window.stopVideo && window.stopVideo(); true;');
            }
          }
          break;
          
        case 'PROGRESS_UPDATE':
          setCurrentTime(data.currentTime);
          const progress = Math.min(data.currentTime / targetDuration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          
          // Check for completion with tolerance (95% of target duration)
          const completionThreshold = targetDuration * 0.95;
          if (data.currentTime >= completionThreshold && !coinsEarned && !coinUpdateInProgress && !coinsAwarded) {
            console.log(`🪙 Triggering coin award from PROGRESS_UPDATE - currentTime:${data.currentTime}, threshold:${completionThreshold}`);
            awardCoins();
          }
          break;
          
        case 'COINS_EARNED':
          console.log(`🪙 COINS_EARNED event: currentTime=${data.currentTime}, targetDuration=${targetDuration}, coinsEarned=${coinsEarned}, coinUpdateInProgress=${coinUpdateInProgress}`);
          if (!coinsEarned && !coinUpdateInProgress && !coinsAwarded) {
            console.log('🪙 Triggering coin award from COINS_EARNED event');
            awardCoins();
          } else {
            console.log(`🪙 Skipping coin award - coinsEarned:${coinsEarned}, coinUpdateInProgress:${coinUpdateInProgress}, coinsAwarded:${coinsAwarded}`);
          }
          break;
          
        case 'VIDEO_COMPLETED':
          console.log(`🎬 VIDEO_COMPLETED event: currentTime=${data.currentTime}, targetDuration=${targetDuration}, coinsEarned=${coinsEarned}, coinUpdateInProgress=${coinUpdateInProgress}`);
          // Award coins if video was watched for sufficient time and not already earned
          if (!coinsEarned && !coinUpdateInProgress && !coinsAwarded) {
            console.log('🎬 Triggering coin award from VIDEO_COMPLETED event');
            await awardCoins();
          } else {
            console.log(`🎬 Skipping coin award from VIDEO_COMPLETED - coinsEarned:${coinsEarned}, coinUpdateInProgress:${coinUpdateInProgress}, coinsAwarded:${coinsAwarded}`);
          }
          
          if (!videoCompleted) {
            setVideoCompleted(true);
            setIsPlaying(false);
            // Move to next video after brief delay to allow coin processing
            completionTimeoutRef.current = setTimeout(() => {
              handleInstantSkip('Video completed - natural end');
            }, 3000); // Allow more time for coin processing and queue updates
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
  }, [coinsEarned, coinsAwarded, targetDuration, videoCompleted, retryCount, maxRetries, handleInstantSkip, awardCoins]);

  const pauseVideo = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    }
  }, []);

  const playVideo = useCallback(() => {
    if (webviewRef.current && isTabFocused && appState === 'active') {
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
  }, [isTabFocused, appState]);

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
    handleInstantSkip('Manual skip');
  };

  const toggleAutoPlay = () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    
    // Update auto-skip setting in WebView
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`window.updateAutoSkip && window.updateAutoSkip(${newAutoPlay}); true;`);
    }
  };

  const openYouTubeVideo = () => {
    if (!currentVideo) return;
    
    const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.youtube_url}`;
    
    if (Platform.OS === 'web') {
      window.open(youtubeUrl, '_blank');
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
        <GlobalHeader title="VidGro" showCoinDisplay={true} />
        
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
        <GlobalHeader title="VidGro" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />
        
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>Loading next video...</Text>
          <ActivityIndicator size="large" color="#FF4757" style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader title="VidGro" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />

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
                <Text style={styles.coinEmoji}>🪙</Text>
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
            <TouchableOpacity style={styles.autoPlayContainer} onPress={openYouTubeVideo}>
              <ExternalLink color="#FF4757" size={16} />
              <Text style={styles.youtubeLabel}>Watch On YouTube</Text>
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
                (!isVideoLoaded || !isTabFocused) && styles.playButtonDisabled,
                !isPlaying && styles.playButtonPaused
              ]}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  coinEmoji: {
    fontSize: 18,
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
  youtubeLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#FF4757',
    fontWeight: '500',
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
    backgroundColor: '#800080',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(128, 0, 128, 0.3)',
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
  securityWarningText: {
    color: '#856404',
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});