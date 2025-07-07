import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useVideoStore } from '@/store/videoStore';
import { DollarSign, Play, Pause, SkipForward, ExternalLink, Clock, Coins } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface Video {
  id: string;
  youtube_url: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
}

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
    clearCaches
  } = useVideoStore();

  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEarnedCoins, setHasEarnedCoins] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const webviewRef = useRef<WebView>(null);
  const watchStartTime = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Load auto-play setting from storage
  useEffect(() => {
    loadAutoPlaySetting();
  }, []);

  // Fetch videos when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchVideos(user.id);
    }
  }, [user, fetchVideos]);

  // Update current video when queue changes
  useEffect(() => {
    const video = getCurrentVideo();
    if (video && video.id !== currentVideo?.id) {
      setCurrentVideo(video);
      setTimeRemaining(video.duration_seconds);
      setHasEarnedCoins(false);
      setVideoError(null);
      setRetryCount(0);
      setIsVideoReady(false);
      watchStartTime.current = Date.now();
    }
  }, [videoQueue, currentVideoIndex, getCurrentVideo, currentVideo?.id]);

  // Timer for countdown
  useEffect(() => {
    if (isPlaying && timeRemaining > 0 && !hasEarnedCoins) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleVideoComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, timeRemaining, hasEarnedCoins]);

  const loadAutoPlaySetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('autoPlay');
      if (saved !== null) {
        setAutoPlay(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading auto-play setting:', error);
    }
  };

  const saveAutoPlaySetting = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('autoPlay', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving auto-play setting:', error);
    }
  };

  const toggleAutoPlay = () => {
    const newValue = !autoPlay;
    setAutoPlay(newValue);
    saveAutoPlaySetting(newValue);
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
          var player;
          var isPlayerReady = false;
          var debugMode = false; // Debug mode disabled
          
          function onYouTubeIframeAPIReady() {
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
                'iv_load_policy': 3,
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
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY'
            }));
          }

          function onPlayerStateChange(event) {
            var state = event.data;
            var isPlaying = (state === 1);
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              isPlaying: isPlaying,
              state: state
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
            
            var errorMessage = errorMessages[event.data] || 'Video playback error';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_ERROR',
              error: event.data,
              message: errorMessage
            }));
          }

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

          // Load YouTube IFrame API
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          setIsVideoReady(true);
          setVideoError(null);
          break;
          
        case 'STATE_CHANGE':
          setIsPlaying(data.isPlaying);
          break;
          
        case 'VIDEO_ERROR':
          handleVideoErrorMessage(data.error, data.message);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handleVideoErrorMessage = async (errorCode: number, errorMessage: string) => {
    if (!currentVideo) return;

    setVideoError(errorMessage);
    setIsPlaying(false);

    if (retryCount < maxRetries && (errorCode === 5 || !errorCode)) {
      // Retry for HTML5 player errors
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setVideoError(null);
        setIsVideoReady(false);
      }, 2000);
    } else {
      // Handle unrecoverable errors
      const errorType = errorCode === 101 || errorCode === 150 ? 'NOT_EMBEDDABLE' : 'PLAYBACK_ERROR';
      await handleVideoError(currentVideo.youtube_url, errorType);
      
      setTimeout(() => {
        handleSkipVideo();
      }, 3000);
    }
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || hasEarnedCoins) return;

    setHasEarnedCoins(true);
    
    try {
      const watchDuration = Math.floor((Date.now() - watchStartTime.current) / 1000);
      
      const { data: success, error } = await supabase
        .rpc('complete_video_view', {
          user_uuid: user.id,
          video_uuid: currentVideo.id,
          watch_duration: Math.min(watchDuration, currentVideo.duration_seconds)
        });

      if (error) {
        console.error('Error completing video view:', error);
        return;
      }

      if (success) {
        await refreshProfile();
        
        // Auto-skip if auto-play is enabled
        if (autoPlay) {
          setTimeout(() => {
            handleSkipVideo();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error in handleVideoComplete:', error);
    }
  };

  const handleSkipVideo = async () => {
    if (!user) return;

    moveToNextVideo();
    
    // Fetch new videos if queue is getting low
    if (videoQueue.length - currentVideoIndex <= 2) {
      await fetchVideos(user.id);
    }
  };

  const togglePlayPause = () => {
    if (!webviewRef.current || !isVideoReady) return;

    if (isPlaying) {
      webviewRef.current.injectJavaScript('window.pauseVideo && window.pauseVideo(); true;');
    } else {
      webviewRef.current.injectJavaScript('window.playVideo && window.playVideo(); true;');
    }
  };

  const openYouTubeVideo = () => {
    if (!currentVideo) return;
    
    const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.youtube_url}`;
    
    if (Platform.OS === 'web') {
      window.open(youtubeUrl, '_blank');
    } else {
      Linking.openURL(youtubeUrl);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Text style={styles.headerTitle}>VidGro</Text>
        </LinearGradient>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Please log in to start watching videos</Text>
        </View>
      </View>
    );
  }

  if (isLoading && !currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Text style={styles.headerTitle}>VidGro</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="white" size={20} />
          </View>
        </LinearGradient>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
          <Text style={styles.headerTitle}>VidGro</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            <DollarSign color="white" size={20} />
          </View>
        </LinearGradient>
        <View style={styles.centerContent}>
          <Text style={styles.message}>No videos available</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => user && fetchVideos(user.id)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Text style={styles.headerTitle}>VidGro</Text>
        <View style={styles.coinDisplay}>
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          <DollarSign color="white" size={20} />
        </View>
      </LinearGradient>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {videoError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{videoError}</Text>
            {retryCount < maxRetries && (
              <Text style={styles.retryText}>Retrying... ({retryCount + 1}/{maxRetries})</Text>
            )}
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ html: createVideoHTML(currentVideo.youtube_url) }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            originWhitelist={['*']}
            allowsFullscreenVideo={false}
          />
        )}
        
        {/* Video Title Overlay */}
        <View style={styles.titleOverlay}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {currentVideo.title}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Clock color="#FF4757" size={24} style={styles.statIcon} />
          <Text style={styles.statValue}>{timeRemaining}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        
        <View style={styles.statCard}>
          <Coins color="#FFA726" size={24} style={styles.statIcon} />
          <Text style={styles.statValue}>{hasEarnedCoins ? currentVideo.coin_reward : currentVideo.coin_reward}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* YouTube Link and Auto Play Toggle */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={styles.youtubeLink}
            onPress={openYouTubeVideo}
          >
            <ExternalLink color="#FF4757" size={16} />
            <Text style={styles.youtubeLinkText}>YouTube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity
              style={[styles.toggle, autoPlay && styles.toggleActive]}
              onPress={toggleAutoPlay}
            >
              <View style={[styles.toggleThumb, autoPlay && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Play/Pause and Skip Buttons */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.playButton, !isPlaying && styles.playButtonPaused]}
            onPress={togglePlayPause}
            disabled={!isVideoReady}
          >
            {isPlaying ? (
              <Pause color="white" size={24} />
            ) : (
              <Play color="white" size={24} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipVideo}
          >
            <SkipForward color="white" size={20} style={styles.skipIcon} />
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinCount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    height: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#FF4757',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: '#FFA726',
    fontSize: 12,
    textAlign: 'center',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  controlsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  youtubeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  youtubeLinkText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '500',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoPlayLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FF4757',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  playButtonPaused: {
    backgroundColor: '#9CA3AF',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  skipIcon: {
    marginRight: 4,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});