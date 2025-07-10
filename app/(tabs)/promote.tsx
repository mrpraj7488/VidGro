import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Video, DollarSign, Clock, Eye, Play, ChevronDown, Check } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoData {
  id?: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  thumbnail?: string;
}

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // If it's already just an ID
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

  const fetchVideoData = async (videoId: string) => {
    setFetchingVideo(true);
    try {
      // For demo purposes, we'll create mock data based on the video ID
      // In a real app, you'd fetch from YouTube API
      const mockData: VideoData = {
        id: videoId,
        title: `Video ${videoId.substring(0, 8)}...`,
        description: 'This is a sample video description that would be fetched from YouTube API.',
        duration: Math.floor(Math.random() * 300) + 60, // Random duration between 1-6 minutes
        views: Math.floor(Math.random() * 100000),
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
      
      setVideoData(mockData);
    } catch (error) {
      console.error('Error fetching video data:', error);
      Alert.alert('Error', 'Failed to fetch video information');
    } finally {
      setFetchingVideo(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const videoId = extractVideoId(url);
    if (videoId) {
      fetchVideoData(videoId);
    } else {
      setVideoData(null);
    }
  };

  const calculateCoinCost = () => {
    const durationFactor = selectedDuration / 30; // 30 seconds as base
    return Math.ceil(selectedViews * durationFactor * 2); // 2 coins per view-duration unit
  };

  const handlePromoteVideo = async () => {
    if (!user || !videoData) return;

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    const coinCost = calculateCoinCost();
    
    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video.`);
      return;
    }

    setLoading(true);
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      // Deduct coins for promotion
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoData.title}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video promotion record using the enhanced function
      const { data: newVideoId, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoData.title,
          description_param: videoData.description,
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to update coin balance
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
          setVideoData(null);
          setSelectedViews(50);
          setSelectedDuration(30);
        }}]
      );
    } catch (error) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.heroSection}
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

        {/* Video URL Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YouTube Video URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.urlInput}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#999"
              value={youtubeUrl}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {fetchingVideo && (
              <ActivityIndicator size="small" color="#FF4757" style={styles.inputLoader} />
            )}
          </View>
        </View>

        {/* Video Preview */}
        {videoData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Preview</Text>
            <View style={styles.videoPreview}>
              <View style={styles.videoThumbnail}>
                <Play color="white" size={24} />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {videoData.title}
                </Text>
                <Text style={styles.videoStats}>
                  {Math.floor(videoData.duration / 60)}:{(videoData.duration % 60).toString().padStart(2, '0')} • {videoData.views.toLocaleString()} views
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Promotion Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Settings</Text>
          
          {/* Target Views */}
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Target Views</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(!showViewsDropdown)}
            >
              <Text style={styles.dropdownText}>{selectedViews} views</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            
            {showViewsDropdown && (
              <View style={styles.dropdownOptions}>
                {VIEW_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      selectedViews === option && styles.selectedOption
                    ]}
                    onPress={() => {
                      setSelectedViews(option);
                      setShowViewsDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      selectedViews === option && styles.selectedOptionText
                    ]}>
                      {option} views
                    </Text>
                    {selectedViews === option && (
                      <Check color="#FF4757" size={16} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Watch Duration */}
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Minimum Watch Duration</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            >
              <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            
            {showDurationDropdown && (
              <View style={styles.dropdownOptions}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      selectedDuration === option && styles.selectedOption
                    ]}
                    onPress={() => {
                      setSelectedDuration(option);
                      setShowDurationDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      selectedDuration === option && styles.selectedOptionText
                    ]}>
                      {option} seconds
                    </Text>
                    {selectedDuration === option && (
                      <Check color="#FF4757" size={16} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Summary</Text>
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Eye color="#4ECDC4" size={20} />
                <Text style={styles.costLabel}>Target Views</Text>
                <Text style={styles.costValue}>{selectedViews}</Text>
              </View>
              <View style={styles.costItem}>
                <Clock color="#FFA726" size={20} />
                <Text style={styles.costLabel}>Duration</Text>
                <Text style={styles.costValue}>{selectedDuration}s</Text>
              </View>
            </View>
            
            <View style={styles.totalCost}>
              <Animated.View style={[styles.coinIcon, coinAnimatedStyle]}>
                <Text style={styles.coinEmoji}>🪙</Text>
              </Animated.View>
              <Text style={styles.totalCostText}>
                Total Cost: {calculateCoinCost()} coins
              </Text>
            </View>
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.section}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!videoData || loading) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!videoData || loading}
            >
              <DollarSign color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {loading ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoStep}>1.</Text>
              <Text style={styles.infoText}>
                Enter your YouTube video URL and set your promotion preferences
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoStep}>2.</Text>
              <Text style={styles.infoText}>
                Your video enters a 10-minute hold period before going live
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoStep}>3.</Text>
              <Text style={styles.infoText}>
                Community members watch your video and you get real engagement
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoStep}>4.</Text>
              <Text style={styles.infoText}>
                Track your promotion progress in the Analytics tab
              </Text>
            </View>
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
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
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
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  urlInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLoader: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#666',
  },
  settingGroup: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
    borderRadius: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#FFF5F5',
  },
  dropdownOptionText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#FF4757',
    fontWeight: '600',
  },
  costCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  costItem: {
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  costValue: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  totalCost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  coinIcon: {
    marginRight: 8,
  },
  coinEmoji: {
    fontSize: 20,
  },
  totalCostText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
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
  infoSection: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoStep: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginRight: 12,
    minWidth: 20,
  },
  infoText: {
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
});