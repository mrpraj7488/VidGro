import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface WebViewVideoPlayerProps {
  videoId: string;
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
}

export default function WebViewVideoPlayer({
  videoId,
  duration,
  coinReward,
  onVideoComplete,
  onVideoSkip,
  onError: reportErrorToParent
}: WebViewVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const webviewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 2;

  // HTML content for YouTube iframe with enhanced controls
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
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script>
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player;
        var isPlayerReady = false;
        var currentTime = 0;
        var maxDuration = ${duration};
        var hasCompleted = false;

        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: '${videoId}',
            playerVars: {
              'autoplay': 0,
              'controls': 0,
              'modestbranding': 1,
              'rel': 0,
              'fs': 0,
              'disablekb': 1,
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
        }

        function onPlayerReady(event) {
          isPlayerReady = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY'
          }));
          
          // Start progress tracking
          setInterval(function() {
            if (player && player.getCurrentTime) {
              try {
                currentTime = player.getCurrentTime();
                
                // Limit to user-set duration
                if (currentTime >= maxDuration && !hasCompleted) {
                  hasCompleted = true;
                  player.pauseVideo();
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'VIDEO_COMPLETED',
                    currentTime: currentTime
                  }));
                } else if (currentTime < maxDuration) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PROGRESS_UPDATE',
                    currentTime: currentTime,
                    progress: (currentTime / maxDuration) * 100
                  }));
                }
              } catch (error) {
                console.error('Error getting current time:', error);
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
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
        }

        function onPlayerError(event) {
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not allowed to be played in embedded players',
            150: 'Video not allowed to be played in embedded players'
          };
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_ERROR',
            error: event.data,
            message: errorMessages[event.data] || 'Unknown error'
          }));
        }

        // Expose functions for React Native to call
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

        window.getPlayerState = function() {
          if (player && player.getPlayerState && isPlayerReady) {
            return player.getPlayerState();
          }
          return -1;
        };
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
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setRetryCount(0);
    progressValue.value = 0;
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, [videoId]);

  const injectJavaScript = useCallback((script: string) => {
    try {
      webviewRef.current?.injectJavaScript(script);
    } catch (error) {
      console.error('JavaScript injection failed:', error);
      setPlayerError('Failed to control video player');
    }
  }, []);

  const playVideo = useCallback(() => {
    injectJavaScript('window.playVideo && window.playVideo(); true;');
  }, [injectJavaScript]);

  const pauseVideo = useCallback(() => {
    injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
  }, [injectJavaScript]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          setIsLoaded(true);
          setPlayerError(null);
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
            if (!hasStarted) {
              setHasStarted(true);
            }
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
          
        case 'PROGRESS_UPDATE':
          setCurrentTime(data.currentTime);
          const progress = Math.min(data.currentTime / duration, 1);
          progressValue.value = withTiming(progress, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
          break;
          
        case 'VIDEO_COMPLETED':
          if (!isCompleted) {
            setIsCompleted(true);
            setIsPlaying(false);
            
            coinBounce.value = withTiming(1.3, { duration: 200 }, () => {
              coinBounce.value = withTiming(1, { duration: 200 });
            });
            
            setTimeout(() => {
              onVideoComplete();
            }, 1000);
          }
          break;
          
        case 'PLAYER_ERROR':
          const errorMessage = data.message || 'Video playback error';
          setPlayerError(errorMessage);
          handlePlayerError(errorMessage);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [duration, hasStarted, isCompleted, onVideoComplete]);

  const handlePlayerError = useCallback((errorMessage: string) => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        setPlayerError(null);
        setIsLoaded(false);
        // Reload WebView
        webviewRef.current?.reload();
      }, 2000);
    } else {
      Alert.alert(
        'Video Error',
        `${errorMessage}. Would you like to skip to the next video?`,
        [
          { 
            text: 'Retry', 
            onPress: () => {
              setRetryCount(0);
              setPlayerError(null);
              setIsLoaded(false);
              webviewRef.current?.reload();
            }
          },
          { 
            text: 'Skip', 
            style: 'destructive',
            onPress: () => {
              reportErrorToParent(errorMessage);
              onVideoSkip();
            }
          }
        ]
      );
    }
  }, [retryCount, maxRetries, reportErrorToParent, onVideoSkip]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo]);

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
            pauseVideo();
            onVideoSkip();
          }
        },
      ]
    );
  }, [coinReward, pauseVideo, onVideoSkip]);

  const handleWebViewLoad = useCallback(() => {
    // Auto-play after a short delay to ensure player is ready
    setTimeout(() => {
      if (!isPlaying) {
        playVideo();
      }
    }, 2000);
  }, [isPlaying, playVideo]);

  const handleWebViewError = useCallback(() => {
    const errorMessage = 'Failed to load video player';
    setPlayerError(errorMessage);
    handlePlayerError(errorMessage);
  }, [handlePlayerError]);

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
            <Text style={styles.loadingText}>
              Loading video...
              {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
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
            {retryCount < maxRetries && (
              <Text style={styles.retryText}>Retrying...</Text>
            )}
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

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.controlButton, !isLoaded && styles.buttonDisabled]}
            onPress={handlePlayPause}
            disabled={!isLoaded || playerError !== null}
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
        </View>

        {/* Status Banner */}
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
    height: isSmallScreen ? 200 : 240,
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
  errorText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  retryText: {
    color: '#FFA726',
    fontSize: 12,
    textAlign: 'center',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
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
  },
  instructionText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
});