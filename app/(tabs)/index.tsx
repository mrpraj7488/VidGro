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
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, RefreshCw, TriangleAlert as AlertTriangle, Menu, Play, Pause, SkipForward } from 'lucide-react-native';
import { useVideoStore } from '@/store/videoStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const coinBounce = useSharedValue(1);
  const progressValue = useSharedValue(0);
  const webviewRef = useRef<WebView>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVideo = getCurrentVideo();
  const maxRetries = 2;

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadVideoQueue();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && !currentVideo && !loading && !isLoadingQueue) {
      console.log('🔄 No current video, auto-reloading queue...');
      loadVideoQueue();
    }
  }, [currentVideo, user, loading, isLoadingQueue]);

  // Reset states when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('🎬 New video loaded:', currentVideo.youtube_url);
      resetVideoStates();
    }
  }, [currentVideo?.id]);

  const resetVideoStates = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsVideoLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setRetryCount(0);
    setLoadingTimeout(false);
    progressValue.value = 0;
    
    // Clear timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

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

  const extractVideoIdFromUrl = (videoIdOrUrl: string): string | null => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
      return videoIdOrUrl;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = videoIdOrUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const createOptimizedHtmlContent = (videoId: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          #player-container {
            width: 100%;
            height: 100%;
            position: relative;
            background: #000;
          }
          #player {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            z-index: 1000;
            font-size: 14px;
          }
          .error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff4757;
            text-align: center;
            z-index: 1000;
            font-size: 14px;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div id="player-container">
          <div id="loading" class="loading">Loading video...</div>
          <div id="error" class="error" style="display: none;"></div>
          <div id="player"></div>
        </div>
        
        <script>
          console.log('🎬 Initializing YouTube player for video ID: ${videoId}');
          
          var player;
          var isPlayerReady = false;
          var currentTime = 0;
          var maxDuration = ${currentVideo?.duration_seconds || 60};
          var hasCompleted = false;
          var autoPlayStarted = false;
          var progressCheckInterval;
          var loadingTimeoutId;
          var hasError = false;
          var retryAttempt = ${retryCount};
          var maxRetries = ${maxRetries};

          // Set 5-second loading timeout
          loadingTimeoutId = setTimeout(function() {
            if (!isPlayerReady && !hasError) {
              console.log('⏰ Loading timeout reached after 5 seconds');
              hasError = true;
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Video failed to load, skipping...';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOADING_TIMEOUT',
                message: 'Video failed to load within 5 seconds'
              }));
            }
          }, 5000);

          // Load YouTube IFrame API
          function loadYouTubeAPI() {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            tag.async = true;
            tag.onload = function() {
              console.log('📡 YouTube IFrame API script loaded');
            };
            tag.onerror = function() {
              console.error('❌ Failed to load YouTube IFrame API');
              hasError = true;
              clearTimeout(loadingTimeoutId);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Failed to load YouTube API';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'API_LOAD_ERROR',
                message: 'Failed to load YouTube IFrame API'
              }));
            };
            
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          }

          // Initialize API loading
          loadYouTubeAPI();

          function onYouTubeIframeAPIReady() {
            if (hasError) return;
            
            console.log('🚀 YouTube IFrame API ready, creating player');
            
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
                  'iv_load_policy': 3,
                  'enablejsapi': 1,
                  'origin': window.location.origin,
                  'playsinline': 1
                },
                events: {
                  'onReady': onPlayerReady,
                  'onStateChange': onPlayerStateChange,
                  'onError': onPlayerError
                }
              });
            } catch (error) {
              console.error('❌ Error creating YouTube player:', error);
              hasError = true;
              clearTimeout(loadingTimeoutId);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Failed to initialize player';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYER_INIT_ERROR',
                message: 'Failed to initialize YouTube player'
              }));
            }
          }

          function onPlayerReady(event) {
            if (hasError) return;
            
            console.log('✅ Player ready for video: ${videoId}');
            clearTimeout(loadingTimeoutId);
            isPlayerReady = true;
            document.getElementById('loading').style.display = 'none';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY',
              videoId: '${videoId}'
            }));
            
            // Auto-start playback after a short delay
            setTimeout(function() {
              if (player && player.playVideo && isPlayerReady && !hasError) {
                try {
                  console.log('▶️ Auto-play triggered for ${videoId}');
                  player.playVideo();
                } catch (error) {
                  console.error('❌ Error starting playback:', error);
                }
              }
            }, 1000);
          }

          function onPlayerStateChange(event) {
            if (hasError) return;
            
            var state = event.data;
            var stateNames = {
              '-1': 'UNSTARTED',
              '0': 'ENDED',
              '1': 'PLAYING',
              '2': 'PAUSED',
              '3': 'BUFFERING',
              '5': 'CUED'
            };
            
            console.log('🎵 Player state changed to:', stateNames[state] || state);
            
            if (state === 1) { // PLAYING
              console.log('🎬 Video started playing successfully');
              autoPlayStarted = true;
              startProgressTracking();
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STATE_CHANGE',
                state: state,
                stateName: stateNames[state],
                isPlaying: true
              }));
            } else if (state === 2) { // PAUSED
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STATE_CHANGE',
                state: state,
                stateName: stateNames[state],
                isPlaying: false
              }));
            } else if (state === 0) { // ENDED
              console.log('🏁 Video ended naturally');
              if (!hasCompleted) {
                hasCompleted = true;
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_COMPLETED',
                  currentTime: maxDuration
                }));
              }
            } else if (state === 3) { // BUFFERING
              console.log('⏳ Video buffering...');
              
              // Check for live video or stuck buffering
              setTimeout(function() {
                if (player && player.getPlayerState && player.getPlayerState() === 3) {
                  try {
                    var videoData = player.getVideoData();
                    if (videoData && videoData.isLive) {
                      console.log('🔴 Live video detected');
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'LIVE_VIDEO_DETECTED',
                        message: 'Live videos are not supported'
                      }));
                      return;
                    }
                  } catch (e) {
                    console.log('Could not check live status:', e);
                  }
                  
                  // Still buffering after 5 seconds
                  setTimeout(function() {
                    if (player && player.getPlayerState && player.getPlayerState() === 3) {
                      console.log('⚠️ Video stuck buffering, may be unplayable');
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'BUFFERING_TIMEOUT',
                        message: 'Video stuck buffering'
                      }));
                    }
                  }, 5000);
                }
              }, 3000);
            }
          }

          function onPlayerError(event) {
            console.error('❌ Player error:', event.data);
            clearTimeout(loadingTimeoutId);
            hasError = true;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            
            var errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not allowed to be played in embedded players',
              150: 'Video not allowed to be played in embedded players'
            };
            
            var errorMessage = errorMessages[event.data] || 'Video playback error';
            document.getElementById('error').textContent = errorMessage;
            
            // Check if we should retry
            if ((event.data === 5 || !event.data) && retryAttempt < maxRetries) {
              console.log('🔄 Retrying due to error:', errorMessage);
              setTimeout(function() {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'RETRY_NEEDED',
                  error: event.data,
                  message: errorMessage,
                  retryAttempt: retryAttempt + 1
                }));
              }, 2000);
            } else {
              var isEmbeddingError = event.data === 101 || event.data === 150 || event.data === 100;
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_UNPLAYABLE',
                error: event.data,
                message: errorMessage,
                isEmbeddingError: isEmbeddingError
              }));
            }
          }

          function startProgressTracking() {
            if (progressCheckInterval) {
              clearInterval(progressCheckInterval);
            }
            
            console.log('⏱️ Starting progress tracking');
            
            progressCheckInterval = setInterval(function() {
              if (isPlayerReady && !hasCompleted && autoPlayStarted) {
                currentTime += 1;
                
                if (currentTime >= maxDuration && !hasCompleted) {
                  hasCompleted = true;
                  console.log('🎯 Video completed at', currentTime, 'seconds');
                  if (progressCheckInterval) {
                    clearInterval(progressCheckInterval);
                  }
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'VIDEO_COMPLETED',
                    currentTime: currentTime
                  }));
                } else if (currentTime < maxDuration) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PROGRESS_UPDATE',
                    currentTime: currentTime,
                    progress: (currentTime / maxDuration) * 100
                  }));
                }
              }
            }, 1000);
          }

          // Control functions
          window.playVideo = function() {
            if (isPlayerReady && player && player.playVideo && !hasError) {
              try {
                autoPlayStarted = true;
                console.log('▶️ Manual play triggered');
                player.playVideo();
              } catch (error) {
                console.error('❌ Error in manual play:', error);
              }
            }
          };

          window.pauseVideo = function() {
            if (isPlayerReady && player && player.pauseVideo && !hasError) {
              try {
                console.log('⏸️ Manual pause triggered');
                player.pauseVideo();
              } catch (error) {
                console.error('❌ Error in manual pause:', error);
              }
            }
          };

          // Handle page errors
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('❌ Page error:', msg);
            hasError = true;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAGE_ERROR',
              message: 'Page error: ' + msg
            }));
            return true;
          };

          // Cleanup on page unload
          window.addEventListener('beforeunload', function() {
            if (progressCheckInterval) {
              clearInterval(progressCheckInterval);
            }
            if (loadingTimeoutId) {
              clearTimeout(loadingTimeoutId);
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || !profile) {
      console.error('❌ Missing required data for completing video');
      return;
    }

    try {
      console.log('🎯 Completing video silently:', currentVideo.youtube_url);

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

      console.log('✅ Video completion processed successfully');

      await refreshProfile();

      coinBounce.value = withTiming(1.3, { damping: 8 }, () => {
        coinBounce.value = withTiming(1);
      });

      setTimeout(() => {
        console.log('🔄 Moving to next video after completion...');
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
      }, 100);

    } catch (error: any) {
      console.error('❌ Error completing video:', error);
      setError(error.message || 'Failed to complete video. Please try again.');
    }
  };

  const handleVideoSkip = () => {
    console.log('⏭️ Skipping video (user choice)');
    showToast('Skipped video');
    
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

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 WebView message received:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          console.log('✅ Player ready message received for video:', data.videoId);
          setIsVideoLoaded(true);
          setPlayerError(null);
          setLoadingTimeout(false);
          break;
          
        case 'STATE_CHANGE':
          console.log('🎵 Video state change:', data.stateName, 'isPlaying:', data.isPlaying);
          
          if (data.state === 1) { // PLAYING
            console.log('▶️ Video started playing, starting progress tracking');
            setIsPlaying(true);
            if (!hasStarted) {
              setHasStarted(true);
            }
            startProgressTracking();
          } else if (data.state === 2) { // PAUSED
            console.log('⏸️ Video paused');
            setIsPlaying(false);
            stopProgressTracking();
          }
          break;
          
        case 'PROGRESS_UPDATE':
          const newTime = data.currentTime;
          setCurrentTime(newTime);
          const progress = Math.min(newTime / (currentVideo?.duration_seconds || 60), 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'VIDEO_COMPLETED':
          if (!isCompleted) {
            console.log('🎯 Video completed:', currentVideo?.youtube_url);
            setIsCompleted(true);
            setIsPlaying(false);
            stopProgressTracking();
            
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              handleVideoComplete();
            }, 100);
          }
          break;
          
        case 'LOADING_TIMEOUT':
          console.log('⏰ Loading timeout detected');
          setLoadingTimeout(true);
          showToast('Video failed to load, skipping...');
          setTimeout(() => {
            handleVideoUnplayable();
          }, 2000);
          break;
          
        case 'RETRY_NEEDED':
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying video load (attempt ${data.retryAttempt})`);
            showToast(`Retrying... (${data.retryAttempt}/${maxRetries})`);
            setRetryCount(data.retryAttempt);
            
            setTimeout(() => {
              if (webviewRef.current) {
                webviewRef.current.reload();
              }
            }, 2000);
          } else {
            showToast('Video unavailable, skipping...');
            setTimeout(() => {
              handleVideoUnplayable();
            }, 2000);
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
        case 'LIVE_VIDEO_DETECTED':
        case 'BUFFERING_TIMEOUT':
          console.log('🚨 Video unplayable:', data.message);
          showToast('Video unavailable, skipping...');
          setTimeout(() => {
            handleVideoUnplayable();
          }, 2000);
          break;
          
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
        case 'PAGE_ERROR':
          console.log('❌ Critical error:', data.message);
          setPlayerError(data.message);
          setTimeout(() => {
            handleVideoUnplayable();
          }, 3000);
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  }, [currentVideo, hasStarted, isCompleted, retryCount, maxRetries]);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (isPlaying && !isCompleted) {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const progress = Math.min(newTime / (currentVideo?.duration_seconds || 60), 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });

          if (newTime >= (currentVideo?.duration_seconds || 60) && !isCompleted) {
            console.log('🎯 Video completion detected via progress tracker');
            setIsCompleted(true);
            setIsPlaying(false);
            stopProgressTracking();
            
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              handleVideoComplete();
            }, 100);
          }

          return newTime;
        });
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (webviewRef.current) {
      if (isPlaying) {
        webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
      } else {
        webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
      }
    }
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

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

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

  const youtubeVideoId = currentVideo ? extractVideoIdFromUrl(currentVideo.youtube_url) : null;

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
      {currentVideo && youtubeVideoId && (
        <View style={styles.videoSection}>
          {!isVideoLoaded && !loadingTimeout && !playerError && (
            <View style={styles.videoLoadingContainer}>
              <ActivityIndicator size="large" color="#FF4757" />
              <Text style={styles.videoLoadingText}>Loading video...</Text>
              <Text style={styles.videoLoadingSubtext}>Video ID: {youtubeVideoId}</Text>
              {retryCount > 0 && (
                <Text style={styles.videoLoadingSubtext}>Retry attempt: {retryCount}/{maxRetries}</Text>
              )}
            </View>
          )}
          
          <WebView
            ref={webviewRef}
            source={{ html: createOptimizedHtmlContent(youtubeVideoId) }}
            style={[styles.webview, !isVideoLoaded && styles.hidden]}
            onMessage={handleWebViewMessage}
            onLoad={() => {
              console.log('📱 WebView loaded for video:', youtubeVideoId);
              // Set a backup timeout for loading
              loadingTimeoutRef.current = setTimeout(() => {
                if (!isVideoLoaded) {
                  console.log('⏰ WebView loading timeout');
                  setLoadingTimeout(true);
                  showToast('Video failed to load, skipping...');
                  setTimeout(() => {
                    handleVideoUnplayable();
                  }, 2000);
                }
              }, 8000);
            }}
            onError={() => {
              console.log('❌ WebView error for video:', youtubeVideoId);
              setPlayerError('Failed to load video player');
              setTimeout(() => {
                handleVideoUnplayable();
              }, 3000);
            }}
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
          
          {/* Progress Bar */}
          <View style={styles.progressOverlay}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
          </View>
          
          {/* Error Overlay */}
          {(playerError || loadingTimeout) && (
            <View style={styles.errorOverlay}>
              <AlertTriangle color="#FF4757" size={24} />
              <Text style={styles.errorOverlayText}>
                {loadingTimeout ? 'Video failed to load, skipping...' : 'Loading next video...'}
              </Text>
              <Text style={styles.errorOverlaySubtext}>{playerError}</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.youtubeButton}
            onPress={openInYouTube}
          >
            <Text style={styles.youtubeButtonText}>Open on Youtube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity
              style={[styles.toggleSwitch, autoPlay && styles.toggleSwitchActive]}
              onPress={() => setAutoPlay(!autoPlay)}
            >
              <View style={[styles.toggleThumb, autoPlay && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {currentVideo && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentVideo.duration_seconds}</Text>
              <Text style={styles.statLabel}>Seconds to get coins</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentVideo.coin_reward}</Text>
              <Text style={styles.statLabel}>Coins will be added</Text>
            </View>
          </View>
        )}

        {/* Video Controls */}
        <View style={styles.videoControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handlePlayPause}
            disabled={!isVideoLoaded || playerError !== null || loadingTimeout}
          >
            {isPlaying ? (
              <Pause color="#FF4757" size={20} />
            ) : (
              <Play color="#FF4757" size={20} />
            )}
            <Text style={styles.controlButtonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleVideoSkip}>
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
    height: isVerySmallScreen 
      ? screenHeight * 0.35 
      : isSmallScreen 
        ? screenHeight * 0.4 
        : screenHeight * 0.45,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
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
  videoLoadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
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
  errorOverlayText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorOverlaySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingTop: isVerySmallScreen ? 16 : 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 20 : 30,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  youtubeButtonText: {
    fontSize: isVerySmallScreen ? 12 : 14,
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
    backgroundColor: '#FF4757',
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
    marginBottom: isVerySmallScreen ? 30 : 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: isVerySmallScreen ? 32 : isSmallScreen ? 36 : 42,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  statLabel: {
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 20,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isVerySmallScreen ? 16 : 20,
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#FF4757',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  skipButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 1,
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