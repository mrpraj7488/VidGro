import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useFeatureFlag } from '../../hooks/useFeatureFlags';
import { useTheme } from '@/contexts/ThemeContext';
import { useVideoStore } from '../../store/videoStore';
import { watchVideo } from '../../lib/supabase';
import { useRealtimeVideoUpdates } from '../../hooks/useRealtimeVideoUpdates';
import GlobalHeader from '@/components/GlobalHeader';
import BalanceSystemMonitor from '@/components/BalanceSystemMonitor';
import { Play, SkipForward, RefreshCw, Coins, Eye, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { config } = useConfig();
  const coinsEnabled = useFeatureFlag('coinsEnabled');
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
  const [loadingProgress, setLoadingProgress] = useState(0);

  const currentVideo = getCurrentVideo();
  const webViewRef = useRef<WebView>(null);

  // Animation values
  const coinBounce = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const progressAnimation = useSharedValue(0);

  // Real-time updates for current video
  const { videoUpdates, coinTransactions } = useRealtimeVideoUpdates(
    currentVideo?.video_id,
    user?.id
  );

  useEffect(() => {
    if (user && user.id) {
      fetchVideos(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (videoUpdates) {
      console.log('📹 Real-time video update received:', videoUpdates);
      // Refresh the queue to get updated video data
      if (user?.id) {
        refreshQueue(user.id);
      }
    }
  }, [videoUpdates, user]);

  useEffect(() => {
    if (coinTransactions && coinTransactions.length > 0) {
      console.log('💰 Real-time coin transactions:', coinTransactions);
      // Refresh profile to update coin balance
      refreshProfile();
    }
  }, [coinTransactions]);

  const createVideoHTML = (videoId: string, autoplay: boolean = false) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
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
          var isPlayerReady = false;
          var watchStartTime = null;
          var totalWatchTime = 0;
          var hasStartedWatching = false;
          
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
                'autoplay': ${autoplay ? 1 : 0},
                'controls': 1,
                'modestbranding': 1,
                'rel': 0,
                'fs': 1,
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
            console.log('Player ready');
            isPlayerReady = true;
            document.getElementById('loading').style.display = 'none';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY'
            }));
          }

          function onPlayerStateChange(event) {
            var state = event.data;
            console.log('Player state changed:', state);
            
            if (state === 1) { // Playing
              if (!hasStartedWatching) {
                hasStartedWatching = true;
                watchStartTime = Date.now();
                console.log('Started watching at:', watchStartTime);
              }
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_PLAYING'
              }));
            } else if (state === 2) { // Paused
              if (watchStartTime) {
                var sessionTime = Math.floor((Date.now() - watchStartTime) / 1000);
                totalWatchTime += sessionTime;
                console.log('Paused. Session time:', sessionTime, 'Total:', totalWatchTime);
                watchStartTime = null;
              }
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_PAUSED',
                totalWatchTime: totalWatchTime
              }));
            } else if (state === 0) { // Ended
              if (watchStartTime) {
                var sessionTime = Math.floor((Date.now() - watchStartTime) / 1000);
                totalWatchTime += sessionTime;
                watchStartTime = null;
              }
              
              console.log('Video ended. Total watch time:', totalWatchTime);
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_ENDED',
                totalWatchTime: totalWatchTime,
                fullyWatched: true
              }));
            }
          }

          function onPlayerError(event) {
            console.error('Player error:', event.data);
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ERROR',
              error: event.data
            }));
          }

          // Periodic watch time updates
          setInterval(function() {
            if (watchStartTime && player && player.getPlayerState && player.getPlayerState() === 1) {
              var currentSessionTime = Math.floor((Date.now() - watchStartTime) / 1000);
              var currentTotalTime = totalWatchTime + currentSessionTime;
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WATCH_TIME_UPDATE',
                totalWatchTime: currentTotalTime
              }));
            }
          }, 5000);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📹 WebView message:', data);

      switch (data.type) {
        case 'PLAYER_READY':
          setIsVideoReady(true);
          setLoadingProgress(100);
          break;

        case 'VIDEO_PLAYING':
          setIsPlaying(true);
          if (!watchStartTime) {
            setWatchStartTime(Date.now());
          }
          break;

        case 'VIDEO_PAUSED':
          setIsPlaying(false);
          if (data.totalWatchTime) {
            setTotalWatchTime(data.totalWatchTime);
          }
          break;

        case 'VIDEO_ENDED':
          await handleVideoComplete(data.totalWatchTime, data.fullyWatched);
          break;

        case 'WATCH_TIME_UPDATE':
          if (data.totalWatchTime) {
            setTotalWatchTime(data.totalWatchTime);
            
            // Award coins based on watch time milestones
            if (!hasEarnedCoins && currentVideo && coinsEnabled) {
              await checkAndAwardCoins(data.totalWatchTime, false);
            }
          }
          break;

        case 'VIDEO_ERROR':
          console.error('Video playback error:', data.error);
          Alert.alert('Video Error', 'This video cannot be played. Moving to next video.');
          handleNextVideo();
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const checkAndAwardCoins = async (watchTime: number, fullyWatched: boolean) => {
    if (!currentVideo || !user || hasEarnedCoins || !coinsEnabled) return;

    const requiredWatchTime = Math.min(currentVideo.duration_seconds * 0.8, 30);
    
    if (watchTime >= requiredWatchTime || fullyWatched) {
      try {
        console.log('💰 Awarding coins for video:', currentVideo.video_id, 'Watch time:', watchTime);
        
        const result = await watchVideo(
          user.id,
          currentVideo.video_id,
          watchTime,
          fullyWatched
        );

        if (result.data && result.data.success) {
          setHasEarnedCoins(true);
          
          // Animate coin bounce
          coinBounce.value = withSequence(
            withSpring(1.3, { damping: 15, stiffness: 150 }),
            withSpring(1, { damping: 15, stiffness: 150 })
          );

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          // Refresh profile to update coin balance
          await refreshProfile();
          
          console.log('💰 Coins awarded successfully:', result.data.coins_earned);
        } else {
          console.error('Failed to award coins:', result.error);
        }
      } catch (error) {
        console.error('Error awarding coins:', error);
      }
    }
  };

  const handleVideoComplete = async (watchTime: number, fullyWatched: boolean) => {
    setIsPlaying(false);
    
    if (currentVideo && user && coinsEnabled) {
      await checkAndAwardCoins(watchTime, fullyWatched);
    }
    
    // Auto-advance to next video after a short delay
    setTimeout(() => {
      handleNextVideo();
    }, 2000);
  };

  const handleNextVideo = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    buttonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    // Reset video state
    setIsPlaying(false);
    setWatchStartTime(null);
    setTotalWatchTime(0);
    setHasEarnedCoins(false);
    setIsVideoReady(false);
    setLoadingProgress(0);

    // Move to next video
    moveToNextVideo();
    
    // Force WebView reload
    setWebViewKey(prev => prev + 1);
  };

  const handleRefreshQueue = async () => {
    if (!user?.id) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await refreshQueue(user.id);
      setWebViewKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing queue:', error);
      Alert.alert('Error', 'Failed to refresh video queue');
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Check if features are disabled
  if (!coinsEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          title="View" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.disabledContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={[styles.disabledTitle, { color: colors.text }]}>
            Feature Temporarily Disabled
          </Text>
          <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
            Video watching and coin earning are currently disabled. Please check back later.
          </Text>
        </View>
      </View>
    );
  }

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
            {error || 'No videos in queue. Videos will appear here when available!'}
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
            onPress={handleRefreshQueue}
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
      <BalanceSystemMonitor />
      
      <View style={styles.content}>
        {/* Video Player */}
        <View style={[styles.videoContainer, { backgroundColor: colors.surface }]}>
          {!isVideoReady && (
            <View style={[styles.videoLoading, { backgroundColor: colors.overlay }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.videoLoadingText, { color: colors.text }]}>
                Loading video...
              </Text>
            </View>
          )}
          
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ html: createVideoHTML(currentVideo.video_id, true) }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scrollEnabled={false}
            bounces={false}
            onLoadProgress={({ nativeEvent }) => {
              setLoadingProgress(nativeEvent.progress * 100);
            }}
          />
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
              <Coins size={16} color="#FFD700" />
              <Text style={[styles.coinReward, { color: '#FFD700' }]}>
                🪙{currentVideo.coin_reward}
              </Text>
            </Animated.View>
          </View>

          {/* Watch Progress */}
          <View style={styles.progressContainer}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Watch Progress: {totalWatchTime}s / {Math.min(currentVideo.duration_seconds * 0.8, 30)}s required
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: hasEarnedCoins ? colors.success : colors.primary,
                    width: `${Math.min((totalWatchTime / Math.min(currentVideo.duration_seconds * 0.8, 30)) * 100, 100)}%`
                  }
                ]}
              />
            </View>
            {hasEarnedCoins && (
              <Text style={[styles.earnedText, { color: colors.success }]}>
                ✅ Coins earned!
              </Text>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <AnimatedTouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              buttonAnimatedStyle
            ]}
            onPress={handleNextVideo}
          >
            <SkipForward size={20} color="white" />
            <Text style={styles.nextButtonText}>Next Video</Text>
          </AnimatedTouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.secondary }]}
            onPress={handleRefreshQueue}
          >
            <RefreshCw size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Queue Info */}
        <View style={[styles.queueInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.queueText, { color: colors.textSecondary }]}>
            Video {currentVideoIndex + 1} of {videoQueue.length} • Queue updates automatically
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
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  videoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: isSmallScreen ? 200 : 250,
    marginBottom: 16,
    position: 'relative',
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  coinReward: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  earnedText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  queueInfo: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  queueText: {
    fontSize: 12,
    fontWeight: '500',
  },
});