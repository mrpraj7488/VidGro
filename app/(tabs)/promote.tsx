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
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Video, DollarSign, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface PromotionPackage {
  id: string;
  views: number;
  duration: number;
  coinCost: number;
  popular?: boolean;
}

const promotionPackages: PromotionPackage[] = [
  { id: 'basic', views: 25, duration: 30, coinCost: 50 },
  { id: 'standard', views: 50, duration: 45, coinCost: 112, popular: true },
  { id: 'premium', views: 100, duration: 60, coinCost: 200 },
  { id: 'pro', views: 200, duration: 90, coinCost: 360 },
  { id: 'ultimate', views: 500, duration: 120, coinCost: 1000 },
];

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PromotionPackage>(promotionPackages[1]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const packageHeight = useSharedValue(0);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Direct video ID
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

  const validateYouTubeVideo = async (videoId: string) => {
    setIsValidating(true);
    try {
      // Simulate validation - in real app, you'd call YouTube API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock video titles based on video ID
      const mockTitles = [
        'Amazing Tutorial Video',
        'How to Build Apps',
        'React Native Guide',
        'JavaScript Tips',
        'Web Development',
      ];
      
      const title = mockTitles[Math.floor(Math.random() * mockTitles.length)];
      setVideoTitle(title);
      return true;
    } catch (error) {
      console.error('Video validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setVideoTitle('');
    
    const videoId = extractVideoId(url);
    if (videoId) {
      const isValid = await validateYouTubeVideo(videoId);
      if (!isValid) {
        Alert.alert('Invalid Video', 'Please enter a valid YouTube video URL');
      }
    }
  };

  const handlePromoteVideo = async () => {
    if (!user || !youtubeUrl || !videoTitle) {
      Alert.alert('Error', 'Please enter a valid YouTube video URL');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Invalid YouTube URL format');
      return;
    }

    if ((profile?.coins || 0) < selectedPackage.coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${selectedPackage.coinCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);

    try {
      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -selectedPackage.coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video promotion with 10-minute hold
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle,
          description_param: '',
          duration_seconds_param: selectedPackage.duration,
          coin_cost_param: selectedPackage.coinCost,
          coin_reward_param: 3,
          target_views_param: selectedPackage.views
        });

      if (videoError) throw videoError;

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
        `Your video "${videoTitle}" is now in the promotion queue. It will be active after a 10-minute hold period.`,
        [
          {
            text: 'View Analytics',
            onPress: () => router.push('/(tabs)/analytics')
          },
          { text: 'OK' }
        ]
      );

      // Reset form
      setYoutubeUrl('');
      setVideoTitle('');
      setSelectedPackage(promotionPackages[1]);

    } catch (error: any) {
      console.error('Promotion error:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const togglePackages = () => {
    setShowPackages(!showPackages);
    packageHeight.value = withSpring(showPackages ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const packageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: packageHeight.value,
    transform: [{ scaleY: packageHeight.value }],
  }));

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Video color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Promote Your Video</Text>
          <Text style={styles.heroSubtitle}>
            Get more views and grow your YouTube channel
          </Text>
        </View>

        {/* URL Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>YouTube Video URL</Text>
          <TextInput
            style={styles.urlInput}
            placeholder="Paste your YouTube video URL here..."
            placeholderTextColor="#999"
            value={youtubeUrl}
            onChangeText={handleUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {isValidating && (
            <View style={styles.validatingContainer}>
              <ActivityIndicator size="small" color="#800080" />
              <Text style={styles.validatingText}>Validating video...</Text>
            </View>
          )}
          
          {videoTitle && (
            <View style={styles.videoPreview}>
              <Text style={styles.videoTitle}>{videoTitle}</Text>
              <Text style={styles.videoId}>ID: {extractVideoId(youtubeUrl)}</Text>
            </View>
          )}
        </View>

        {/* Package Selection */}
        <View style={styles.packageSection}>
          <TouchableOpacity style={styles.packageHeader} onPress={togglePackages}>
            <Text style={styles.sectionTitle}>Promotion Package</Text>
            {showPackages ? (
              <ChevronUp color="#800080" size={24} />
            ) : (
              <ChevronDown color="#800080" size={24} />
            )}
          </TouchableOpacity>

          {/* Selected Package Display */}
          <View style={styles.selectedPackage}>
            <View style={styles.packageInfo}>
              <View style={styles.packageDetail}>
                <Eye color="#4ECDC4" size={20} />
                <Text style={styles.packageDetailText}>{selectedPackage.views} views</Text>
              </View>
              <View style={styles.packageDetail}>
                <Clock color="#FFA726" size={20} />
                <Text style={styles.packageDetailText}>{selectedPackage.duration}s duration</Text>
              </View>
              <View style={styles.packageDetail}>
                <Text style={styles.coinEmoji}>🪙</Text>
                <Text style={styles.packageDetailText}>{selectedPackage.coinCost} coins</Text>
              </View>
            </View>
          </View>

          {/* Package Options */}
          {showPackages && (
            <Animated.View style={[styles.packageOptions, packageAnimatedStyle]}>
              {promotionPackages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageOption,
                    selectedPackage.id === pkg.id && styles.selectedPackageOption,
                    pkg.popular && styles.popularPackage,
                  ]}
                  onPress={() => {
                    setSelectedPackage(pkg);
                    togglePackages();
                  }}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.packageOptionContent}>
                    <View style={styles.packageStats}>
                      <Text style={styles.packageViews}>{pkg.views} views</Text>
                      <Text style={styles.packageDuration}>{pkg.duration}s</Text>
                    </View>
                    <View style={styles.packageCost}>
                      <Text style={styles.coinEmoji}>🪙</Text>
                      <Text style={styles.packageCostText}>{pkg.coinCost}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Cost Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Promotion Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Target Views:</Text>
              <Text style={styles.summaryValue}>{selectedPackage.views}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Watch Duration:</Text>
              <Text style={styles.summaryValue}>{selectedPackage.duration} seconds</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reward per View:</Text>
              <Text style={styles.summaryValue}>🪙3</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Cost:</Text>
              <Animated.View style={coinAnimatedStyle}>
                <Text style={styles.totalValue}>🪙{selectedPackage.coinCost}</Text>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!youtubeUrl || !videoTitle || isPromoting) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!youtubeUrl || !videoTitle || isPromoting}
          >
            <DollarSign color="white" size={20} />
            <Text style={styles.promoteButtonText}>
              {isPromoting ? 'Promoting...' : 'Promote Video'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.balanceText}>
            Your Balance: 🪙{profile?.coins?.toLocaleString() || '0'}
          </Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Your video enters a 10-minute hold period{'\n'}
            2. After hold, it becomes active in the viewing queue{'\n'}
            3. Users watch your video and earn coins{'\n'}
            4. You get views and engagement on your content
          </Text>
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
    alignItems: 'center',
    padding: isSmallScreen ? 24 : 32,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  heroIcon: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  validatingText: {
    fontSize: 14,
    color: '#800080',
    marginLeft: 8,
  },
  videoPreview: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#800080',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  packageSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPackage: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  packageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageDetailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 6,
  },
  coinEmoji: {
    fontSize: 16,
  },
  packageOptions: {
    marginTop: 16,
  },
  packageOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPackageOption: {
    borderColor: '#800080',
    backgroundColor: '#F3E8FF',
  },
  popularPackage: {
    borderColor: '#FFA726',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FFA726',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  packageOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageStats: {
    flex: 1,
  },
  packageViews: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  packageDuration: {
    fontSize: 14,
    color: '#666',
  },
  packageCost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageCostText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800080',
    marginLeft: 4,
  },
  summarySection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800080',
  },
  buttonSection: {
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
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
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#F0F8FF',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
});