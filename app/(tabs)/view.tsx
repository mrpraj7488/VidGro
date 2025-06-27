import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink, Play, Pause, Volume2, VolumeX, Maximize, SkipForward } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';
import Header from '@/components/Header';

const { width } = Dimensions.get('window');

export default function ViewScreen() {
  const { coins, addCoins, incrementVideoCount, videosWatched } = useUserStore();
  const { currentVideo, getNextVideo, hasVideos } = useVideoStore();
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [coinsToEarn, setCoinsToEarn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (hasVideos()) {
      setTimeout(() => {
        const video = getNextVideo();
        if (video) {
          setTimeLeft(video.duration);
          setTotalDuration(video.duration);
          setCoinsToEarn(video.coinReward);
          setProgress(0);
          if (autoPlay) {
            setIsPlaying(true);
          }
        }
      }, 0);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          const newProgress = ((totalDuration - newTime) / totalDuration) * 100;
          setProgress(newProgress);
          
          if (newTime <= 0) {
            handleVideoComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, totalDuration]);

  const handleVideoComplete = () => {
    addCoins(coinsToEarn);
    incrementVideoCount();
    setIsPlaying(false);
    
    Alert.alert(
      'Congratulations!',
      `You earned ${coinsToEarn} coins! 🎉`,
      [{ text: 'Continue', onPress: loadNextVideo }]
    );
  };

  const loadNextVideo = () => {
    if (hasVideos()) {
      setTimeout(() => {
        const video = getNextVideo();
        if (video) {
          setTimeLeft(video.duration);
          setTotalDuration(video.duration);
          setCoinsToEarn(video.coinReward);
          setProgress(0);
          if (autoPlay) {
            setIsPlaying(true);
          }
        }
      }, 0);
    }
  };

  const handleSkipVideo = () => {
    Alert.alert(
      'Skip Video?',
      'You won\'t earn any coins if you skip this video.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => {
          setIsPlaying(false);
          loadNextVideo();
        }}
      ]
    );
  };

  const handleOpenYouTube = () => {
    Alert.alert('Open YouTube', 'This would open the video in YouTube app.');
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullScreen = () => {
    Alert.alert('Full Screen', 'Full screen mode would be activated.');
  };

  if (!hasVideos()) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.content}>
          <View style={styles.noVideosContainer}>
            <Text style={styles.noVideosText}>No videos available to watch</Text>
            <Text style={styles.noVideosSubtext}>Check back later for new promoted videos!</Text>
          </View>
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
            <Image
              source={{ uri: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg' }}
              style={styles.videoThumbnail}
              resizeMode="cover"
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
              
              <View style={styles.controlsRight}>
                <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                  {isMuted ? (
                    <VolumeX size={24} color="#FFFFFF" />
                  ) : (
                    <Volume2 size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.controlButton} onPress={toggleFullScreen}>
                  <Maximize size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
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
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1557652/pexels-photo-1557652.jpeg' }}
              style={styles.channelIcon}
            />
            <Text style={styles.youtubeText}>Open on YouTube</Text>
            <ExternalLink size={16} color="#6B7280" />
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
              <Text style={styles.statNumber}>{timeLeft}</Text>
              <Text style={styles.statLabel}>Seconds Left</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber} style={{ color: '#00FF00' }}>{coinsToEarn}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
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
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  controlsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  youtubeText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000000',
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
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Roboto-Bold',
    color: '#FF0000',
    marginBottom: 8,
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
  noVideosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  noVideosText: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  noVideosSubtext: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});