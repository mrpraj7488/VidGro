import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Video, Eye, Clock, ChevronDown, Check, CircleAlert as AlertCircle, DollarSign, Play, Coins } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

interface DropdownOption {
  value: number;
  label: string;
  description?: string;
}

interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  options: DropdownOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  title: string;
}

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 10, label: '10 Views', description: 'Quick promotion' },
  { value: 25, label: '25 Views', description: 'Small audience' },
  { value: 50, label: '50 Views', description: 'Medium reach' },
  { value: 100, label: '100 Views', description: 'Good exposure' },
  { value: 200, label: '200 Views', description: 'Wide reach' },
  { value: 500, label: '500 Views', description: 'Maximum impact' },
];

const DURATION_OPTIONS: DropdownOption[] = [
  { value: 30, label: '30 Seconds', description: 'Quick watch' },
  { value: 45, label: '45 Seconds', description: 'Standard duration' },
  { value: 60, label: '1 Minute', description: 'Detailed view' },
  { value: 90, label: '1.5 Minutes', description: 'Extended watch' },
  { value: 120, label: '2 Minutes', description: 'Full engagement' },
];

const SmoothDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title,
}) => {
  const slideY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      slideY.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      slideY.value = withTiming(screenHeight, {
        duration: 250,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const renderItem = ({ item }: { item: DropdownOption }) => (
    <Pressable
      style={[
        styles.dropdownItem,
        item.value === selectedValue && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelect(item.value)}
      android_ripple={{ color: '#E3F2FD' }}
    >
      <View style={styles.dropdownItemContent}>
        <View style={styles.dropdownItemText}>
          <Text style={[
            styles.dropdownItemLabel,
            item.value === selectedValue && styles.selectedDropdownItemLabel
          ]}>
            {item.label}
          </Text>
          {item.description && (
            <Text style={styles.dropdownItemDescription}>
              {item.description}
            </Text>
          )}
        </View>
        {item.value === selectedValue && (
          <Check color="#FF4757" size={20} />
        )}
      </View>
    </Pressable>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalBackdrop, backdropAnimatedStyle]}>
        <Pressable 
          style={styles.backdropPressable} 
          onPress={handleBackdropPress}
        />
        
        <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable 
              onPress={onClose} 
              style={styles.closeButton}
              android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item) => item.value.toString()}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.optionsListContent}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);

  const calculateCoinCost = (views: number, duration: number) => {
    // Base cost calculation: views * duration factor
    const durationFactor = duration / 30; // 30 seconds as base
    return Math.ceil(views * durationFactor * 2); // 2 coins per view-duration unit
  };

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

  const validateYouTubeVideo = async (videoId: string): Promise<{ title: string; duration: number } | null> => {
    try {
      // For demo purposes, we'll simulate validation
      // In a real app, you'd use YouTube API here
      const mockTitles = [
        'Amazing Tutorial Video',
        'How to Build Apps',
        'React Native Guide',
        'Mobile Development Tips',
        'Programming Best Practices'
      ];
      
      const randomTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)];
      const randomDuration = Math.floor(Math.random() * 300) + 60; // 1-5 minutes
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        title: randomTitle,
        duration: randomDuration
      };
    } catch (error) {
      console.error('Error validating video:', error);
      return null;
    }
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setVideoTitle('');
    
    if (!url.trim()) return;
    
    const videoId = extractVideoId(url);
    if (!videoId) return;
    
    setIsValidating(true);
    try {
      const videoInfo = await validateYouTubeVideo(videoId);
      if (videoInfo) {
        setVideoTitle(videoInfo.title);
      }
    } catch (error) {
      console.error('Error validating video:', error);
    } finally {
      setIsValidating(false);
    }
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
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);

    try {
      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle || 'YouTube Video'}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video promotion with hold
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle || 'YouTube Video',
          description_param: '',
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to update coin balance
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
        `Your video has been submitted for promotion! It will be active in the queue after a 10-minute hold period.`,
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
      setSelectedViews(50);
      setSelectedDuration(30);

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);
  const canAfford = (profile?.coins || 0) >= coinCost;

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

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Video Details</Text>
          
          {/* YouTube URL Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YouTube Video URL</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={youtubeUrl}
                onChangeText={handleUrlChange}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isValidating && (
                <ActivityIndicator 
                  size="small" 
                  color="#FF4757" 
                  style={styles.validatingIndicator}
                />
              )}
            </View>
            {videoTitle && (
              <View style={styles.videoPreview}>
                <Play color="#FF4757" size={16} />
                <Text style={styles.videoTitle}>{videoTitle}</Text>
              </View>
            )}
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
                <Eye color="#666" size={20} />
                <Text style={styles.dropdownText}>
                  {selectedViews} views
                </Text>
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
                <Clock color="#666" size={20} />
                <Text style={styles.dropdownText}>
                  {selectedDuration} seconds
                </Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={styles.sectionTitle}>Promotion Cost</Text>
          
          <View style={styles.costCard}>
            <View style={styles.costHeader}>
              <Animated.View style={[styles.costIcon, coinAnimatedStyle]}>
                <Coins color="#FF4757" size={24} />
              </Animated.View>
              <View style={styles.costInfo}>
                <Text style={styles.costAmount}>🪙{coinCost}</Text>
                <Text style={styles.costDescription}>
                  {selectedViews} views × {selectedDuration}s duration
                </Text>
              </View>
            </View>
            
            <View style={styles.costBreakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Your Balance:</Text>
                <Text style={[
                  styles.breakdownValue,
                  canAfford ? styles.sufficientBalance : styles.insufficientBalance
                ]}>
                  🪙{profile?.coins || 0}
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>After Promotion:</Text>
                <Text style={styles.breakdownValue}>
                  🪙{Math.max(0, (profile?.coins || 0) - coinCost)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!canAfford || !youtubeUrl.trim() || isPromoting) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!canAfford || !youtubeUrl.trim() || isPromoting}
          >
            {isPromoting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Video color="white" size={20} />
            )}
            <Text style={styles.promoteButtonText}>
              {isPromoting ? 'Promoting...' : 'Promote Video'}
            </Text>
          </TouchableOpacity>

          {!canAfford && youtubeUrl.trim() && (
            <View style={styles.warningContainer}>
              <AlertCircle color="#E74C3C" size={16} />
              <Text style={styles.warningText}>
                Insufficient coins. You need {coinCost - (profile?.coins || 0)} more coins.
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>1</Text>
              <Text style={styles.infoText}>
                Your video enters a 10-minute hold period
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>2</Text>
              <Text style={styles.infoText}>
                After hold, it becomes active in the viewing queue
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>3</Text>
              <Text style={styles.infoText}>
                Users watch your video and you get real engagement
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dropdowns */}
      <SmoothDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        title="Select Target Views"
      />

      <SmoothDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        title="Select Watch Duration"
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
  inputContainer: {
    position: 'relative',
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
  validatingIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  videoTitle: {
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
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  costIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  costInfo: {
    flex: 1,
  },
  costAmount: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  costDescription: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
  },
  costBreakdown: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sufficientBalance: {
    color: '#2ECC71',
  },
  insufficientBalance: {
    color: '#E74C3C',
  },
  buttonSection: {
    padding: isSmallScreen ? 16 : 20,
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#E74C3C',
    marginLeft: 8,
    flex: 1,
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
    marginBottom: 16,
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4757',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
    minHeight: screenHeight * 0.4,
    ...Platform.select({
      android: {
        elevation: 16,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      web: {
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF4757',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    marginRight: 16,
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
  optionsList: {
    flex: 1,
  },
  optionsListContent: {
    paddingBottom: 20,
  },
  dropdownItem: {
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: isVerySmallScreen ? 64 : 72,
    justifyContent: 'center',
  },
  selectedDropdownItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemLabel: {
    fontSize: isVerySmallScreen ? 15 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  selectedDropdownItemLabel: {
    color: '#FF4757',
    fontWeight: '600',
  },
  dropdownItemDescription: {
    fontSize: isVerySmallScreen ? 12 : 13,
    color: '#666',
  },
});