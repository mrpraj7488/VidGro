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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, DollarSign, ExternalLink } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';

const { width } = Dimensions.get('window');

export default function ViewScreen() {
  const { coins, addCoins, incrementVideoCount, videosWatched } = useUserStore();
  const { currentVideo, getNextVideo, hasVideos } = useVideoStore();
  const [timeLeft, setTimeLeft] = useState(0);
  const [coinsToEarn, setCoinsToEarn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showAdWarning, setShowAdWarning] = useState(false);

  useEffect(() => {
    if (hasVideos()) {
      const video = getNextVideo();
      if (video) {
        setTimeLeft(video.duration);
        setCoinsToEarn(video.coinReward);
        if (autoPlay) {
          setIsPlaying(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleVideoComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    // Check if user should see ad warning
    if (videosWatched > 0 && videosWatched % 5 === 0) {
      setShowAdWarning(true);
    }
  }, [videosWatched]);

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
      const video = getNextVideo();
      if (video) {
        setTimeLeft(video.duration);
        setCoinsToEarn(video.coinReward);
        if (autoPlay) {
          setIsPlaying(true);
        }
      }
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
    // In a real app, this would open the YouTube app or browser
    Alert.alert('Open YouTube', 'This would open the video in YouTube app.');
  };

  const handleConfigureAds = () => {
    Alert.alert(
      'Configure Ads',
      'Customize your ad experience or purchase ad-free viewing.',
      [
        { text: 'Later' },
        { text: 'Configure', onPress: () => console.log('Navigate to ad settings') }
      ]
    );
  };

  if (!hasVideos()) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton}>
              <Menu size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>VidGro</Text>
            <View style={styles.coinContainer}>
              <Text style={styles.coinText}>{coins}</Text>
              <View style={styles.coinIcon}>
                <DollarSign size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>
          
          <View style={styles.noVideosContainer}>
            <Text style={styles.noVideosText}>No videos available to watch</Text>
            <Text style={styles.noVideosSubtext}>Check back later for new promoted videos!</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Menu size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>VidGro</Text>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>{coins}</Text>
            <View style={styles.coinIcon}>
              <DollarSign size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.videoContainer}>
          <View style={styles.videoPlayer}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg' }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            {!isPlaying && (
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => setIsPlaying(true)}
              >
                <View style={styles.playIcon}>
                  <Text style={styles.playText}>▶</Text>
                </View>
              </TouchableOpacity>
            )}
            {isPlaying && (
              <View style={styles.playingOverlay}>
                <View style={styles.playingIndicator}>
                  <Text style={styles.playingText}>Playing...</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.videoControls}>
            <TouchableOpacity style={styles.youtubeButton} onPress={handleOpenYouTube}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/1557652/pexels-photo-1557652.jpeg' }}
                style={styles.channelIcon}
              />
              <Text style={styles.youtubeText}>Open on Youtube</Text>
              <ExternalLink size={16} color="#6B7280" />
            </TouchableOpacity>
            
            <View style={styles.autoPlayContainer}>
              <Text style={styles.autoPlayText}>Auto Play</Text>
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                thumbColor={autoPlay ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{timeLeft}</Text>
            <Text style={styles.statLabel}>Seconds to get coins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{coinsToEarn}</Text>
            <Text style={styles.statLabel}>Coins will be added</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkipVideo}>
          <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
        </TouchableOpacity>

        {showAdWarning && (
          <TouchableOpacity style={styles.adWarning} onPress={handleConfigureAds}>
            <Text style={styles.adWarningText}>
              You will see an Ad after watching 5 Videos. CONFIGURE?
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  playIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    fontSize: 24,
    color: '#374151',
    marginLeft: 4,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  youtubeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoPlayText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 30,
    gap: 40,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  skipButton: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  adWarning: {
    marginHorizontal: 20,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  adWarningText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noVideosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  noVideosText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  noVideosSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});