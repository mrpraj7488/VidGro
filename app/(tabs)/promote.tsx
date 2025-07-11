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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Play, 
  Eye, 
  Clock, 
  ChevronDown, 
  Check, 
  TrendingUp,
  Zap,
  Target,
  DollarSign
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface FuturisticDropdownProps {
  visible: boolean;
  onClose: () => void;
  options: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  label: string;
  suffix: string;
}

const FuturisticDropdown: React.FC<FuturisticDropdownProps> = ({
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

  const handleBackdropPress = () => {
    onClose();
  };

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const renderItem = (item: number, index: number) => (
    <Pressable
      key={item}
      style={[
        styles.dropdownItem,
        item === selectedValue && styles.selectedDropdownItem,
        index === options.length - 1 && styles.lastDropdownItem,
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
        <Check color="#FF4757" size={16} />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <Animated.View style={[
        styles.dropdownOverlay,
        overlayAnimatedStyle,
        {
          zIndex: 1000, // Higher than GlobalHeader modal
          elevation: 1000, // Higher than GlobalHeader modal
        },
      ]}>
        <Pressable
          style={styles.overlayPressable}
          onPress={handleBackdropPress}
        />
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
            contentContainerStyle={styles.dropdownListContent}
          >
            {options.map((item, index) => renderItem(item, index))}
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
  const [isPromoting, setIsPromoting] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const coinBounce = useSharedValue(1);

  const calculateCoinCost = (views: number, duration: number) => {
    const durationFactor = duration / 30;
    return Math.ceil(views * durationFactor * 2);
  };

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);
  const canAfford = (profile?.coins || 0) >= coinCost;

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
    setIsLoadingTitle(true);
    try {
      // In a real app, you would use YouTube API here
      // For now, we'll use a placeholder
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVideoTitle(`Video ${videoId}`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('Unknown Video');
    } finally {
      setIsLoadingTitle(false);
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

    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video.`);
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

      // Create video promotion with 10-minute hold
      const { data: videoData, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: videoTitle || `Video ${videoId}`,
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
        `Your video is now in the queue and will be active after a 10-minute hold period. Target: ${selectedViews} views in ${selectedDuration} seconds each.`,
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
      <GlobalHeader 
        title="Promote" 
        showCoinDisplay={true} 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />

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
            {isLoadingTitle && (
              <View style={styles.loadingTitle}>
                <ActivityIndicator size="small" color="#FF4757" />
                <Text style={styles.loadingTitleText}>Loading video info...</Text>
              </View>
            )}
            {videoTitle && !isLoadingTitle && (
              <Text style={styles.videoTitlePreview}>{videoTitle}</Text>
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
              <View style={styles.dropdownContent}>
                <Eye color="#666" size={20} />
                <Text style={styles.dropdownText}>{selectedViews} views</Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Watch Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Watch Duration</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <View style={styles.dropdownContent}>
                <Clock color="#666" size={20} />
                <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={styles.sectionTitle}>Promotion Summary</Text>
          
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Target color="#4ECDC4" size={20} />
                <Text style={styles.costLabel}>Target Views</Text>
                <Text style={styles.costValue}>{selectedViews}</Text>
              </View>
              <View style={styles.costItem}>
                <Clock color="#FFA726" size={20} />
                <Text style={styles.costLabel}>Duration</Text>
                <Text style={styles.costValue}>{selectedDuration}s</Text>
              </View>
            </View>
            
            <View style={styles.totalCostRow}>
              <View style={styles.totalCostContent}>
                <Animated.View style={[styles.coinIcon, coinAnimatedStyle]}>
                  <Text style={styles.coinEmoji}>🪙</Text>
                </Animated.View>
                <Text style={styles.totalCostLabel}>Total Cost</Text>
              </View>
              <Text style={[
                styles.totalCostValue,
                !canAfford && styles.insufficientFunds
              ]}>
                🪙{coinCost}
              </Text>
            </View>
            
            {!canAfford && (
              <View style={styles.insufficientFundsNotice}>
                <Text style={styles.insufficientFundsText}>
                  Insufficient coins. You have 🪙{profile?.coins || 0}, need 🪙{coinCost}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.promoteSection}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!canAfford || isPromoting || !youtubeUrl.trim()) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!canAfford || isPromoting || !youtubeUrl.trim()}
            >
              <Zap color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {isPromoting ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Your video enters a 10-minute hold period</Text>
            <Text style={styles.infoItem}>• After hold, it becomes active in the viewing queue</Text>
            <Text style={styles.infoItem}>• Users earn 3 coins for watching your video</Text>
            <Text style={styles.infoItem}>• Track progress in the Analytics tab</Text>
          </View>
        </View>
      </ScrollView>

      {/* Dropdowns with proper z-index */}
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
  loadingTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  loadingTitleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  videoTitlePreview: {
    fontSize: 14,
    color: '#4ECDC4',
    marginTop: 8,
    paddingHorizontal: 4,
    fontWeight: '500',
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
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    marginLeft: 12,
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
    marginBottom: 16,
  },
  costItem: {
    alignItems: 'center',
    flex: 1,
  },
  costLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  costValue: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalCostContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    marginRight: 8,
  },
  coinEmoji: {
    fontSize: 20,
  },
  totalCostLabel: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  totalCostValue: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  insufficientFunds: {
    color: '#E74C3C',
  },
  insufficientFundsNotice: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  insufficientFundsText: {
    fontSize: 12,
    color: '#C53030',
    textAlign: 'center',
  },
  promoteSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    marginBottom: 32,
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
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    paddingLeft: 8,
  },
  infoItem: {
    fontSize: isVerySmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  // Dropdown Modal Styles with proper z-index
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Proper opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 20,
    // Critical z-index values to stay above GlobalHeader
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
  dropdownListContent: {
    paddingBottom: 20,
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
  lastDropdownItem: {
    borderBottomWidth: 0,
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