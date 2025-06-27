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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { ExternalLink, Play, Pause, SkipForward, Clock, DollarSign } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import videoService, { Video, WatchSession } from '@/services/videoService';
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
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentVideo) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'No videos available'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
          <View style={styles.videoPlayer}>
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
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            {isPlaying && (
              <View style={styles.playingIndicator}>
                <Text style={styles.playingText}>Playing...</Text>
              </View>
            )}
          </View>

          {/* Video Info */}
          <TouchableOpacity style={styles.youtubeButton} onPress={handleOpenYouTube}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {currentVideo.title}
            </Text>
            <View style={styles.youtubeButtonContent}>
              <Text style={styles.youtubeText}>Open on YouTube</Text>
              <ExternalLink size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Earning Progress */}
        <View style={styles.earningSection}>
          <Text style={styles.sectionTitle}>Earning Progress</Text>
          
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Watch 100% to earn {coinsToEarn} coins</Text>
              <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.earningProgressBar}>
              <LinearGradient
                colors={['#00FF00', '#32CD32']}
                style={[styles.earningProgressFill, { width: `${progress}%` }]}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Clock size={24} color="#FF0000" />
              <Text style={styles.statNumber}>{timeLeft}</Text>
              <Text style={styles.statLabel}>Seconds Left</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={24} color="#00FF00" />
              <Text style={[styles.statNumber, { color: '#00FF00' }]}>{coinsToEarn}</Text>
              <Text style={styles.statLabel}>Coins Reward</Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
            <SkipForward size={20} color="#FFFFFF" />
            <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
          </TouchableOpacity>

          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayText}>Auto Play Next Video</Text>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#E5E7EB', true: '#00FF00' }}
              thumbColor={autoPlay ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1E90FF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  videoPlayer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    position: 'relative',
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
    backgroundColor: '#FF0000',
  },
  playingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  playingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Roboto-Bold',
  },
  youtubeButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  videoTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  youtubeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  youtubeText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#1E90FF',
  },
  earningSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#000000',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#00FF00',
  },
  earningProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  earningProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#FF0000',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  controlsSection: {
    margin: 20,
    marginTop: 0,
    gap: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autoPlayText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000000',
  },
});