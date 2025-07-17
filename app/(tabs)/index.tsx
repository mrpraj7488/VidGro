import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Play, SkipForward, RefreshCw, CircleAlert as AlertCircle } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  hasError: boolean;
  errorMessage: string;
}

export default function VideoViewTab() {
  const { user, refreshProfile } = useAuth();
  const { 
    videoQueue, 
    currentVideoIndex, 
    isLoading, 
    fetchVideos, 
    getCurrentVideo, 
    moveToNextVideo, 
    removeCurrentVideo,
    resetQueue,
    handleVideoError,
    checkVideoCompletion
  } = useVideoStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isReady: false,
    hasError: false,
    errorMessage: '',
  });
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [isProcessingReward, setIsProcessingReward] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const webViewRef = useRef<WebView>(null);
  const progressAnimation = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  const currentVideo = getCurrentVideo();

  // Auto-fetch videos when component mounts or user changes
  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('🎬 VideoViewTab focused, fetching videos...');
        fetchVideos(user.id).catch(error => {
          console.error('Error fetching videos on focus:', error);
        });
      }
    }, [user, fetchVideos])
  );

  // Set up loading timeout when video changes
  useEffect(() => {
    if (currentVideo && !playerState.isReady) {
      console.log(`🎬 Setting up loading timeout for video: ${currentVideo.youtube_url}`);
      
      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        console.log(`⏰ Loading timeout for video: ${currentVideo.youtube_url}`);
        handleLoadingTimeout();
      }, 8000); // 8 second timeout

      setLoadingTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [currentVideo?.id, playerState.isReady]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  const handleLoadingTimeout = async () => {
    if (currentVideo) {
      console.log(`⏰ Video loading timeout: ${currentVideo.youtube_url}`);
      await handleVideoError(currentVideo.youtube_url, 'LOADING_TIMEOUT');
      setPlayerState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: 'Video loading timeout'
      }));
      
      // Move to next video after a short delay
      setTimeout(() => {
        moveToNextVideo();
        setPlayerState(prev => ({
          ...prev,
          hasError: false,
          errorMessage: '',
          isReady: false
        }));
      }, 2000);
    }
  };

  const handleVideoReady = () => {
    console.log(`🎬 Video ready: ${currentVideo?.youtube_url}`);
    
    // Clear loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    setPlayerState(prev => ({
      ...prev,
      isReady: true,
      hasError: false,
      errorMessage: ''
    }));
    setWatchStartTime(Date.now());
    setRetryCount(0);
  };

  const handleVideoEnd = async () => {
    if (!currentVideo || !watchStartTime || isProcessingReward) return;

    console.log(`🎬 Video ended: ${currentVideo.youtube_url}`);
    setIsProcessingReward(true);

    try {
      const watchDuration = Math.floor((Date.now() - watchStartTime) / 1000);
      console.log(`🎬 Watch duration: ${watchDuration}s, Required: ${currentVideo.duration_seconds}s`);

      // Check if video should be skipped due to completion
      const shouldSkip = await checkVideoCompletion(currentVideo.id);
      if (shouldSkip) {
        console.log(`🔄 Video completed, skipping: ${currentVideo.youtube_url}`);
        moveToNextVideo();
        return;
      }

      // Award coins for watching the video
      const { data: result, error } = await supabase
        .rpc('award_coins_for_video_completion', {
          user_uuid: user?.id,
          video_uuid: currentVideo.id,
          watch_duration: watchDuration
        });

      if (error) {
        console.error('Error awarding coins:', error);
        Alert.alert('Error', 'Failed to process video completion');
      } else if (result?.success) {
        console.log(`💰 Coins awarded: ${result.coins_earned}`);
        
        // Animate coin update
        coinBounce.value = withSpring(1.3, {}, () => {
          coinBounce.value = withSpring(1);
        });

        // Refresh profile to update coin balance
        await refreshProfile();

        if (result.coins_earned > 0) {
          Alert.alert(
            'Coins Earned! 🎉',
            `You earned ${result.coins_earned} coins for watching this video!`,
            [{ text: 'Great!' }]
          );
        }
      } else {
        console.log(`ℹ️ No coins earned: ${result?.error || 'Unknown reason'}`);
      }

      // Move to next video
      moveToNextVideo();

    } catch (error) {
      console.error('Error processing video completion:', error);
      moveToNextVideo();
    } finally {
      setIsProcessingReward(false);
      setWatchStartTime(null);
    }
  };

  const handleVideoError = async (errorType: string) => {
    if (!currentVideo) return;

    console.log(`❌ Video error: ${currentVideo.youtube_url} - ${errorType}`);
    
    setPlayerState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: `Video error: ${errorType}`
    }));

    // Handle the error through the store
    await handleVideoError(currentVideo.youtube_url, errorType);

    // Move to next video after a short delay
    setTimeout(() => {
      moveToNextVideo();
      setPlayerState(prev => ({
        ...prev,
        hasError: false,
        errorMessage: '',
        isReady: false
      }));
    }, 2000);
  };

  const handleSkipVideo = async () => {
    if (!currentVideo) return;

    console.log(`⏭️ Skipping video: ${currentVideo.youtube_url}`);
    
    // Add to blacklist and move to next
    await removeCurrentVideo();
    
    setPlayerState(prev => ({
      ...prev,
      isReady: false,
      hasError: false,
      errorMessage: ''
    }));
    setWatchStartTime(null);
  };

  const handleRefreshQueue = async () => {
    if (!user) return;

    console.log('🔄 Refreshing video queue...');
    try {
      await resetQueue(user.id);
      setPlayerState(prev => ({
        ...prev,
        isReady: false,
        hasError: false,
        errorMessage: ''
      }));
    } catch (error) {
      console.error('Error refreshing queue:', error);
      Alert.alert('Error', 'Failed to refresh video queue');
    }
  };

  const generateYouTubeEmbedHTML = (videoId: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #000; }
            #player { width: 100%; height: 100vh; }
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
            var isReady = false;
            var hasStarted = false;

            function onYouTubeIframeAPIReady() {
              player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '${videoId}',
                playerVars: {
                  'autoplay': 1,
                  'controls': 1,
                  'rel': 0,
                  'showinfo': 0,
                  'modestbranding': 1,
                  'fs': 0,
                  'cc_load_policy': 0,
                  'iv_load_policy': 3,
                  'autohide': 1
                },
                events: {
                  'onReady': onPlayerReady,
                  'onStateChange': onPlayerStateChange,
                  'onError': onPlayerError
                }
              });
            }

            function onPlayerReady(event) {
              console.log('YouTube player ready');
              isReady = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYER_READY'
              }));
            }

            function onPlayerStateChange(event) {
              console.log('Player state changed:', event.data);
              
              if (event.data == YT.PlayerState.PLAYING && !hasStarted) {
                hasStarted = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_STARTED'
                }));
              }
              
              if (event.data == YT.PlayerState.ENDED) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_ENDED'
                }));
              }

              if (event.data == YT.PlayerState.BUFFERING) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_BUFFERING'
                }));
              }
            }

            function onPlayerError(event) {
              console.log('Player error:', event.data);
              var errorType = 'UNKNOWN_ERROR';
              
              switch(event.data) {
                case 2: errorType = 'INVALID_PARAMETER'; break;
                case 5: errorType = 'HTML5_ERROR'; break;
                case 100: errorType = 'VIDEO_NOT_FOUND'; break;
                case 101: 
                case 150: errorType = 'NOT_EMBEDDABLE'; break;
              }
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_ERROR',
                error: errorType
              }));
            }

            // Prevent context menu
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
            });
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView message:', message);

      switch (message.type) {
        case 'PLAYER_READY':
          handleVideoReady();
          break;
        case 'VIDEO_STARTED':
          setPlayerState(prev => ({ ...prev, isPlaying: true }));
          break;
        case 'VIDEO_ENDED':
          handleVideoEnd();
          break;
        case 'VIDEO_ERROR':
          handleVideoError(message.error);
          break;
        case 'VIDEO_BUFFERING':
          // Handle buffering if needed
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressAnimation.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  // Show loading state when no videos or loading
  if (isLoading || !currentVideo) {
    return (
      <View style={styles.container}>
        <GlobalHeader title="Watch & Earn" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#800080" />
          <Text style={styles.loadingText}>
            {isLoading ? 'Loading videos...' : 'No videos available'}
          </Text>
          {!isLoading && (
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshQueue}>
              <RefreshCw color="#800080" size={20} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader title="Watch & Earn" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />
      
      <View style={styles.videoContainer}>
        {/* Video Player */}
        <View style={styles.playerContainer}>
          {playerState.hasError ? (
            <View style={styles.errorContainer}>
              <AlertCircle color="#E74C3C" size={48} />
              <Text style={styles.errorText}>{playerState.errorMessage}</Text>
              <Text style={styles.errorSubtext}>Moving to next video...</Text>
            </View>
          ) : !playerState.isReady ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#800080" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          ) : null}

          <WebView
            ref={webViewRef}
            source={{ html: generateYouTubeEmbedHTML(currentVideo.youtube_url) }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onError={(error) => {
              console.error('WebView error:', error);
              handleVideoError('WEBVIEW_ERROR');
            }}
            onHttpError={(error) => {
              console.error('WebView HTTP error:', error);
              handleVideoError('HTTP_ERROR');
            }}
          />
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {currentVideo.title}
          </Text>
          <View style={styles.videoMeta}>
            <Text style={styles.videoDuration}>
              Duration: {currentVideo.duration_seconds}s
            </Text>
            <Animated.View style={[styles.coinReward, coinAnimatedStyle]}>
              <Text style={styles.coinRewardText}>
                🪙{currentVideo.coin_reward}
              </Text>
            </Animated.View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progressAnimation.value * 100)}% watched
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleSkipVideo}
            disabled={isProcessingReward}
          >
            <SkipForward color="#666" size={20} />
            <Text style={styles.controlButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleRefreshQueue}
            disabled={isProcessingReward}
          >
            <RefreshCw color="#666" size={20} />
            <Text style={styles.controlButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Queue Info */}
        <View style={styles.queueInfo}>
          <Text style={styles.queueText}>
            Video {currentVideoIndex + 1} of {videoQueue.length}
          </Text>
          {videoQueue.length > 1 && (
            <Text style={styles.queueSubtext}>
              {videoQueue.length - currentVideoIndex - 1} more videos in queue
            </Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#800080',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  videoContainer: {
    flex: 1,
    padding: 16,
  },
  playerContainer: {
    width: '100%',
    height: isSmallScreen ? 200 : 250,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  videoInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoDuration: {
    fontSize: 14,
    color: '#666',
  },
  coinReward: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinRewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#800080',
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#800080',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  queueInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  queueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  queueSubtext: {
    fontSize: 12,
    color: '#666',
  },
});