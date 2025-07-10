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
import { supabase } from '@/lib/supabase';
import { Video, DollarSign, Eye, Clock, Play, ChevronDown } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface PromotionData {
  youtubeUrl: string;
  targetViews: number;
  duration: number;
  coinCost: number;
}

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetViews, setTargetViews] = useState(50);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const submitScale = useSharedValue(1);

  const viewOptions = [10, 25, 50, 100, 200, 500];
  const durationOptions = [30, 45, 60, 90, 120];

  // Calculate coin cost based on views and duration
  const calculateCoinCost = (views: number, durationSecs: number) => {
    const baseCost = views * 2; // 2 coins per view
    const durationMultiplier = durationSecs / 30; // 30 seconds as base
    return Math.ceil(baseCost * durationMultiplier);
  };

  const coinCost = calculateCoinCost(targetViews, duration);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
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

  // Fetch video title from YouTube API (mock implementation)
  const fetchVideoTitle = async (videoId: string) => {
    try {
      // In a real app, you would use YouTube Data API
      // For now, we'll use a placeholder
      setVideoTitle(`Video ${videoId.substring(0, 8)}...`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('Unknown Video');
    }
  };

  useEffect(() => {
    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl);
      if (videoId) {
        fetchVideoTitle(videoId);
      } else {
        setVideoTitle('');
      }
    } else {
      setVideoTitle('');
    }
  }, [youtubeUrl]);

  const handlePromoteVideo = async () => {
    if (!user || !youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video.`);
      return;
    }

    setLoading(true);
    submitScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle || videoId}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video promotion with 10-minute hold
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId, // Store just the video ID
          title_param: videoTitle || `Video ${videoId}`,
          description_param: 'Promoted video',
          duration_seconds_param: duration,
          coin_cost_param: coinCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: targetViews
        });

      if (videoError) throw videoError;

      // Refresh user profile
      await refreshProfile();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Success!',
        `Your video has been submitted for promotion! It will be active in the queue after a 10-minute hold period.`,
        [{ text: 'OK', onPress: () => {
          setYoutubeUrl('');
          setVideoTitle('');
          setTargetViews(50);
          setDuration(30);
        }}]
      );

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
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
              <Video color="white" size={isSmallScreen ? 32 : 40} />
            </View>
            <Text style={styles.heroTitle}>Promote Your Video</Text>
            <Text style={styles.heroSubtitle}>
              Get real views from our community and grow your channel
            </Text>
          </View>
        </LinearGradient>

        {/* Promotion Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Video Details</Text>

          {/* YouTube URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YouTube Video URL</Text>
            <TextInput
              style={styles.textInput}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {videoTitle && (
              <Text style={styles.videoTitle}>📹 {videoTitle}</Text>
            )}
          </View>

          {/* Target Views */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Views</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(!showViewsDropdown)}
            >
              <Text style={styles.dropdownText}>{targetViews} views</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            {showViewsDropdown && (
              <View style={styles.dropdownOptions}>
                {viewOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      targetViews === option && styles.selectedOption
                    ]}
                    onPress={() => {
                      setTargetViews(option);
                      setShowViewsDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      targetViews === option && styles.selectedOptionText
                    ]}>
                      {option} views
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Watch Duration</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            >
              <Text style={styles.dropdownText}>{duration} seconds</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            {showDurationDropdown && (
              <View style={styles.dropdownOptions}>
                {durationOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      duration === option && styles.selectedOption
                    ]}
                    onPress={() => {
                      setDuration(option);
                      setShowDurationDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      duration === option && styles.selectedOptionText
                    ]}>
                      {option} seconds
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Promotion Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Eye color="#3498DB" size={20} />
                <Text style={styles.summaryLabel}>Target Views</Text>
                <Text style={styles.summaryValue}>{targetViews}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Clock color="#F39C12" size={20} />
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{duration}s</Text>
              </View>
            </View>
            
            <View style={styles.costRow}>
              <Animated.View style={[styles.costIcon, coinAnimatedStyle]}>
                <DollarSign color="#FF4757" size={24} />
              </Animated.View>
              <View style={styles.costInfo}>
                <Text style={styles.costLabel}>Total Cost</Text>
                <Text style={styles.costValue}>🪙{coinCost}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.buttonSection}>
          <Animated.View style={submitAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                loading && styles.promoteButtonDisabled,
                (profile?.coins || 0) < coinCost && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={loading || (profile?.coins || 0) < coinCost}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Play color="white" size={20} />
              )}
              <Text style={styles.promoteButtonText}>
                {loading ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {(profile?.coins || 0) < coinCost && (
            <Text style={styles.insufficientText}>
              Insufficient coins. You need {coinCost - (profile?.coins || 0)} more coins.
            </Text>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Your video enters a 10-minute hold period</Text>
            <Text style={styles.infoItem}>• After hold, it becomes active in the viewing queue</Text>
            <Text style={styles.infoItem}>• Users earn 3 coins for watching your video</Text>
            <Text style={styles.infoItem}>• You get real engagement from our community</Text>
            <Text style={styles.infoItem}>• Track progress in the Analytics tab</Text>
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
    margin: 16,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
  videoTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
  },
  dropdownOptions: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#F0F8FF',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionText: {
    color: '#3498DB',
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  costIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  costInfo: {
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  costValue: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  buttonSection: {
    margin: 16,
    marginTop: 0,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  promoteButtonDisabled: {
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  insufficientText: {
    textAlign: 'center',
    color: '#E74C3C',
    fontSize: 14,
    marginTop: 12,
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
  },
});