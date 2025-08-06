import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useVideoStore } from '../../store/videoStore';
import { watchVideo } from '../../lib/supabase';
import GlobalHeader from '@/components/GlobalHeader';
import { Play, Pause, SkipForward, RefreshCw, Clock, Eye, Coins } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { 
    videoQueue, 
    currentVideoIndex, 
    isLoading, 
    error, 
    fetchVideos, 
    getCurrentVideo, 
    moveToNextVideo,
    refreshQueue 
  } = useVideoStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [hasEarnedCoins, setHasEarnedCoins] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const watchTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const coinBounce = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const currentVideo = getCurrentVideo();

  useEffect(() => {
    if (user && user.id) {
      console.log('🎬 ViewTab: User authenticated, fetching videos...');
      fetchVideos(user.id);
      
      // Set up periodic queue refresh
      const queueRefreshInterval = setInterval(() => {
        console.log('🔄 ViewTab: Periodic queue refresh');
        refreshQueue(user.id);
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(queueRefreshInterval);
    }
  }, [user]);

  useEffect(() => {
    if (currentVideo) {
      console.log('🎬 ViewTab: Current video changed:', currentVideo.title);
      resetVideoState();
    }
  }, [currentVideo]);

  const resetVideoState = () => {
    setIsPlaying(false);
    setWatchStartTime(null);
    setTotalWatchTime(0);
    setHasEarnedCoins(false);
    setIsVideoReady(false);
    setVideoError(null);
    setRetryCount(0);
    watchTimeRef.current = 0;
    progressWidth.value = 0;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Force WebView reload
    setWebViewKey(prev => prev + 1);
  };

  const startWatchTimer = () => {
    if (intervalRef.current) return;
    
    setWatchStartTime(Date.now());
    intervalRef.current = setInterval(() => {
      watchTimeRef.current += 1;
      setTotalWatchTime(watchTimeRef.current);
      
      if (currentVideo) {
        const progress = Math.min(watchTimeRef.current / currentVideo.duration_seconds, 1);
        progressWidth.value = withSpring(progress * 100);
        
        // Award coins when video is fully watched
        if (watchTimeRef.current >= currentVideo.duration_seconds && !hasEarnedCoins) {
          handleVideoCompleted();
        }
      }
    }, 1000);
  };

  const stopWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVideoCompleted = async () => {
    if (!currentVideo || !user || hasEarnedCoins) return;
    
    setHasEarnedCoins(true);
    stopWatchTimer();
    
    try {
      console.log('🪙 ViewTab: Awarding coins for completed video:', currentVideo.title);
      const result = await watchVideo(
        user.id, 
        currentVideo.video_id, 
        watchTimeRef.current,
        true
      );
      
      if (result.data && result.data.success) {
        await refreshProfile();
        
        // Animate coin update
        coinBounce.value = withSequence(
          withSpring(1.3, { damping: 15, stiffness: 150 }),
          withSpring(1, { damping: 15, stiffness: 150 })
        );
        
        console.log('🪙 ViewTab: Coins awarded successfully:', result.data.coins_awarded);
        
        // Auto-advance to next video after a short delay
        setTimeout(() => {
          handleNextVideo();
        }, 2000);
      }
    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  };

  const handlePlayPause = () => {
    if (!isVideoReady) return;
    
    playButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    if (isPlaying) {
      stopWatchTimer();
      setIsPlaying(false);
    } else {
      startWatchTimer();
      setIsPlaying(true);
    }
  };

  const handleNextVideo = () => {
    console.log('⏭️ ViewTab: Moving to next video');
    stopWatchTimer();
    moveToNextVideo();
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    console.log('🔄 ViewTab: Manual refresh triggered');
    resetVideoState();
    await refreshQueue(user.id);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 ViewTab: WebView message:', data.type);
      
      switch (data.type) {
        case 'VIDEO_READY':
          setIsVideoReady(true);
          setVideoError(null);
          console.log('✅ ViewTab: Video is ready for playback');
          break;
          
        case 'VIDEO_PLAYING':
          if (!isPlaying) {
            setIsPlaying(true);
            startWatchTimer();
          }
          break;
          
        case 'VIDEO_PAUSED':
          if (isPlaying) {
            setIsPlaying(false);
            stopWatchTimer();
          }
          break;
          
        case 'VIDEO_ENDED':
          console.log('🏁 ViewTab: Video ended naturally');
          if (!hasEarnedCoins) {
            handleVideoCompleted();
          }
          break;
          
        case 'VIDEO_ERROR':
          console.error('❌ ViewTab: Video error:', data.error);
          setVideoError(data.error || 'Video playback error');
          setIsVideoReady(false);
          
          if (retryCount < maxRetries) {
            console.log(`🔄 ViewTab: Retrying video load (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setWebViewKey(prev => prev + 1);
            }, 2000);
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const createVideoHTML = (videoId: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: ${isDark ? '#121212' : '#000000'};
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
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${isDark ? '#FFFFFF' : '#FFFFFF'};
            font-family: Arial, sans-serif;
            z-index: 1000;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">Loading video...</div>
        <div id="player"></div>
        
        <script>
          var player;
          var isReady = false;
          
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoId}',
              playerVars: {
                'autoplay': 1,
                'controls': 1,
                'modestbranding': 1,
                'rel': 0,
                'fs': 0,
                'playsinline': 1
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          }

          function onPlayerReady(event) {
            document.getElementById('loading').style.display = 'none';
            isReady = true;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_READY'
            }));
          }

          function onPlayerStateChange(event) {
            if (!isReady) return;
            
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_PLAYING'
                }));
                break;
              case YT.PlayerState.PAUSED:
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_PAUSED'
                }));
                break;
              case YT.PlayerState.ENDED:
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'VIDEO_ENDED'
                }));
                break;
            }
          }

          function onPlayerError(event) {
            var errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not embeddable',
              150: 'Video not embeddable'
            };
            
            var errorMessage = errorMessages[event.data] || 'Unknown video error';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ERROR',
              error: errorMessage
            }));
          }
        </script>
      </body>
      </html>
    `;
  };

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  const coinAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: coinBounce.value }],
    };
  });

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playButtonScale.value }],
    };
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          title="View" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (error || !currentVideo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          title="View" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.errorContainer}>
          <RefreshCw size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>No Videos Available</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || 'Videos will appear here when available for watching'}
          </Text>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <RefreshCw size={20} color="white" />
            <Text style={styles.refreshButtonText}>Refresh Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="View" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <View style={styles.content}>
        {/* Video Player */}
        <View style={[styles.videoContainer, { backgroundColor: colors.surface }]}>
          {videoError ? (
            <View style={styles.videoErrorContainer}>
              <Text style={[styles.videoErrorText, { color: colors.error }]}>{videoError}</Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setVideoError(null);
                  setWebViewKey(prev => prev + 1);
                }}
              >
                <RefreshCw size={16} color="white" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              key={webViewKey}
              source={{ html: createVideoHTML(currentVideo.youtube_url) }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
              bounces={false}
            />
          )}
          
          {!isVideoReady && !videoError && (
            <View style={[styles.videoLoadingOverlay, { backgroundColor: colors.overlay }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.videoLoadingText, { color: colors.text }]}>
                Loading video...
              </Text>
            </View>
          )}
        </View>

        {/* Video Info */}
        <View style={[styles.videoInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
            {currentVideo.title}
          </Text>
          
          <View style={styles.videoStats}>
            <View style={styles.statItem}>
              <Eye size={16} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {currentVideo.views_count}/{currentVideo.target_views}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {currentVideo.duration_seconds}s
              </Text>
            </View>
            
            <Animated.View style={[styles.statItem, coinAnimatedStyle]}>
              <Coins size={16} color={colors.accent} />
              <Text style={[styles.statText, { color: colors.accent }]}>
                +{currentVideo.coin_reward}
              </Text>
            </Animated.View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  progressAnimatedStyle,
                  { backgroundColor: colors.primary }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {totalWatchTime}s / {currentVideo.duration_seconds}s
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { backgroundColor: colors.surface }]}>
          <Animated.View style={playButtonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.primary }]}
              onPress={handlePlayPause}
              disabled={!isVideoReady}
            >
              {isPlaying ? (
                <Pause size={24} color="white" />
              ) : (
                <Play size={24} color="white" />
              )}
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.secondary }]}
            onPress={handleNextVideo}
          >
            <SkipForward size={20} color="white" />
            <Text style={styles.nextButtonText}>Next Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleRefresh}
          >
            <RefreshCw size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Queue Info */}
        <View style={[styles.queueInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.queueText, { color: colors.textSecondary }]}>
            Video {currentVideoIndex + 1} of {videoQueue.length} • Queue loops automatically
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  videoContainer: {
    height: Math.min(screenWidth * 0.5625, screenHeight * 0.4),
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  webView: {
    flex: 1,
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoLoadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoErrorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: 12,
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 2,
  },
  queueInfo: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueText: {
    fontSize: 14,
    fontWeight: '500',
  },
});