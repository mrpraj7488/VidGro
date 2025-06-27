import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { ExternalLink, Play, Pause, SkipForward, Clock, DollarSign, Eye, Star } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import videoService, { Video, StartWatchResponse } from '@/services/videoService';
import authService from '@/services/authService';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';

const { width } = Dimensions.get('window');

function ViewScreenContent() {
  const { coins, addCoins, incrementVideoCount } = useUserStore();
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [availableVideos, setAvailableVideos] = useState<Video[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [coinsToEarn, setCoinsToEarn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      progressInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          const newProgress = ((totalDuration - newTime) / totalDuration) * 100;
          setProgress(newProgress);
          
          // Update progress every 5 seconds
          if ((totalDuration - newTime) % 5 === 0 && sessionId) {
            updateWatchProgress(newProgress);
          }
          
          if (newTime <= 0) {
            handleVideoComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, timeLeft, totalDuration, sessionId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const videos = await videoService.getAvailableVideos(10, 0);
      setAvailableVideos(videos);
      
      if (videos.length > 0) {
        await startWatchingVideo(videos[0]);
      } else {
        setError('No videos available to watch. Check back later!');
      }
    } catch (error: any) {
      console.error('Error loading videos:', error);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startWatchingVideo = async (video: Video) => {
    try {
      // Ensure video object is valid before proceeding
      if (!video || !video.id) {
        throw new Error('Invalid video object');
      }

      const response = await videoService.startWatching(video.id);
      
      if (response.success) {
        setCurrentVideo(video);
        setSessionId(response.data.session_id);
        setTimeLeft(video.duration);
        setTotalDuration(video.duration);
        setCoinsToEarn(Math.floor(video.coin_reward * video.duration));
        setProgress(0);
        
        if (autoPlay) {
          setIsPlaying(true);
        }
      }
    } catch (error: any) {
      console.error('Error starting video:', error);
      Alert.alert('Error', error.message || 'Failed to start video');
      loadNextVideo();
    }
  };

  const updateWatchProgress = async (completionPercentage: number) => {
    if (!sessionId) return;

    try {
      const watchDuration = totalDuration - timeLeft;
      await videoService.updateProgress(sessionId, watchDuration, completionPercentage);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleVideoComplete = async () => {
    if (!sessionId) return;

    try {
      setIsPlaying(false);
      const response = await videoService.completeWatching(sessionId);
      
      if (response.success) {
        addCoins(response.data.coins_earned);
        incrementVideoCount();
        
        // Refresh user data
        await authService.refreshUserData();
        
        Alert.alert(
          'Congratulations!',
          `You earned ${response.data.coins_earned} coins! 🎉`,
          [{ text: 'Continue', onPress: loadNextVideo }]
        );
      }
    } catch (error: any) {
      console.error('Error completing video:', error);
      Alert.alert('Error', error.message || 'Failed to complete video');
      loadNextVideo();
    }
  };

  const loadNextVideo = () => {
    if (!currentVideo || availableVideos.length === 0) {
      loadVideos();
      return;
    }

    const currentIndex = availableVideos.findIndex(v => v.id === currentVideo.id);
    const nextIndex = (currentIndex + 1) % availableVideos.length;
    
    if (nextIndex === 0) {
      // Reload videos if we've reached the end
      loadVideos();
    } else {
      const nextVideo = availableVideos[nextIndex];
      if (nextVideo && nextVideo.id) {
        startWatchingVideo(nextVideo);
      } else {
        loadVideos();
      }
    }
  };

  const handleSkipVideo = () => {
    Alert.alert(
      'Skip Video?',
      'You won\'t earn any coins if you skip this video.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            setIsPlaying(false);
            loadNextVideo();
          }
        }
      ]
    );
  };

  const handleOpenYouTube = () => {
    if (currentVideo) {
      Alert.alert('Open YouTube', `This would open: ${currentVideo.watch_url}`);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#1E90FF', '#8A2BE2']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading amazing videos...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentVideo) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.errorGradient}
          >
            <Text style={styles.errorText}>{error || 'No videos available'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.videoGradient}
          >
            <View style={styles.videoPlayer}>
              {currentVideo.thumbnail_url ? (
                <Image 
                  source={{ uri: currentVideo.thumbnail_url }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <WebView
                  ref={webViewRef}
                  source={{ uri: currentVideo.embed_url || '' }}
                  style={styles.webView}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  scalesPageToFit
                  scrollEnabled={false}
                  bounces={false}
                  onError={(error) => {
                    console.error('WebView error:', error);
                    loadNextVideo();
                  }}
                />
              )}
              
              {/* Video Controls Overlay */}
              <View style={styles.videoControls}>
                <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                  {isPlaying ? (
                    <Pause size={32} color="#FFFFFF" />
                  ) : (
                    <Play size={32} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#FF0000', '#FF4444']}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
              </View>

              {isPlaying && (
                <View style={styles.playingIndicator}>
                  <LinearGradient
                    colors={['#FF0000', '#FF4444']}
                    style={styles.playingGradient}
                  >
                    <Text style={styles.playingText}>● LIVE</Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Video Info */}
            <TouchableOpacity style={styles.youtubeButton} onPress={handleOpenYouTube}>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {currentVideo.title}
                </Text>
                <View style={styles.videoMeta}>
                  <View style={styles.metaItem}>
                    <Eye size={16} color="#6B7280" />
                    <Text style={styles.metaText}>{currentVideo.views_completed || 0} views</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Star size={16} color="#FFA500" />
                    <Text style={styles.metaText}>Promoted</Text>
                  </View>
                </View>
              </View>
              <View style={styles.youtubeButtonContent}>
                <Text style={styles.youtubeText}>Watch on YouTube</Text>
                <ExternalLink size={16} color="#1E90FF" />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Earning Progress */}
        <View style={styles.earningSection}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.sectionGradient}
          >
            <Text style={styles.sectionTitle}>Earning Progress</Text>
            
            <View style={styles.progressCard}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.progressCardGradient}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressText}>Watch 100% to earn {coinsToEarn} coins</Text>
                  <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.earningProgressBar}>
                  <View style={[styles.earningProgressFill, { width: `${progress}%` }]} />
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E8E']}
                  style={styles.statGradient}
                >
                  <Clock size={24} color="#FFFFFF" />
                  <Text style={styles.statNumber}>{timeLeft}</Text>
                  <Text style={styles.statLabel}>Seconds Left</Text>
                </LinearGradient>
              </View>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.statGradient}
                >
                  <DollarSign size={24} color="#FFFFFF" />
                  <Text style={[styles.statNumber, { color: '#FFFFFF' }]}>{coinsToEarn}</Text>
                  <Text style={styles.statLabel}>Coins Reward</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.sectionGradient}
          >
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
              <LinearGradient
                colors={['#FFA500', '#FF8C00']}
                style={styles.skipGradient}
              >
                <SkipForward size={20} color="#FFFFFF" />
                <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.autoPlayContainer}>
              <Text style={styles.autoPlayText}>Auto Play Next Video</Text>
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={autoPlay ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ViewScreen() {
  return (
    <AuthGuard>
      <ViewScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  errorGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  videoContainer: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  videoGradient: {
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  webView: {
    flex: 1,
  },
  videoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  playingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playingGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Roboto-Bold',
  },
  youtubeButton: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  videoInfo: {
    marginBottom: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 24,
  },
  videoMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  youtubeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  youtubeText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#1E90FF',
  },
  earningSection: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionGradient: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 20,
  },
  progressCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressCardGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#FFFFFF',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  earningProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  earningProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  controlsSection: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  skipButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  skipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  autoPlayText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#374151',
  },
});