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
  onVideoUnplayable: () => void;
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
  const [appState, setAppState] = useState(AppState.currentState);
  const [isMarkedInactive, setIsMarkedInactive] = useState(false);
  const [skipReason, setSkipReason] = useState<string>('');
  const [autoPlayStarted, setAutoPlayStarted] = useState(false);
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const webviewRef = useRef<WebView>(null);
  const { handleVideoError, addToBlacklist } = useVideoStore();
  const errorTimeoutDuration = 3000; // 3 seconds timeout

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
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
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

  // Mark video as inactive in Supabase (only for confirmed unplayable videos)
  const markVideoInactive = useCallback(async (youtubeVideoId: string, reason: string, isUnplayable: boolean = true) => {
    if (isMarkedInactive) return;
    
    try {
      setIsMarkedInactive(true);
      console.log(`🚨 ${isUnplayable ? 'Marking' : 'NOT marking'} video ${youtubeVideoId} as inactive due to: ${reason}`);
      
      if (isUnplayable) {
        addToBlacklist(youtubeVideoId);
        
        const { error } = await supabase
          .from('videos')
          .update({ 
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('youtube_url', youtubeVideoId);
        
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
      console.error('Error in markVideoInactive:', error);
    }
  }, [isMarkedInactive, addToBlacklist]);

  // Create optimized HTML content with instant auto-play
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
      <div id="loading" class="loading">Loading video...</div>
      <div id="error" class="error" style="display: none;"></div>
      
      <script>
        console.log('Initializing instant video player for video ID: ${youtubeVideoId}');
        
        var player;
        var isPlayerReady = false;
        var currentTime = 0;
        var maxDuration = ${duration};
        var hasCompleted = false;
        var autoPlayStarted = false;
        var progressCheckInterval;

        // Create iframe directly for instant loading
        function createInstantPlayer() {
          const iframe = document.createElement('iframe');
          iframe.id = 'youtube-iframe';
          iframe.src = 'https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=0&modestbranding=1&showinfo=0&rel=0&fs=0&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.allow = 'autoplay; encrypted-media';
          iframe.allowFullscreen = false;
          
          iframe.onload = function() {
            console.log('Iframe loaded, starting instant playback');
            document.getElementById('loading').style.display = 'none';
            isPlayerReady = true;
            autoPlayStarted = true;
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY',
              videoId: '${youtubeVideoId}',
              autoPlay: true
            }));
            
            // Start progress tracking immediately
            startProgressTracking();
            
            // Simulate playing state
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              state: 1,
              stateName: 'PLAYING'
            }));
          };
          
          iframe.onerror = function() {
            console.error('Iframe failed to load - video likely not embeddable');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Video not embeddable';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: 'IFRAME_LOAD_FAILED',
              message: 'Video iframe failed to load - not embeddable',
              errorType: 'NOT_EMBEDDABLE',
              isEmbeddingError: true
            }));
          };
          
          document.getElementById('player').appendChild(iframe);
        }

        function startProgressTracking() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
          }
          
          console.log('Starting instant progress tracking');
          
          progressCheckInterval = setInterval(function() {
            if (isPlayerReady && !hasCompleted && autoPlayStarted) {
              currentTime += 1;
              
              // Limit to user-set duration
              if (currentTime >= maxDuration && !hasCompleted) {
                hasCompleted = true;
                console.log('Video completed at', currentTime, 'seconds');
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

        // Start instant player creation
        createInstantPlayer();

        // Expose control functions
        window.playVideo = function() {
          if (isPlayerReady) {
            autoPlayStarted = true;
            console.log('Manual play triggered');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              state: 1,
              stateName: 'PLAYING'
            }));
          }
        };

        window.pauseVideo = function() {
          if (isPlayerReady) {
            console.log('Manual pause triggered');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              state: 2,
              stateName: 'PAUSED'
            }));
          }
        };

        // Handle page errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          console.error('Page error:', msg);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIDEO_UNPLAYABLE',
            error: 'PAGE_ERROR',
            message: 'Page error: ' + msg,
            errorType: 'PAGE_ERROR',
            isEmbeddingError: false
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
    setIsMarkedInactive(false);
    setSkipReason('');
    setAutoPlayStarted(false);
    progressValue.value = 0;
  }, [videoId]);

  const injectJavaScript = useCallback((script: string) => {
    try {
      webviewRef.current?.injectJavaScript(script);
    } catch (error) {
      console.error('JavaScript injection failed:', error);
      handleVideoErrorInternal('Failed to control video player', 'INJECTION_FAILED', false);
    }
  }, []);

  const playVideo = useCallback(() => {
    injectJavaScript('window.playVideo && window.playVideo(); true;');
  }, [injectJavaScript]);

  const pauseVideo = useCallback(() => {
    injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
  }, [injectJavaScript]);

  const handleVideoErrorInternal = useCallback(async (errorMessage: string, errorType: string, isEmbeddingError: boolean = false) => {
    console.log('🚨 Video error detected:', errorMessage, 'for video:', youtubeVideoId, 'type:', errorType, 'isEmbeddingError:', isEmbeddingError);
    
    // Critical errors that indicate unplayable videos
    const criticalErrors = ['NOT_EMBEDDABLE', 'IFRAME_LOAD_FAILED', 'PAGE_ERROR'];
    const shouldMarkInactive = isEmbeddingError || criticalErrors.includes(errorType);
    
    if (youtubeVideoId && !isMarkedInactive && shouldMarkInactive) {
      await markVideoInactive(youtubeVideoId, errorType, true);
      setSkipReason(`Removed unplayable video: ${youtubeVideoId} (${errorType})`);
    } else {
      setSkipReason(`Video error: ${errorType} (not marking inactive)`);
    }

    // Use video store error handling for queue management
    if (shouldMarkInactive && youtubeVideoId) {
      await handleVideoError(youtubeVideoId, errorType);
    }

    // Immediate skip for unplayable videos
    setTimeout(() => {
      if (shouldMarkInactive) {
        showToast(`Removed unplayable video: ${youtubeVideoId}`);
        onVideoUnplayable();
      } else {
        showToast('Video error, skipping...');
        onVideoSkip();
      }
    }, errorTimeoutDuration);

    setPlayerError(errorMessage);
  }, [youtubeVideoId, errorTimeoutDuration, handleVideoError, isMarkedInactive, markVideoInactive, onVideoUnplayable, onVideoSkip]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message received:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          console.log('Player ready message received for video:', data.videoId || youtubeVideoId);
          setIsLoaded(true);
          setPlayerError(null);
          if (data.autoPlay) {
            setAutoPlayStarted(true);
            setIsPlaying(true);
            setHasStarted(true);
          }
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            console.log('Video started playing:', youtubeVideoId);
            setIsPlaying(true);
            if (!hasStarted) {
              setHasStarted(true);
            }
            if (!autoPlayStarted) {
              setAutoPlayStarted(true);
            }
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
          
        case 'PROGRESS_UPDATE':
          const newTime = data.currentTime;
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
            
            // Silent coin animation
            coinBounce.value = withTiming(1.2, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            // Complete video instantly
            setTimeout(() => {
              onVideoComplete();
            }, 100);
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
          console.log('Video unplayable received:', data.message, 'for video:', youtubeVideoId, 'errorType:', data.errorType, 'isEmbeddingError:', data.isEmbeddingError);
          handleVideoErrorInternal(data.message || 'Video unplayable', data.errorType || 'UNPLAYABLE', data.isEmbeddingError || false);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      handleVideoErrorInternal('Failed to parse video message', 'MESSAGE_PARSE_ERROR', false);
    }
  }, [duration, hasStarted, isCompleted, onVideoComplete, handleVideoErrorInternal, youtubeVideoId, autoPlayStarted]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

  const handleSkip = useCallback(async () => {
    console.log('🔄 Skip requested for video:', youtubeVideoId);
    
    // Instant skip for playable videos
    console.log('✅ Video appears playable, skipping without removal');
    setSkipReason('Skipped playable video');
    showToast('Skipping video...');
    pauseVideo();
    onVideoSkip();
  }, [youtubeVideoId, pauseVideo, onVideoSkip]);

  const handleWebViewLoad = useCallback(() => {
    console.log('WebView loaded for video:', youtubeVideoId);
  }, [youtubeVideoId]);

  const handleWebViewError = useCallback(() => {
    console.log('WebView error for video:', youtubeVideoId);
    handleVideoErrorInternal('Failed to load video player', 'WEBVIEW_ERROR', false);
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
            {skipReason && (
              <Text style={styles.skipReasonText}>{skipReason}</Text>
            )}
          </View>
        )}
      </View>

      {/* Video Info */}
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

        {/* Status Display */}
        {skipReason && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{skipReason}</Text>
          </View>
        )}

        {/* Auto-play Status */}
        <View style={styles.autoPlayStatus}>
          <Text style={styles.autoPlayText}>
            {autoPlayStarted ? '▶️ Auto-playing' : '⏳ Loading...'}
          </Text>
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
  skipReasonText: {
    color: '#FFA726',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
  statusContainer: {
    backgroundColor: '#F0F8FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  statusText: {
    fontSize: 11,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '500',
  },
  autoPlayStatus: {
    backgroundColor: '#E8F5E8',
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#2ECC71',
  },
  autoPlayText: {
    fontSize: 10,
    color: '#2ECC71',
    textAlign: 'center',
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
});