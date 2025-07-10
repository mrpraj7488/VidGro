import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Play, DollarSign, Eye, Clock, Zap } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
}

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetViews, setTargetViews] = useState('50');
  const [watchDuration, setWatchDuration] = useState('30');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Animation values
  const coinBounce = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Calculate costs
  const views = parseInt(targetViews) || 0;
  const duration = parseInt(watchDuration) || 0;
  const baseCostPerView = 2;
  const durationMultiplier = duration / 30; // 30 seconds as base
  const totalCost = Math.ceil(views * baseCostPerView * durationMultiplier);
  const coinReward = 3; // Fixed reward per view

  useEffect(() => {
    if (youtubeUrl) {
      validateAndFetchVideoInfo(youtubeUrl);
    } else {
      setVideoInfo(null);
      setUrlError('');
    }
  }, [youtubeUrl]);

  const extractVideoId = (url: string): string | null => {
    // Handle direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const validateAndFetchVideoInfo = async (url: string) => {
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      setUrlError('Please enter a valid YouTube URL or video ID');
      setVideoInfo(null);
      return;
    }

    setUrlError('');
    setIsLoading(true);

    try {
      // Simulate video info fetch (in real app, you'd use YouTube API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVideoInfo({
        title: 'Sample Video Title',
        duration: 180, // 3 minutes
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      });
    } catch (error) {
      setUrlError('Could not fetch video information');
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteVideo = async () => {
    if (!user || !videoInfo) return;

    // Validate inputs
    if (!youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    if (views < 10 || views > 1000) {
      Alert.alert('Error', 'Target views must be between 10 and 1000');
      return;
    }

    if (duration < 10 || duration > 300) {
      Alert.alert('Error', 'Watch duration must be between 10 and 300 seconds');
      return;
    }

    // Check if user has enough coins
    if ((profile?.coins || 0) < totalCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${totalCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      const videoId = extractVideoId(youtubeUrl);
      
      // Create video promotion with 10-minute hold
      const { data: newVideo, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoInfo.title,
          description_param: '',
          duration_seconds_param: duration,
          coin_cost_param: totalCost,
          coin_reward_param: coinReward,
          target_views_param: views
        });

      if (videoError) throw videoError;

      // Deduct coins
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -totalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoInfo.title}`,
          reference_uuid: newVideo
        });

      if (coinError) throw coinError;

      // Refresh profile and clear video queue
      await refreshProfile();
      clearQueue();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Video Promoted Successfully! 🎉',
        `Your video is now in the promotion queue. It will be active after a 10-minute hold period.`,
        [{ text: 'Great!', onPress: () => {
          setYoutubeUrl('');
          setTargetViews('50');
          setWatchDuration('30');
          setVideoInfo(null);
        }}]
      );

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Zap color="white" size={isSmallScreen ? 32 : 40} />
            </View>
            <Text style={styles.heroTitle}>Promote Your Video</Text>
            <Text style={styles.heroSubtitle}>
              Get real views from our community and grow your channel
            </Text>
          </View>
        </LinearGradient>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Video Details</Text>
          
          {/* YouTube URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YouTube URL or Video ID</Text>
            <TextInput
              style={[styles.textInput, urlError && styles.inputError]}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://youtube.com/watch?v=... or video ID"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {urlError ? (
              <Text style={styles.errorText}>{urlError}</Text>
            ) : null}
          </View>

          {/* Video Info Display */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF4757" />
              <Text style={styles.loadingText}>Fetching video info...</Text>
            </View>
          )}

          {videoInfo && (
            <View style={styles.videoInfoCard}>
              <View style={styles.videoInfoHeader}>
                <Play color="#FF4757" size={20} />
                <Text style={styles.videoInfoTitle}>Video Preview</Text>
              </View>
              <Text style={styles.videoTitle}>{videoInfo.title}</Text>
              <Text style={styles.videoDuration}>Duration: {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</Text>
            </View>
          )}

          {/* Target Views */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Views</Text>
            <View style={styles.inputWithIcon}>
              <Eye color="#666" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={targetViews}
                onChangeText={setTargetViews}
                placeholder="50"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.inputHint}>Minimum: 10, Maximum: 1000</Text>
          </View>

          {/* Watch Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Required Watch Duration (seconds)</Text>
            <View style={styles.inputWithIcon}>
              <Clock color="#666" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={watchDuration}
                onChangeText={setWatchDuration}
                placeholder="30"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.inputHint}>Minimum: 10, Maximum: 300</Text>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={styles.sectionTitle}>Cost Summary</Text>
          
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Target Views:</Text>
              <Text style={styles.costValue}>{views.toLocaleString()}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Watch Duration:</Text>
              <Text style={styles.costValue}>{duration}s</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Cost per View:</Text>
              <Text style={styles.costValue}>🪙{(totalCost / Math.max(views, 1)).toFixed(1)}</Text>
            </View>
            <View style={[styles.costRow, styles.totalCostRow]}>
              <Text style={styles.totalCostLabel}>Total Cost:</Text>
              <Animated.View style={coinAnimatedStyle}>
                <Text style={styles.totalCostValue}>🪙{totalCost.toLocaleString()}</Text>
              </Animated.View>
            </View>
          </View>

          {/* Balance Check */}
          <View style={styles.balanceCheck}>
            <Text style={styles.balanceLabel}>Your Balance:</Text>
            <Text style={[
              styles.balanceValue,
              (profile?.coins || 0) >= totalCost ? styles.sufficientBalance : styles.insufficientBalance
            ]}>
              🪙{profile?.coins?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.promoteSection}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!videoInfo || isPromoting || (profile?.coins || 0) < totalCost) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!videoInfo || isPromoting || (profile?.coins || 0) < totalCost}
            >
              <DollarSign color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {isPromoting ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.promoteNote}>
            Your video will be held for 10 minutes before entering the active queue
          </Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Your video enters a 10-minute hold period</Text>
            <Text style={styles.infoItem}>• After hold, it becomes active in the viewing queue</Text>
            <Text style={styles.infoItem}>• Users earn 3 coins for watching your video</Text>
            <Text style={styles.infoItem}>• You can track progress in the Analytics tab</Text>
            <Text style={styles.infoItem}>• Get 100% refund if deleted within 10 minutes</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    padding: isSmallScreen ? 24 : 32,
    marginBottom: 16,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIcon: {
    width: isSmallScreen ? 64 : 80,
    height: isSmallScreen ? 64 : 80,
    borderRadius: isSmallScreen ? 32 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
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
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FFF5F5',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  videoInfoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
  },
  videoInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4757',
    marginLeft: 8,
  },
  videoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: '#666',
  },
  costSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
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
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  costCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
  },
  costValue: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '500',
    color: '#333',
  },
  totalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalCostLabel: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  totalCostValue: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  balanceCheck: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
  },
  balanceLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
    color: '#333',
  },
  balanceValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  sufficientBalance: {
    color: '#2ECC71',
  },
  insufficientBalance: {
    color: '#E74C3C',
  },
  promoteSection: {
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
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
  promoteButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  promoteNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    paddingLeft: 8,
  },
  infoItem: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
});