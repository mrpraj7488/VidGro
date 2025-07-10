import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Link, 
  Eye, 
  Clock, 
  ChevronDown, 
  Check,
  Play,
  DollarSign,
  Target,
  Timer,
  Zap
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  options: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  label: string;
  suffix: string;
}

const AndroidCompatibleDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  label,
  suffix,
}) => {
  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const renderItem = ({ item }: { item: number }) => (
    <Pressable
      key={item}
      style={[
        styles.dropdownItem,
        item === selectedValue && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelect(item)}
      android_ripple={{ color: '#E3F2FD' }}
    >
      <Text style={[
        styles.dropdownItemText,
        item === selectedValue && styles.selectedDropdownItemText
      ]}>
        {item} {suffix}
      </Text>
      {item === selectedValue && (
        <Check color="#800080" size={16} />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleBackdropPress}
      >
        <Pressable 
          style={styles.fullScreenModal}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable 
              onPress={onClose} 
              style={styles.closeButton}
              android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </LinearGradient>
          
          <ScrollView
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.modalListContent}
          >
            {options.map((item) => renderItem({ item }))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const promoteButtonScale = useSharedValue(1);

  const calculateCoinCost = (views: number, duration: number) => {
    const durationFactor = duration / 30; // 30 seconds as base
    return Math.ceil(views * durationFactor * 2); // 2 coins per view-duration unit
  };

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);
  const canAfford = (profile?.coins || 0) >= coinCost;

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

  const validateYouTubeUrl = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { isValid: false, title: '', error: 'Invalid YouTube URL' };
    }

    setIsValidatingUrl(true);
    try {
      // For demo purposes, we'll generate a title based on the video ID
      // In a real app, you'd use the YouTube API to fetch the actual title
      const demoTitle = `Video ${videoId.substring(0, 8)}`;
      
      setIsValidatingUrl(false);
      return { isValid: true, title: demoTitle, error: null };
    } catch (error) {
      setIsValidatingUrl(false);
      return { isValid: false, title: '', error: 'Failed to validate video' };
    }
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    
    if (url.trim()) {
      const validation = await validateYouTubeUrl(url);
      if (validation.isValid) {
        setVideoTitle(validation.title);
      } else {
        setVideoTitle('');
        if (validation.error && url.length > 10) {
          // Only show error for substantial input
          Alert.alert('Invalid URL', validation.error);
        }
      }
    } else {
      setVideoTitle('');
    }
  };

  const handlePromoteVideo = async () => {
    if (!user || !youtubeUrl.trim() || !videoTitle.trim()) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);
    promoteButtonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video with hold period
      const { data: newVideo, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle,
          description_param: '',
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to show updated coin balance
      await refreshProfile();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Video Promoted Successfully! 🎉',
        `Your video is now in the promotion queue. It will be active after a 10-minute hold period.`,
        [
          {
            text: 'View Analytics',
            onPress: () => router.push('/(tabs)/analytics')
          },
          { text: 'Promote Another', style: 'cancel' }
        ]
      );

      // Reset form
      setYoutubeUrl('');
      setVideoTitle('');
      setSelectedViews(50);
      setSelectedDuration(30);

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', error.message || 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const promoteButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: promoteButtonScale.value }],
  }));

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#800080', '#9B59B6']}
          style={styles.heroSection}
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
          {/* YouTube URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YouTube URL *</Text>
            <View style={styles.urlInputContainer}>
              <Link color="#800080" size={20} style={styles.urlIcon} />
              <TextInput
                style={styles.urlInput}
                placeholder="https://youtu.be/fCtfxT3n_Q8"
                placeholderTextColor="#999"
                value={youtubeUrl}
                onChangeText={handleUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {isValidatingUrl && (
                <ActivityIndicator size="small" color="#800080" style={styles.validatingIcon} />
              )}
            </View>
            {videoTitle ? (
              <View style={styles.videoPreview}>
                <Play color="#4CAF50" size={16} />
                <Text style={styles.videoPreviewText}>{videoTitle}</Text>
              </View>
            ) : null}
          </View>

          {/* Target Views Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Views</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <View style={styles.dropdownContent}>
                <Eye color="#800080" size={20} />
                <Text style={styles.dropdownText}>{selectedViews} views</Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Watch Duration Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Watch Duration</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <View style={styles.dropdownContent}>
                <Clock color="#800080" size={20} />
                <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Cost Summary */}
          <View style={styles.costSummary}>
            <View style={styles.costHeader}>
              <DollarSign color="#800080" size={24} />
              <Text style={styles.costTitle}>Promotion Cost</Text>
            </View>
            
            <View style={styles.costBreakdown}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Target Views:</Text>
                <Text style={styles.costValue}>{selectedViews}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Duration:</Text>
                <Text style={styles.costValue}>{selectedDuration}s</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Cost per View:</Text>
                <Text style={styles.costValue}>~{(coinCost / selectedViews).toFixed(1)} coins</Text>
              </View>
              <View style={[styles.costRow, styles.totalCostRow]}>
                <Text style={styles.totalCostLabel}>Total Cost:</Text>
                <Animated.View style={coinAnimatedStyle}>
                  <Text style={styles.totalCostValue}>🪙{coinCost}</Text>
                </Animated.View>
              </View>
            </View>

            {!canAfford && (
              <View style={styles.insufficientFunds}>
                <Text style={styles.insufficientFundsText}>
                  Insufficient coins. You need {coinCost - (profile?.coins || 0)} more coins.
                </Text>
              </View>
            )}
          </View>

          {/* Promote Button */}
          <Animated.View style={promoteButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!canAfford || !videoTitle || isPromoting) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!canAfford || !videoTitle || isPromoting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canAfford && videoTitle && !isPromoting ? ['#800080', '#9B59B6'] : ['#9CA3AF', '#6B7280']}
                style={styles.promoteButtonGradient}
              >
                {isPromoting ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.promoteButtonText}>Promoting...</Text>
                  </>
                ) : (
                  <>
                    <Target color="white" size={20} />
                    <Text style={styles.promoteButtonText}>Promote Video</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Timer color="#800080" size={16} />
                <Text style={styles.infoText}>
                  Videos are held for 10 minutes before entering the active queue
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Eye color="#800080" size={16} />
                <Text style={styles.infoText}>
                  Real users watch your video for the specified duration
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Target color="#800080" size={16} />
                <Text style={styles.infoText}>
                  Track progress in the Analytics tab
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dropdowns */}
      <AndroidCompatibleDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        label="Select Target Views"
        suffix="views"
      />

      <AndroidCompatibleDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        label="Select Duration"
        suffix="seconds"
      />
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
    paddingHorizontal: 16,
    paddingVertical: isSmallScreen ? 24 : 32,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIcon: {
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
    borderRadius: isSmallScreen ? 30 : 40,
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
    padding: 16,
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
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  urlIcon: {
    marginRight: 12,
  },
  urlInput: {
    flex: 1,
    height: 52,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
  },
  validatingIcon: {
    marginLeft: 8,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  videoPreviewText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    marginLeft: 12,
  },
  costSummary: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
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
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  costTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  costBreakdown: {
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  costLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
  },
  costValue: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#333',
    fontWeight: '500',
  },
  totalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  totalCostLabel: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  totalCostValue: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#800080',
  },
  insufficientFunds: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  insufficientFundsText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  promoteButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  promoteButtonDisabled: {
    opacity: 0.6,
  },
  promoteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 16 : 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
    borderLeftWidth: 4,
    borderLeftColor: '#800080',
  },
  infoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  // Modal styles for Android-compatible dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Increased opacity for better visibility on Android
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 20,
  },
  fullScreenModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: isSmallScreen ? '80%' : '70%',
    minHeight: isSmallScreen ? '50%' : '40%',
    width: '100%',
    maxWidth: isVerySmallScreen ? screenWidth - 20 : 400,
    // Enhanced shadow for Android
    ...Platform.select({
      android: {
        elevation: 24, // Increased elevation for better visibility
        backgroundColor: '#FFFFFF', // Explicit white background
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        backgroundColor: 'white',
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'white',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: isVerySmallScreen ? 18 : 20,
    color: 'white',
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    backgroundColor: 'white', // Explicit white background
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalListContent: {
    paddingBottom: 20,
    backgroundColor: 'white', // Explicit white background
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: isVerySmallScreen ? 48 : 56,
    backgroundColor: 'white', // Explicit white background for each item
  },
  selectedDropdownItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: '#800080',
    fontWeight: '600',
  },
});