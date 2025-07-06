import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, RefreshCw, ExternalLink, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useVideoStore } from '@/store/videoStore';

interface SeamlessVideoPlayerProps {
  videoId: string; // Database video ID
  youtubeUrl: string; // YouTube video ID from database
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
  onVideoUnplayable: () => void;
}

export default function SeamlessVideoPlayer({
  videoId,
  youtubeUrl,
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMarkedInactive, setIsMarkedInactive] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerValidated, setPlayerValidated] = useState(false);
  const [playabilityConfirmed, setPlayabilityConfirmed] = useState(false);
  const [validationStage, setValidationStage] = useState<string>('Initializing...');
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stuckCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { handleVideoError, markVideoAsUnplayable, addToBlacklist } = useVideoStore();
  const maxRetries = 0; // No retries for faster skipping

  // Extract YouTube video ID from the youtubeUrl (which contains the video ID)
  const youtubeVideoId = youtubeUrl;
  const errorTimeoutDuration = 8000; // 8 seconds timeout for errors
  let errorTimeout: NodeJS.Timeout | null = null;

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  // Mark video as inactive in Supabase (only for confirmed unplayable videos)
  const markVideoInactive = useCallback(async (youtubeVideoId: string, reason: string, isUnplayable: boolean = true) => {
    if (isMarkedInactive) return; // Prevent duplicate calls
    
    try {
      setIsMarkedInactive(true);
      console.log(`🚨 ${isUnplayable ? 'Marking' : 'NOT marking'} video ${youtubeVideoId} as inactive due to: ${reason}`);
      
      if (isUnplayable) {
        // Add to local blacklist immediately to prevent re-fetching
        addToBlacklist(youtubeVideoId);
        
        const { error } = await supabase
          .from('videos')
          .update({ 
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('youtube_url', youtubeVideoId); // youtube_url field contains the video ID
        
        if (error) {
          console.error('❌ Error marking video as inactive:', error);
        } else {
          console.log(`✅ Video ${youtubeVideoId} marked as inactive in Supabase`);
          showToast(`Removed unplayable video: ${youtubeVideoId}`);
        }
      } else {
        console.log(`✅ Video ${youtubeVideoId} is playable, skipping without removal`);
        showToast('Skipped playable video');
      }
      
    } catch (error) {
      console.error('❌ Error in markVideoInactive:', error);
    }
  }, [isMarkedInactive, addToBlacklist]);

  // Optimized HTML content with reduced message frequency
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
        .loading, .error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
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
        console.log('Initializing optimized YouTube player for video ID: ${youtubeVideoId}');
        
        function updateValidationStage(stage) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VALIDATION_STAGE',
            stage: stage
          }));
        }
        
        updateValidationStage('Loading YouTube API...');
        
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        tag.onload = function() {
          console.log('YouTube API script loaded successfully');
          updateValidationStage('YouTube API loaded');
        };
        tag.onerror = function() {
          console.error('Failed to load YouTube API script');
          updateValidationStage('❌ Failed to load YouTube API');
        };

        var player;
        var isPlayerReady = false;
        var isBuffering = false;
        var maxDuration = ${duration};
        var hasCompleted = false;
        var lastReportedTime = 0;
        var stuckCount = 0;
        var playerValidated = false;
        var playabilityConfirmed = false;
        var progressUpdateInterval;

        function onYouTubeIframeAPIReady() {
          console.log('YouTube API ready, creating optimized player for video ID: ${youtubeVideoId}');
          updateValidationStage('Creating player...');
          
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${youtubeVideoId}',
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
                'start': 0,
                'mute': 0,
                'loop': 0,
                'quality': 'small' // Start with lower quality for faster loading
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            console.error('Error creating player:', error);
            updateValidationStage('❌ Failed to create player');
          }
        }

        function onPlayerReady(event) {
          console.log('Player ready for video ID: ${youtubeVideoId}');
          updateValidationStage('Player ready');
          document.getElementById('loading').style.display = 'none';
          isPlayerReady = true;
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${youtubeVideoId}'
          }));
          
          // Start validation process with delay
          setTimeout(function() {
            performRuntimeValidation();
          }, 1000);
          
          // Start optimized progress tracking (less frequent updates)
          startProgressTracking();
        }

        // Enhanced runtime validation function
        function performRuntimeValidation() {
          if (!isPlayerReady || playerValidated) return;
          
          updateValidationStage('Validating playability...');
          
          try {
            // Test basic player functions
            var videoData = player.getVideoData();
            if (!videoData || !videoData.title) {
              throw new Error('No video data available');
            }
            
            updateValidationStage('Testing playback...');
            
            // Attempt to play for validation
            setTimeout(function() {
              try {
                player.playVideo();
                
                // Check if playback started after delay
                setTimeout(function() {
                  try {
                    var state = player.getPlayerState();
                    var currentTime = player.getCurrentTime();
                    
                    if (state === 1 || currentTime > 0) { // Playing or has progressed
                      playerValidated = true;
                      playabilityConfirmed = true;
                      updateValidationStage('✅ Player validated as playable');
                      
                      // Pause after validation
                      player.pauseVideo();
                      
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'PLAYER_VALIDATED',
                        isPlayable: true
                      }));
                    } else {
                      throw new Error('Video did not start playing');
                    }
                  } catch (error) {
                    console.error('Playback validation failed:', error);
                    updateValidationStage('❌ Video not playable');
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'VIDEO_UNPLAYABLE',
                      error: 'PLAYBACK_FAILED',
                      message: 'Video failed playback test',
                      errorType: 'PLAYBACK_FAILED',
                      isEmbeddingError: false
                    }));
                  }
                }, 2000);
                
              } catch (error) {
                console.error('Error during playback test:', error);
                updateValidationStage('❌ Playback test failed');
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_UNPLAYABLE',
                  error: 'PLAYBACK_FAILED',
                  message: 'Could not test video playback',
                  errorType: 'PLAYBACK_FAILED',
                  isEmbeddingError: false
                }));
              }
            }, 1000);
            
          } catch (error) {
            console.error('Runtime validation error:', error);
            updateValidationStage('❌ Validation failed');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: 'VALIDATION_FAILED',
              message: error.message || 'Video validation failed',
              errorType: 'VALIDATION_FAILED',
              isEmbeddingError: false
            }));
          }
        }

        function startProgressTracking() {
          if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
          }
          
          // Reduced frequency: update every 2 seconds instead of every 500ms
          progressUpdateInterval = setInterval(function() {
            if (isPlayerReady && player && player.getCurrentTime) {
              try {
                var newTime = player.getCurrentTime();
                
                // Only send updates if time has changed significantly (0.5 second threshold)
                if (Math.abs(newTime - lastReportedTime) >= 0.5 || newTime === 0) {
                  lastReportedTime = newTime;
                  
                  // Limit to user-set duration
                  var currentTime = Math.min(newTime, maxDuration);
                  
                  if (currentTime >= maxDuration && !hasCompleted) {
                    hasCompleted = true;
                    player.pauseVideo();
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'VIDEO_COMPLETED',
                      currentTime: currentTime
                    }));
                    clearInterval(progressUpdateInterval);
                  } else if (currentTime < maxDuration) {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'PROGRESS_UPDATE',
                      currentTime: currentTime,
                      progress: (currentTime / maxDuration) * 100
                    }));
                  }
                }
              } catch (error) {
                console.error('Progress tracking error:', error);
              }
            }
          }, 2000); // Update every 2 seconds for better performance
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
          
          // Only send state changes for important states
          if (state === 1 || state === 2 || state === 3) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              state: state,
              stateName: stateNames[state] || 'UNKNOWN'
            }));
          }
          
          // Special handling for playing state
          if (state === 1 && !hasCompleted) { // PLAYING
            console.log('Video started playing: ${youtubeVideoId}');
          }
        }

        function onPlayerError(event) {
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not allowed to be played in embedded players',
            150: 'Video not allowed to be played in embedded players'
          };
          
          var errorMessage = errorMessages[event.data] || 'Unknown player error';
          var isEmbeddingError = event.data === 101 || event.data === 150;
          
          console.error('YouTube player error:', errorMessage, 'Code:', event.data);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIDEO_UNPLAYABLE',
            error: event.data,
            message: errorMessage,
            errorType: isEmbeddingError ? 'NOT_EMBEDDABLE' : 'PLAYER_ERROR',
            isEmbeddingError: isEmbeddingError
          }));
        }

        // Expose functions for React Native to call
        window.playVideo = function() {
          if (player && player.playVideo && isPlayerReady && playabilityConfirmed) {
            player.playVideo();
          }
        };

        window.pauseVideo = function() {
          if (player && player.pauseVideo && isPlayerReady) {
            player.pauseVideo();
          }
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
          if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Reset states when video changes
  useEffect(() => {
    console.log(`Processing video ID/URL: ${youtubeVideoId}`);
    
    if (youtubeVideoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(youtubeVideoId)) {
      console.log(`Already a video ID: ${youtubeVideoId}`);
    } else {
      console.log(`Processing URL: ${youtubeVideoId}`);
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setIsRetrying(false);
    setIsMarkedInactive(false);
    setIsBuffering(false);
    setPlayerValidated(false);
    setPlayabilityConfirmed(false);
    setValidationStage('Initializing...');
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
      errorTimeout = null;
    }
  }, [youtubeVideoId]);

  // Enhanced error handling with proper video ID passing
  const handleVideoErrorInternal = useCallback(async (errorMessage: string, errorType: string, isEmbeddingError: boolean = false) => {
    if (isRetrying || !youtubeVideoId) return;

    console.log(`🚨 Video error detected: ${errorMessage} for video: ${youtubeVideoId} type: ${errorType} isEmbeddingError: ${isEmbeddingError}`);

    // Clear any existing error timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      errorTimeout = null;
    }

    // Determine if this should mark video as inactive
    const criticalErrors = ['NOT_EMBEDDABLE', 'VALIDATION_FAILED', 'NO_VIDEO_DATA'];
    const shouldMarkInactive = criticalErrors.includes(errorType) || isEmbeddingError;

    // Set error timeout for non-critical errors
    if (!shouldMarkInactive) {
      errorTimeout = setTimeout(() => {
        console.log('⏰ Error timeout reached, treating as unplayable');
        handleVideoErrorInternal(errorMessage, 'TIMEOUT_ERROR', false);
      }, errorTimeoutDuration);
    }

    // Use video store error handling for queue management - FIXED: Pass youtubeVideoId instead of videoId
    if (shouldMarkInactive && youtubeVideoId) {
      await handleVideoError(youtubeVideoId, errorType);
    }

    // Always call onVideoUnplayable for any error to move to next video
    setTimeout(() => {
      onVideoUnplayable();
    }, 1000);

    setPlayerError(errorMessage);
    setIsRetrying(true);
  }, [isRetrying, errorTimeout, onVideoUnplayable, onVideoSkip, youtubeVideoId, errorTimeoutDuration, handleVideoError, isMarkedInactive, markVideoInactive]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'VALIDATION_STAGE':
          setValidationStage(data.stage);
          break;
          
        case 'PLAYER_READY':
          console.log('Player ready message received for video:', data.videoId);
          setIsLoaded(true);
          setPlayerError(null);
          break;

        case 'PLAYER_VALIDATED':
          console.log(`✅ Player validated as playable for video: ${youtubeVideoId}`);
          setPlayerValidated(true);
          setPlayabilityConfirmed(data.isPlayable);
          break;

        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
            if (!hasStarted) {
              setHasStarted(true);
            }
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          } else if (data.state === 3) { // BUFFERING
            setIsBuffering(true);
            console.log('Video buffering...');
          } else {
            setIsBuffering(false);
          }
          break;

        case 'PROGRESS_UPDATE':
          const newTime = data.currentTime;
          
          // Throttle progress updates to reduce re-renders
          if (Math.abs(newTime - currentTime) >= 0.5 || newTime === 0) {
            setCurrentTime(newTime);
            
            const progress = Math.min(newTime / duration, 1);
            progressValue.value = withTiming(progress, {
              duration: 200, // Faster animation
              easing: Easing.out(Easing.quad),
            });
          }
          break;

        case 'VIDEO_COMPLETED':
          console.log(`🎯 Video completion detected for: ${youtubeVideoId}`);
          if (!isCompleted) {
            setIsCompleted(true);
            setIsPlaying(false);
            
            coinBounce.value = withTiming(1.3, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              onVideoComplete();
            }, 500); // Reduced delay for faster completion
          }
          break;

        case 'VIDEO_UNPLAYABLE':
          console.log(`Video unplayable received: ${data.message} for video: ${youtubeVideoId} errorType: ${data.errorType} isEmbeddingError: ${data.isEmbeddingError}`);
          handleVideoErrorInternal(data.message, data.errorType, data.isEmbeddingError);
          break;

        default:
          // Ignore unknown message types to reduce noise
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [currentTime, duration, hasStarted, isCompleted, onVideoComplete, handleVideoErrorInternal, youtubeVideoId]);

  const handlePlayPause = useCallback(() => {
    if (!playabilityConfirmed) {
      console.log('⚠️ Video not yet confirmed as playable');
      return;
    }

    const script = isPlaying 
      ? 'window.pauseVideo && window.pauseVideo(); true;'
      : 'window.playVideo && window.playVideo(); true;';
    
    webviewRef.current?.injectJavaScript(script);
  }, [isPlaying, playabilityConfirmed]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Video',
      `You will not earn ${coinReward} coins for this video. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            webviewRef.current?.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
            onVideoSkip();
          }
        },
      ]
    );
  }, [coinReward, onVideoSkip]);

  const handleWebViewLoad = useCallback(() => {
    console.log(`WebView loaded for video: ${youtubeVideoId}`);
  }, [youtubeVideoId]);

  const handleWebViewError = useCallback(() => {
    const errorMessage = 'Failed to load video player';
    console.error(`❌ WebView error for video: ${youtubeVideoId}`);
    handleVideoErrorInternal(errorMessage, 'WEBVIEW_ERROR');
  }, [youtubeVideoId, handleVideoErrorInternal]);

  const openInYouTube = useCallback(() => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    if (Platform.OS === 'web') {
      window.open(youtubeUrl, '_blank');
    } else {
      showToast('Opening in YouTube...');
    }
  }, [youtubeVideoId]);

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

  return (
    <View style={styles.container}>
      {/* WebView Video Player */}
      <View style={styles.playerContainer}>
        {!isLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.loadingText}>Loading optimized player...</Text>
            <Text style={styles.loadingSubtext}>Video ID: {youtubeVideoId}</Text>
            <Text style={styles.loadingSubtext}>
              {validationStage}
            </Text>
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
            <AlertTriangle color="#FF4757" size={32} />
            <Text style={styles.errorText}>{playerError}</Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => onVideoUnplayable()}
            >
              <Text style={styles.errorButtonText}>Skip Video</Text>
            </TouchableOpacity>
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

      {/* Video Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          <Text style={styles.progressText}>
            {progressPercentage}% complete
          </Text>
        </View>

        {/* Completion Banner */}
        {isCompleted ? (
          <LinearGradient
            colors={['#2ECC71', '#27AE60']}
            style={styles.completionBanner}
          >
            <Award color="white" size={20} />
            <Text style={styles.completionText}>
              Completed! You earned {coinReward} coins!
            </Text>
          </LinearGradient>
        ) : hasStarted ? (
          <View style={styles.watchingBanner}>
            <Clock color="#FF4757" size={16} />
            <Text style={styles.watchingText}>
              {formatTime(remainingTime)} remaining to earn {coinReward} coins
            </Text>
          </View>
        ) : (
          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>
              Tap play to start watching and earn coins
            </Text>
          </View>
        )}

        {/* Playability Status */}
        <View style={styles.playabilityStatus}>
          <Text style={styles.playabilityText}>
            {playabilityConfirmed ? '✅ Playable' : '⏳ Validating'}
          </Text>
          <Text style={styles.validationStageText}>{validationStage}</Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.controlButton, (!isLoaded || !playabilityConfirmed) && styles.buttonDisabled]}
            onPress={handlePlayPause}
            disabled={!isLoaded || !playabilityConfirmed || playerError !== null}
          >
            {isPlaying ? (
              <Pause color="white" size={20} />
            ) : (
              <Play color="white" size={20} />
            )}
            <Text style={styles.controlButtonText}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <SkipForward color="#666" size={18} />
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.youtubeButton} onPress={openInYouTube}>
            <ExternalLink color="#FF4757" size={16} />
            <Text style={styles.youtubeButtonText}>YouTube</Text>
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
    height: 240,
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
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
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
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  errorButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsContainer: {
    padding: 16,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: '#999',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  completionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  watchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  watchingText: {
    color: '#FF4757',
    fontSize: 13,
    fontWeight: '500',
  },
  instructionBanner: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
  playabilityStatus: {
    backgroundColor: '#F0F8FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  playabilityText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 2,
  },
  validationStageText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  youtubeButtonText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '500',
  },
});