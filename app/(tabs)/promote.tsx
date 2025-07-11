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
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Play, 
  ChevronDown, 
  Check, 
  DollarSign, 
  Eye, 
  Clock, 
  Zap,
  AlertCircle,
  TrendingUp
} from 'lucide-react-native';
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
        duration: 250,
        easing: Easing.in(Easing.quad),
      });
      overlayOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [visible]);

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropPress = () => {
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
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <Animated.View 
        style={[
          styles.dropdownOverlay,
          overlayAnimatedStyle,
          {
            zIndex: 1000, // Higher than GlobalHeader's 100
            elevation: 1000, // Higher than GlobalHeader's 100
          },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleBackdropPress} />
        <Animated.View style={[styles.dropdownModal, slideAnimatedStyle]}>
          <LinearGradient
            colors={['#FF4757', '#FF6B8A']}
            style={styles.dropdownHeader}
          >
            <Text style={styles.dropdownTitle}>{label}</Text>
            <Pressable 
              onPress={onClose} 
              style={styles.closeButton}
              android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </LinearGradient>
          
          <ScrollView 
            style={styles.dropdownList}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.dropdownItem,
                  option === selectedValue && styles.selectedDropdownItem
                ]}
                onPress={() => handleSelect(option)}
                android_ripple={{ color: '#E3F2FD' }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  option === selectedValue && styles.selectedDropdownItemText
                ]}>
                  {option} {suffix}
                </Text>
                {option === selectedValue && (
                  <Check color="#FF4757" size={16} />
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
  
  // Menu state for GlobalHeader
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const coinBounce = useSharedValue(1);

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // If it's already just an ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim();
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

  const fetchVideoTitle = async (videoId: string) => {
    try {
      setIsValidating(true);
      
      // For demo purposes, we'll generate a title based on the video ID
      // In a real app, you'd use the YouTube API
      const demoTitles = [
        'Amazing Tutorial Video',
        'Funny Moments Compilation',
        'How to Build Something Cool',
        'Epic Gaming Highlights',
        'Educational Content',
        'Music Video',
        'Vlog Adventure',
        'Product Review',
        'Cooking Recipe',
        'Travel Experience'
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const randomTitle = demoTitles[Math.floor(Math.random() * demoTitles.length)];
      setVideoTitle(`${randomTitle} - ${videoId}`);
      
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('YouTube Video');
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const videoId = extractVideoId(youtubeUrl);
    if (videoId) {
      fetchVideoTitle(videoId);
    } else {
      setVideoTitle('');
    }
  }, [youtubeUrl]);

  const calculateCoinCost = () => {
    const durationFactor = selectedDuration / 30;
    return Math.ceil(selectedViews * durationFactor * 2);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube video URL or video ID');
      return;
    }

    const coinCost = calculateCoinCost();
    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to promote this video.`);
      return;
    }

    setIsSubmitting(true);
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

      // Create video promotion with 10-minute hold
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle || 'YouTube Video',
          description_param: '',
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3,
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to show updated coin balance
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
        'Video Promoted Successfully! 🎉',
        `Your video is now on hold for 10 minutes before entering the active queue. You'll receive detailed analytics once it goes live.`,
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
      setIsSubmitting(false);
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const coinCost = calculateCoinCost();
  const canAfford = (profile?.coins || 0) >= coinCost;
  const isFormValid = youtubeUrl.trim() !== '' && extractVideoId(youtubeUrl) !== null;

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <TrendingUp color="white" size={isVerySmallScreen ? 40 : 48} />
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
            <Text style={styles.inputLabel}>YouTube Video URL or ID</Text>
            <TextInput
              style={styles.textInput}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://youtube.com/watch?v=... or video ID"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isValidating && (
              <Text style={styles.validatingText}>Validating video...</Text>
            )}
            {videoTitle && !isValidating && (
              <Text style={styles.videoTitleText}>📹 {videoTitle}</Text>
            )}
          </View>

          {/* Target Views */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Views</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <Eye color="#666" size={20} />
              <Text style={styles.dropdownText}>{selectedViews} views</Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Watch Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Required Watch Duration</Text>
            <Pressable 
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <Clock color="#666" size={20} />
              <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={styles.sectionTitle}>Promotion Summary</Text>
          
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Target Views:</Text>
              <Text style={styles.costValue}>{selectedViews}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Watch Duration:</Text>
              <Text style={styles.costValue}>{selectedDuration}s</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Reward per View:</Text>
              <Text style={styles.costValue}>🪙3</Text>
            </View>
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Cost:</Text>
              <Animated.View style={coinAnimatedStyle}>
                <Text style={[styles.totalValue, !canAfford && styles.insufficientFunds]}>
                  🪙{coinCost}
                </Text>
              </Animated.View>
            </View>
            
            {!canAfford && (
              <View style={styles.warningContainer}>
                <AlertCircle color="#E74C3C" size={16} />
                <Text style={styles.warningText}>
                  Insufficient coins. You have 🪙{profile?.coins || 0}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || !canAfford || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || !canAfford || isSubmitting}
            >
              <Zap color="white" size={20} />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.submitNote}>
            Your video will be held for 10 minutes before entering the active queue
          </Text>
        </View>
      </ScrollView>

      {/* Dropdowns */}
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
        label="Select Duration (seconds)"
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
    padding: isVerySmallScreen ? 24 : 32,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
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
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  validatingText: {
    fontSize: 12,
    color: '#FF4757',
    marginTop: 8,
    fontStyle: 'italic',
  },
  videoTitleText: {
    fontSize: isVerySmallScreen ? 12 : 13,
    color: '#4CAF50',
    marginTop: 8,
    fontWeight: '500',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
  },
  costSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
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
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: isVerySmallScreen ? 14 : 15,
    color: '#666',
  },
  costValue: {
    fontSize: isVerySmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  insufficientFunds: {
    color: '#E74C3C',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: isVerySmallScreen ? 12 : 13,
    color: '#E74C3C',
    flex: 1,
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  submitNote: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  // Dropdown Modal Styles with enhanced z-index
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Ensure opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 20,
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
    maxHeight: isSmallScreen ? '80%' : '70%',
    minHeight: isSmallScreen ? '50%' : '40%',
    width: '100%',
    maxWidth: isVerySmallScreen ? screenWidth - 20 : 400,
    ...Platform.select({
      android: {
        elevation: 1000, // Higher than GlobalHeader
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
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
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownTitle: {
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
  },
  closeButtonText: {
    fontSize: isVerySmallScreen ? 18 : 20,
    color: 'white',
    fontWeight: 'bold',
  },
  dropdownList: {
    flex: 1,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  },
  selectedDropdownItem: {
    backgroundColor: '#FFF5F5',
  },
  dropdownItemText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    flex: 1,
  },
  selectedDropdownItemText: {
    color: '#FF4757',
    fontWeight: '600',
  },
});