import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Video, Coins, Play, DollarSign, Eye, Clock, TrendingUp, Menu, CheckCircle, AlertTriangle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  isValid: boolean;
  error?: string;
}

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetViews, setTargetViews] = useState('100');
  const [coinReward, setCoinReward] = useState('3');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const formScale = useSharedValue(1);
  const successScale = useSharedValue(0);

  // Calculate costs
  const views = parseInt(targetViews) || 0;
  const reward = parseInt(coinReward) || 0;
  const totalCost = views * reward;
  const canAfford = (profile?.coins || 0) >= totalCost;

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Handle direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
      /(?:youtube\.com\/shorts\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Validate YouTube video
  const validateVideo = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setVideoInfo({
        title: '',
        duration: 0,
        thumbnail: '',
        isValid: false,
        error: 'Invalid YouTube URL'
      });
      return;
    }

    setValidating(true);
    try {
      // For demo purposes, we'll simulate video validation
      // In a real app, you'd use the YouTube API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVideoInfo({
        title: `Sample Video Title (${videoId})`,
        duration: 120, // 2 minutes
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        isValid: true,
      });
    } catch (error) {
      setVideoInfo({
        title: '',
        duration: 0,
        thumbnail: '',
        isValid: false,
        error: 'Failed to validate video'
      });
    } finally {
      setValidating(false);
    }
  };

  // Handle URL change
  useEffect(() => {
    if (youtubeUrl.trim()) {
      const timeoutId = setTimeout(() => {
        validateVideo(youtubeUrl.trim());
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setVideoInfo(null);
    }
  }, [youtubeUrl]);

  const handlePromoteVideo = async () => {
    if (!user || !videoInfo?.isValid) return;

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Invalid YouTube URL');
      return;
    }

    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ₡${totalCost} coins to promote this video. You have ₡${profile?.coins || 0}.`);
      return;
    }

    setPromoting(true);
    formScale.value = withTiming(0.95, { duration: 200 });

    try {
      // Create video with 10-minute hold period
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoInfo.title,
          description_param: '',
          duration_seconds_param: videoInfo.duration,
          coin_cost_param: totalCost,
          coin_reward_param: reward,
          target_views_param: views
        });

      if (videoError) throw videoError;

      // Deduct coins from user
      const { data: coinSuccess, error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -totalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoInfo.title}`,
          reference_uuid: videoData
        });

      if (coinError) throw coinError;

      if (coinSuccess) {
        // Refresh profile to update coin balance
        await refreshProfile();
        
        // Clear video queue to refresh with new video
        clearQueue();

        // Success animation
        successScale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });

        // Coin bounce animation
        coinBounce.value = withSequence(
          withSpring(1.3, { damping: 15, stiffness: 150 }),
          withSpring(1, { damping: 15, stiffness: 150 })
        );

        // Reset form
        setYoutubeUrl('');
        setTargetViews('100');
        setCoinReward('3');
        setVideoInfo(null);

        Alert.alert(
          'Video Promoted Successfully!',
          `Your video is now on hold for 10 minutes before entering the view queue. ₡${totalCost} coins have been deducted.`,
          [{ text: 'OK' }]
        );

        // Reset success animation after delay
        setTimeout(() => {
          successScale.value = withTiming(0, { duration: 300 });
        }, 2000);
      } else {
        throw new Error('Failed to update coins');
      }
    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', error.message || 'Failed to promote video. Please try again.');
    } finally {
      setPromoting(false);
      formScale.value = withTiming(1, { duration: 200 });
    }
  };

  // Animation styles
  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: formScale.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Promote</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>₡{profile?.coins || 0}</Text>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success Animation */}
        <Animated.View style={[styles.successOverlay, successAnimatedStyle]}>
          <CheckCircle color="#2ECC71" size={64} />
          <Text style={styles.successText}>Video Promoted!</Text>
        </Animated.View>

        {/* Promotion Form */}
        <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Promote Your Video</Text>
            <Text style={styles.formSubtitle}>
              Enter your YouTube video details to start promoting
            </Text>

            {/* YouTube URL Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>YouTube URL</Text>
              <View style={styles.inputContainer}>
                <Video color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor="#999"
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {validating && (
                  <ActivityIndicator size="small" color="#FF4757" style={styles.validatingIcon} />
                )}
              </View>
              
              {/* Video Validation Status */}
              {videoInfo && (
                <View style={[
                  styles.validationStatus,
                  videoInfo.isValid ? styles.validStatus : styles.invalidStatus
                ]}>
                  {videoInfo.isValid ? (
                    <CheckCircle color="#2ECC71" size={16} />
                  ) : (
                    <AlertTriangle color="#E74C3C" size={16} />
                  )}
                  <Text style={[
                    styles.validationText,
                    videoInfo.isValid ? styles.validText : styles.invalidText
                  ]}>
                    {videoInfo.isValid ? videoInfo.title : videoInfo.error}
                  </Text>
                </View>
              )}
            </View>

            {/* Target Views Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Target Views</Text>
              <View style={styles.inputContainer}>
                <Eye color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="100"
                  placeholderTextColor="#999"
                  value={targetViews}
                  onChangeText={setTargetViews}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Coin Reward Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Coins per View</Text>
              <View style={styles.inputContainer}>
                <Coins color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="3"
                  placeholderTextColor="#999"
                  value={coinReward}
                  onChangeText={setCoinReward}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Cost Summary */}
            <View style={styles.costSummary}>
              <Text style={styles.costTitle}>Promotion Summary</Text>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Target Views:</Text>
                <Text style={styles.costValue}>{views.toLocaleString()}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Coins per View:</Text>
                <Text style={styles.costValue}>₡{reward}</Text>
              </View>
              <View style={[styles.costRow, styles.totalCostRow]}>
                <Text style={styles.totalCostLabel}>Total Cost:</Text>
                <Text style={[
                  styles.totalCostValue,
                  canAfford ? styles.affordableText : styles.unaffordableText
                ]}>
                  ₡{totalCost.toLocaleString()}
                </Text>
              </View>
              
              {!canAfford && (
                <View style={styles.insufficientFunds}>
                  <AlertTriangle color="#E74C3C" size={16} />
                  <Text style={styles.insufficientText}>
                    Insufficient coins. You need ₡{(totalCost - (profile?.coins || 0)).toLocaleString()} more.
                  </Text>
                </View>
              )}
            </View>

            {/* Promote Button */}
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!videoInfo?.isValid || !canAfford || promoting) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!videoInfo?.isValid || !canAfford || promoting}
            >
              {promoting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Play color="white" size={20} />
                  <Text style={styles.promoteButtonText}>
                    Promote Video (₡{totalCost.toLocaleString()})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* How It Works Section */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.howItWorksTitle}>How Video Promotion Works</Text>
          
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>10-Minute Hold Period</Text>
              <Text style={styles.stepDescription}>
                Your video enters a 10-minute hold period after promotion. Status shows as "Pending".
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Queue Entry</Text>
              <Text style={styles.stepDescription}>
                After 10 minutes, your video automatically enters the view queue with "Active" status.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>View Completion</Text>
              <Text style={styles.stepDescription}>
                Once your target views are reached, the video status changes to "Completed".
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Smart Deletion</Text>
              <Text style={styles.stepDescription}>
                Delete within 10 minutes for 100% refund, or after 10 minutes for 80% refund.
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <Text style={styles.tipText}>
            • Higher coin rewards attract more viewers faster
          </Text>
          <Text style={styles.tipText}>
            • Engaging content gets better completion rates
          </Text>
          <Text style={styles.tipText}>
            • Monitor your analytics to optimize future promotions
          </Text>
          <Text style={styles.tipText}>
            • Use the 10-minute window to make changes if needed
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  successOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginTop: 8,
  },
  formContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: 'white',
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
  formTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  validatingIcon: {
    marginLeft: 8,
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  validStatus: {
    backgroundColor: '#E8F5E8',
  },
  invalidStatus: {
    backgroundColor: '#FFE5E5',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  validText: {
    color: '#2E7D32',
  },
  invalidText: {
    color: '#C62828',
  },
  costSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  affordableText: {
    color: '#2ECC71',
  },
  unaffordableText: {
    color: '#E74C3C',
  },
  insufficientFunds: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    gap: 8,
  },
  insufficientText: {
    fontSize: 12,
    color: '#C62828',
    flex: 1,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  howItWorksSection: {
    margin: 16,
    backgroundColor: 'white',
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
  howItWorksTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tipsSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
  },
  tipsTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 8,
    lineHeight: 20,
  },
});