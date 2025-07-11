import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Search, Eye, Clock, TrendingUp, ChevronDown, Check, ChevronUp, Play, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react-native';
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

interface DropdownOption {
  value: number;
  label: string;
}

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 10, label: '10 views' },
  { value: 25, label: '25 views' },
  { value: 35, label: '35 views' },
  { value: 50, label: '50 views' },
  { value: 100, label: '100 views' },
  { value: 200, label: '200 views' },
  { value: 300, label: '300 views' },
  { value: 500, label: '500 views' },
];

const DURATION_OPTIONS: DropdownOption[] = [
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
  { value: 90, label: '90 seconds' },
  { value: 120, label: '120 seconds' },
];

interface FuturisticDropdownProps {
  visible: boolean;
  onClose: () => void;
  options: DropdownOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  title: string;
}

const FuturisticDropdown: React.FC<FuturisticDropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title,
}) => {
  const slideY = useSharedValue(screenWidth);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      slideY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      slideY.value = withTiming(screenWidth, { duration: 250 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.dropdownOverlay, overlayStyle]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
        <Animated.View style={[styles.dropdownModal, modalStyle]}>
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            style={styles.dropdownHeader}
          >
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedValue === option.value && styles.selectedOption,
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  selectedValue === option.value && styles.selectedOptionText,
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Check color="#800080" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isPromoting, setIsPromoting] = useState(false);
  
  // Dropdown state
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  // Video validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    title?: string;
    thumbnail?: string;
    error?: string;
  } | null>(null);
  const [showCompatibilityTest, setShowCompatibilityTest] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const validationScale = useSharedValue(0);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
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

  const validateYouTubeVideo = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setValidationResult({
        isValid: false,
        error: 'Invalid YouTube URL format'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Simulate video validation (in real app, you'd use YouTube API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock validation result
      const mockTitle = "Sample Video Title - " + videoId;
      const mockThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      setValidationResult({
        isValid: true,
        title: mockTitle,
        thumbnail: mockThumbnail
      });
      
      if (!videoTitle) {
        setVideoTitle(mockTitle);
      }
      
      setShowCompatibilityTest(true);
      validationScale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: 'Failed to validate video. Please check the URL and try again.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const calculateCoinCost = () => {
    const baseCost = selectedViews * 2;
    const durationMultiplier = selectedDuration / 30;
    return Math.ceil(baseCost * durationMultiplier);
  };

  const handlePromoteVideo = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    if (!youtubeUrl || !videoTitle) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validationResult?.isValid) {
      Alert.alert('Error', 'Please validate your YouTube URL first');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Invalid YouTube URL');
      return;
    }

    const coinCost = calculateCoinCost();
    
    if (profile.coins < coinCost) {
      Alert.alert(
        'Insufficient Coins',
        `You need 🪙${coinCost} coins to promote this video. You currently have 🪙${profile.coins} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Coins', onPress: () => router.push('/buy-coins') }
        ]
      );
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
          coin_reward_param: 3,
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to show updated coin balance
      await refreshProfile();

      Alert.alert(
        'Video Promoted Successfully! 🎉',
        `Your video is now in the promotion queue. It will be active after a 10-minute hold period.`,
        [
          { text: 'View Analytics', onPress: () => router.push('/(tabs)/analytics') },
          { text: 'Promote Another', onPress: () => {
            setYoutubeUrl('');
            setVideoTitle('');
            setValidationResult(null);
            setShowCompatibilityTest(false);
            validationScale.value = 0;
          }}
        ]
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

  const validationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: validationScale.value }],
    opacity: validationScale.value,
  }));

  const coinCost = calculateCoinCost();
  const canAfford = profile ? profile.coins >= coinCost : false;

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* YouTube URL Input */}
        <View style={styles.section}>
          <Text style={styles.label}>YouTube URL *</Text>
          <View style={styles.inputContainer}>
            <Link color="#800080" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="https://youtu.be/fCtFxT3n_l0"
              placeholderTextColor="#999"
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.validateButton}
              onPress={() => validateYouTubeVideo(youtubeUrl)}
              disabled={isValidating || !youtubeUrl}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#800080" />
              ) : (
                <Search color="#800080" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Compatibility Test Results */}
        {showCompatibilityTest && validationResult && (
          <Animated.View style={[styles.compatibilitySection, validationAnimatedStyle]}>
            <TouchableOpacity
              style={styles.compatibilityHeader}
              onPress={() => setShowCompatibilityTest(!showCompatibilityTest)}
            >
              <Text style={styles.compatibilityTitle}>
                Compatibility Test {validationResult.isValid ? '✅' : '❌'}
              </Text>
              <ChevronUp color="#800080" size={20} />
            </TouchableOpacity>
            
            {validationResult.isValid ? (
              <View style={styles.compatibilityContent}>
                {validationResult.thumbnail && (
                  <Image
                    source={{ uri: validationResult.thumbnail }}
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.successMessage}>
                  <CheckCircle color="#4CAF50" size={20} />
                  <Text style={styles.successText}>
                    ✅ Video is embeddable and ready for promotion!
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.errorMessage}>
                <AlertCircle color="#E74C3C" size={20} />
                <Text style={styles.errorText}>
                  {validationResult.error || 'Video validation failed'}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Video Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Video Title *</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>T</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter video title"
              placeholderTextColor="#999"
              value={videoTitle}
              onChangeText={setVideoTitle}
              multiline
            />
          </View>
          {validationResult?.title && videoTitle !== validationResult.title && (
            <TouchableOpacity
              style={styles.titleSuggestion}
              onPress={() => setVideoTitle(validationResult.title!)}
            >
              <Text style={styles.suggestionLabel}>Title detected:</Text>
              <Text style={styles.suggestionText}>{validationResult.title}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Number of Views Dropdown */}
        <View style={styles.section}>
          <Text style={styles.label}>Number of Views *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowViewsDropdown(true)}
          >
            <Eye color="#800080" size={20} />
            <Text style={styles.dropdownText}>
              {VIEW_OPTIONS.find(opt => opt.value === selectedViews)?.label || 'Select views'}
            </Text>
            <ChevronDown color="#800080" size={20} />
          </TouchableOpacity>
        </View>

        {/* Duration Dropdown */}
        <View style={styles.section}>
          <Text style={styles.label}>Set Duration (seconds) *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDurationDropdown(true)}
          >
            <Clock color="#800080" size={20} />
            <Text style={styles.dropdownText}>
              {DURATION_OPTIONS.find(opt => opt.value === selectedDuration)?.label || 'Select duration'}
            </Text>
            <ChevronDown color="#800080" size={20} />
          </TouchableOpacity>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <View style={styles.costHeader}>
            <Text style={styles.costTitle}>Promotion Cost</Text>
            <Text style={[styles.costAmount, !canAfford && styles.costAmountError]}>
              🪙{coinCost}
            </Text>
          </View>
          <View style={styles.costBreakdown}>
            <Text style={styles.costDetail}>• {selectedViews} views × 2 coins = 🪙{selectedViews * 2}</Text>
            <Text style={styles.costDetail}>• Duration multiplier: {(selectedDuration / 30).toFixed(1)}x</Text>
            <Text style={styles.costDetail}>• Each viewer earns 3 coins for watching</Text>
          </View>
          {!canAfford && (
            <View style={styles.insufficientFunds}>
              <AlertCircle color="#E74C3C" size={16} />
              <Text style={styles.insufficientText}>
                Insufficient coins. You have 🪙{profile?.coins || 0}
              </Text>
            </View>
          )}
        </View>

        {/* Promote Button */}
        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!canAfford || !validationResult?.isValid || isPromoting) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!canAfford || !validationResult?.isValid || isPromoting}
          >
            <TrendingUp color="white" size={20} />
            <Text style={styles.promoteButtonText}>
              {isPromoting ? 'Promoting Video...' : 'Promote Video'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>• Your video enters a 10-minute hold period</Text>
          <Text style={styles.infoText}>• After hold, it becomes active in the viewing queue</Text>
          <Text style={styles.infoText}>• Users earn 3 coins for watching your video</Text>
          <Text style={styles.infoText}>• Track progress in the Analytics tab</Text>
        </View>
      </ScrollView>

      {/* Dropdowns with proper z-index */}
      <FuturisticDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        title="Select Number of Views"
      />

      <FuturisticDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        title="Select Duration (seconds)"
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
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  inputIcon: {
    marginRight: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#800080',
  },
  textInput: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    paddingVertical: 12,
  },
  validateButton: {
    padding: 8,
  },
  compatibilitySection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
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
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  compatibilityTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  compatibilityContent: {
    padding: 16,
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#C62828',
    marginLeft: 8,
    flex: 1,
  },
  titleSuggestion: {
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#800080',
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#333',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownText: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    marginLeft: 12,
  },
  costSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
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
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  costTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  costAmount: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#800080',
  },
  costAmountError: {
    color: '#E74C3C',
  },
  costBreakdown: {
    marginBottom: 12,
  },
  costDetail: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    marginBottom: 4,
  },
  insufficientFunds: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
  },
  insufficientText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#E74C3C',
    marginLeft: 6,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  infoSection: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#1976D2',
    marginBottom: 4,
  },
  // Dropdown Modal Styles with proper z-index
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000, // Higher than GlobalHeader modal
    elevation: 1000, // Higher than GlobalHeader modal
  },
  overlayPressable: {
    flex: 1,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 1000, // Higher than GlobalHeader modal
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#F3E8FF',
  },
  optionText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#800080',
    fontWeight: '600',
  },
});