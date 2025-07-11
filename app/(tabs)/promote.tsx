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
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Video, Play, DollarSign, Eye, Clock, ChevronDown, Check } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

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

const FuturisticDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  label,
  suffix,
}) => {
  const slideY = useSharedValue(-screenWidth);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      slideY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
      overlayOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
    } else {
      slideY.value = withTiming(-screenWidth, {
        duration: 300,
        easing: Easing.in(Easing.quad),
      });
      overlayOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [visible]);

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.dropdownOverlay, overlayAnimatedStyle]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
        <Animated.View style={[styles.dropdownModal, slideAnimatedStyle]}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.dropdownItem,
                  option === selectedValue && styles.selectedDropdownItem,
                ]}
                onPress={() => handleSelect(option)}
              >
                <Text style={[
                  styles.dropdownItemText,
                  option === selectedValue && styles.selectedDropdownItemText,
                ]}>
                  {option} {suffix}
                </Text>
                {option === selectedValue && (
                  <Check color="#800080" size={20} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  
  // GlobalHeader state management
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const coinBounce = useSharedValue(1);

  const extractVideoId = (url: string): string | null => {
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

  const fetchVideoTitle = async (videoId: string) => {
    try {
      setIsLoadingTitle(true);
      // Simulate API call - in real app, you'd use YouTube API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVideoTitle(`Video Title for ${videoId}`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('Unknown Video');
    } finally {
      setIsLoadingTitle(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const videoId = extractVideoId(url);
    if (videoId) {
      fetchVideoTitle(videoId);
    } else {
      setVideoTitle('');
    }
  };

  const calculateCoinCost = (views: number, duration: number) => {
    const durationFactor = duration / 30;
    return Math.ceil(views * durationFactor * 2);
  };

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

    const coinCost = calculateCoinCost(selectedViews, selectedDuration);
    
    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

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

      // Create video promotion with hold
      const { data: newVideo, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle || `YouTube Video ${videoId}`,
          description_param: '',
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3,
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to show updated coins
      await refreshProfile();

      // Animate coin update
      coinBounce.value = withSpring(1.2, {
        damping: 15,
        stiffness: 150,
      }, () => {
        coinBounce.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      });

      Alert.alert(
        'Success!',
        `Your video is now being promoted! It will be active in the queue after a 10-minute hold period.`,
        [{ text: 'OK', onPress: () => {
          setYoutubeUrl('');
          setVideoTitle('');
          router.push('/(tabs)/analytics');
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

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);
  const canAfford = (profile?.coins || 0) >= coinCost;

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="Promote" 
        showCoinDisplay={true} 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Video color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Promote Your Video</Text>
          <Text style={styles.heroSubtitle}>
            Get real views from our community and grow your channel
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Video Details</Text>
          
          {/* YouTube URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YouTube URL *</Text>
            <TextInput
              style={styles.textInput}
              value={youtubeUrl}
              onChangeText={handleUrlChange}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isLoadingTitle && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#800080" />
                <Text style={styles.loadingText}>Loading video details...</Text>
              </View>
            )}
            {videoTitle && !isLoadingTitle && (
              <View style={styles.videoPreview}>
                <Play color="#800080" size={16} />
                <Text style={styles.videoPreviewText}>{videoTitle}</Text>
              </View>
            )}
          </View>

          {/* Target Views */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Views</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(true)}
            >
              <Text style={styles.dropdownText}>{selectedViews} views</Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Watch Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Watch Duration</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(true)}
            >
              <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Cost Summary */}
          <View style={styles.costSummary}>
            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Eye color="#4ECDC4" size={20} />
                <Text style={styles.costLabel}>Views</Text>
                <Text style={styles.costValue}>{selectedViews}</Text>
              </View>
              <View style={styles.costItem}>
                <Clock color="#FFA726" size={20} />
                <Text style={styles.costLabel}>Duration</Text>
                <Text style={styles.costValue}>{selectedDuration}s</Text>
              </View>
              <Animated.View style={[styles.costItem, coinAnimatedStyle]}>
                <DollarSign color="#800080" size={20} />
                <Text style={styles.costLabel}>Cost</Text>
                <Text style={[styles.costValue, !canAfford && styles.insufficientFunds]}>
                  🪙{coinCost}
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Promote Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!canAfford || !youtubeUrl.trim() || isPromoting) && styles.promoteButtonDisabled,
              ]}
              onPress={handlePromoteVideo}
              disabled={!canAfford || !youtubeUrl.trim() || isPromoting}
            >
              <Video color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {isPromoting ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {!canAfford && youtubeUrl.trim() && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Insufficient coins. You need 🪙{coinCost - (profile?.coins || 0)} more coins.
              </Text>
            </View>
          )}
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Enter your YouTube video URL</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Choose target views and watch duration</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Pay with coins and your video enters the queue</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Real users watch your video and you get views!</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dropdowns with high z-index */}
      <FuturisticDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        label="Select Target Views"
        suffix="views"
      />

      <FuturisticDropdown
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
  formSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  videoPreviewText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
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
  costSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  costItem: {
    alignItems: 'center',
    flex: 1,
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
  insufficientFunds: {
    color: '#E74C3C',
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
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  howItWorksSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#800080',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    lineHeight: 20,
  },
  // Dropdown styles with high z-index
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    zIndex: 1001,
    elevation: 1001,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 1001,
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#800080',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  dropdownList: {
    flex: 1,
    backgroundColor: 'white',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedDropdownItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedDropdownItemText: {
    color: '#800080',
    fontWeight: '600',
  },
});