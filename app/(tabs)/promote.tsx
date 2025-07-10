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
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Play, Eye, Clock, ChevronDown, Check, X } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
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

const SmoothDropdown: React.FC<DropdownProps> = ({
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
        <Check color="#3498DB" size={16} />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleBackdropPress}
      >
        <Pressable 
          style={styles.fullScreenModal}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
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
            keyExtractor={(item) => item.toString()}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.modalListContent}
          />
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
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);
  const promoteButtonScale = useSharedValue(1);

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
      // For demo purposes, we'll generate a title based on the video ID
      // In a real app, you'd use the YouTube API
      const demoTitles = [
        'Amazing Tutorial Video',
        'How to Build Apps',
        'React Native Guide',
        'Programming Tips',
        'Tech Review',
        'Educational Content',
        'Creative Project',
        'Learning Resource'
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const randomTitle = demoTitles[Math.floor(Math.random() * demoTitles.length)];
      setVideoTitle(`${randomTitle} - ${videoId.substring(0, 6)}`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle(`Video ${videoId.substring(0, 8)}`);
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

  const calculateCoinCost = () => {
    const durationFactor = selectedDuration / 30;
    return Math.ceil(selectedViews * durationFactor * 2);
  };

  const handlePromoteVideo = async () => {
    if (!user || !youtubeUrl.trim() || !videoTitle.trim()) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    const coinCost = calculateCoinCost();
    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to promote this video.`);
      return;
    }

    setIsPromoting(true);
    promoteButtonScale.value = withSequence(
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
          duration_seconds_param: selectedDuration,
          coin_cost_param: coinCost,
          coin_reward_param: 3,
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
        [{ text: 'Great!', onPress: () => {
          setYoutubeUrl('');
          setVideoTitle('');
        }}]
      );

    } catch (error) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
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

  const coinCost = calculateCoinCost();
  const canAfford = (profile?.coins || 0) >= coinCost;
  const isFormValid = youtubeUrl.trim() && videoTitle.trim() && extractVideoId(youtubeUrl);

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
              <Play color="white" size={isVerySmallScreen ? 32 : 40} />
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
            <Text style={styles.inputLabel}>YouTube URL or Video ID</Text>
            <TextInput
              style={styles.textInput}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://youtube.com/watch?v=... or video ID"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Video Title Display */}
          {youtubeUrl && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Video Title</Text>
              <View style={styles.titleContainer}>
                {isLoadingTitle ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#800080" />
                    <Text style={styles.loadingText}>Loading title...</Text>
                  </View>
                ) : (
                  <Text style={styles.videoTitleText} numberOfLines={2}>
                    {videoTitle || 'Enter a valid YouTube URL to see title'}
                  </Text>
                )}
              </View>
            </View>
          )}

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
                <Clock color="#666" size={20} />
                <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              </View>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSection}>
          <Text style={styles.sectionTitle}>Promotion Cost</Text>
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Target Views:</Text>
              <Text style={styles.costValue}>{selectedViews}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Watch Duration:</Text>
              <Text style={styles.costValue}>{selectedDuration}s</Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costRow}>
              <Text style={styles.totalLabel}>Total Cost:</Text>
              <Animated.View style={[styles.totalCostContainer, coinAnimatedStyle]}>
                <Text style={styles.totalCost}>🪙{coinCost}</Text>
              </Animated.View>
            </View>
            {!canAfford && (
              <Text style={styles.insufficientText}>
                Insufficient coins (You have 🪙{profile?.coins || 0})
              </Text>
            )}
          </View>
        </View>

        {/* Promote Button */}
        <View style={styles.promoteSection}>
          <Animated.View style={promoteButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!isFormValid || !canAfford || isPromoting) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!isFormValid || !canAfford || isPromoting}
            >
              <Play color="white" size={20} />
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
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>1</Text>
              <Text style={styles.infoText}>Enter your YouTube video URL</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>2</Text>
              <Text style={styles.infoText}>Choose target views and watch duration</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>3</Text>
              <Text style={styles.infoText}>Pay with coins and your video enters the queue</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>4</Text>
              <Text style={styles.infoText}>Real users watch your video and you get views</Text>
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
        label="Select Target Views"
        suffix="views"
      />

      <SmoothDropdown
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
  heroIcon: {
    width: isVerySmallScreen ? 80 : 96,
    height: isVerySmallScreen ? 80 : 96,
    borderRadius: isVerySmallScreen ? 40 : 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
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
  titleContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 52,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#800080',
    marginLeft: 8,
  },
  videoTitleText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    lineHeight: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
  },
  costValue: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  totalCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalCost: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#800080',
  },
  insufficientText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  promoteSection: {
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
    marginBottom: 32,
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
  infoTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
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
    backgroundColor: '#800080',
    color: 'white',
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    lineHeight: 22,
  },
  // Modal styles for smooth dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    ...Platform.select({
      android: {
        elevation: 10,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#800080',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
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
  },
  closeButtonText: {
    fontSize: isVerySmallScreen ? 18 : 20,
    color: 'white',
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalListContent: {
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
  selectedDropdownItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    flex: 1,
  },
  selectedDropdownItemText: {
    color: '#3498DB',
    fontWeight: '600',
  },
});