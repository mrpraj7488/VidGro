import React, { useState, useEffect, useRef } from 'react';
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
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { 
  Link, 
  Eye, 
  Clock, 
  TrendingUp, 
  ChevronDown, 
  Check,
  AlertCircle,
  Play,
  DollarSign
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  options: { value: number; label: string }[];
  selectedValue: number;
  onSelect: (value: number) => void;
  title: string;
}

const EnhancedDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title,
}) => {
  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const renderItem = ({ item }: { item: { value: number; label: string } }) => (
    <Pressable
      key={item.value}
      style={[
        styles.dropdownItem,
        item.value === selectedValue && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelect(item.value)}
      android_ripple={{ color: '#E3F2FD' }}
    >
      <Text style={[
        styles.dropdownItemText,
        item.value === selectedValue && styles.selectedDropdownItemText
      ]}>
        {item.label}
      </Text>
      {item.value === selectedValue && (
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
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleBackdropPress}
        >
          <View style={styles.modalContainer}>
            <Pressable 
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
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
              
              <ScrollView
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={styles.modalListContent}
              >
                {options.map((item) => renderItem({ item }))}
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isPromoting, setIsPromoting] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  
  // Dropdown states
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  // Animation values
  const coinBounce = useSharedValue(1);
  const promoteButtonScale = useSharedValue(1);

  // Options for dropdowns
  const viewsOptions = [
    { value: 10, label: '10 views' },
    { value: 25, label: '25 views' },
    { value: 50, label: '50 views' },
    { value: 100, label: '100 views' },
    { value: 200, label: '200 views' },
    { value: 500, label: '500 views' },
  ];

  const durationOptions = [
    { value: 30, label: '30 seconds' },
    { value: 45, label: '45 seconds' },
    { value: 60, label: '60 seconds' },
    { value: 90, label: '90 seconds' },
    { value: 120, label: '120 seconds' },
  ];

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // If it's already just an ID
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

  // Fetch video information from YouTube
  const fetchVideoInfo = async (videoId: string) => {
    setIsLoadingVideo(true);
    try {
      // Simulate API call - replace with actual YouTube API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock video data - replace with actual API response
      const mockVideoInfo = {
        title: 'Sample Video Title',
        duration: 180, // seconds
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channelTitle: 'Sample Channel',
      };
      
      setVideoInfo(mockVideoInfo);
      setVideoTitle(mockVideoInfo.title);
    } catch (error) {
      console.error('Error fetching video info:', error);
      Alert.alert('Error', 'Could not fetch video information. Please check the URL.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Handle URL input change
  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const videoId = extractVideoId(url);
    
    if (videoId) {
      fetchVideoInfo(videoId);
    } else {
      setVideoInfo(null);
      setVideoTitle('');
    }
  };

  // Calculate coin cost
  const calculateCoinCost = () => {
    const baseCost = selectedViews * 2; // 2 coins per view
    const durationMultiplier = selectedDuration / 30; // 30 seconds as base
    return Math.ceil(baseCost * durationMultiplier);
  };

  // Handle video promotion
  const handlePromoteVideo = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    if (!videoTitle.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }

    const coinCost = calculateCoinCost();
    if (profile.coins < coinCost) {
      Alert.alert('Insufficient Coins', `You need ${coinCost} coins to promote this video. You currently have ${profile.coins} coins.`);
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
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: selectedViews
        });

      if (videoError) throw videoError;

      // Refresh profile to update coin balance
      await refreshProfile();
      
      // Clear video queue to refresh with new videos
      clearQueue();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(1.3, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Success! 🎉',
        `Your video has been submitted for promotion! It will be active in the queue after a 10-minute hold period.\n\nTarget: ${selectedViews} views\nDuration: ${selectedDuration} seconds\nCost: ${coinCost} coins`,
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
      setVideoInfo(null);
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

  const promoteButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: promoteButtonScale.value }],
  }));

  const coinCost = calculateCoinCost();
  const canAfford = (profile?.coins || 0) >= coinCost;

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
            <TrendingUp color="white" size={isSmallScreen ? 40 : 48} />
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
            <View style={styles.inputContainer}>
              <Link color="#666" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="https://youtu.be/dQw4w9WgXcQ"
                placeholderTextColor="#999"
                value={youtubeUrl}
                onChangeText={handleUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isLoadingVideo && (
                <ActivityIndicator size="small" color="#800080" style={styles.loadingIcon} />
              )}
            </View>
          </View>

          {/* Video Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Video Title *</Text>
            <View style={styles.inputContainer}>
              <Play color="#666" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter video title"
                placeholderTextColor="#999"
                value={videoTitle}
                onChangeText={setVideoTitle}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Number of Views Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Views *</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowViewsDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <Eye color="#666" size={20} style={styles.inputIcon} />
              <Text style={styles.dropdownButtonText}>
                {selectedViews} views
              </Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Duration Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Set Duration (seconds) *</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowDurationDropdown(true)}
              android_ripple={{ color: '#F0F0F0' }}
            >
              <Clock color="#666" size={20} style={styles.inputIcon} />
              <Text style={styles.dropdownButtonText}>
                {selectedDuration} seconds
              </Text>
              <ChevronDown color="#666" size={20} />
            </Pressable>
          </View>

          {/* Cost Display */}
          <View style={styles.costSection}>
            <View style={styles.costCard}>
              <View style={styles.costHeader}>
                <DollarSign color="#800080" size={24} />
                <Text style={styles.costTitle}>Promotion Cost</Text>
              </View>
              <Animated.View style={[styles.costAmount, coinAnimatedStyle]}>
                <Text style={styles.costValue}>🪙{coinCost}</Text>
              </Animated.View>
              <Text style={styles.costDescription}>
                {selectedViews} views × {selectedDuration}s duration
              </Text>
              {!canAfford && (
                <View style={styles.insufficientFunds}>
                  <AlertCircle color="#E74C3C" size={16} />
                  <Text style={styles.insufficientText}>
                    Insufficient coins (Need {coinCost - (profile?.coins || 0)} more)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Promote Button */}
          <Animated.View style={promoteButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!canAfford || isPromoting || !youtubeUrl || !videoTitle) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!canAfford || isPromoting || !youtubeUrl || !videoTitle}
            >
              <TrendingUp color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {isPromoting ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>• Your video enters a 10-minute hold period</Text>
              <Text style={styles.infoItem}>• After hold, it becomes active in our viewing queue</Text>
              <Text style={styles.infoItem}>• Users earn coins by watching your video</Text>
              <Text style={styles.infoItem}>• You get real engagement from our community</Text>
              <Text style={styles.infoItem}>• Track progress in the Analytics tab</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Dropdowns */}
      <EnhancedDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={viewsOptions}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        title="Select Number of Views"
      />

      <EnhancedDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={durationOptions}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        title="Select Duration"
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
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 52,
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
  },
  textInput: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    paddingVertical: 16,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 52,
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
  dropdownButtonText: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    marginLeft: 12,
  },
  costSection: {
    marginBottom: 24,
  },
  costCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#800080',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(128, 0, 128, 0.15)',
      },
    }),
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  costTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  costAmount: {
    marginBottom: 8,
  },
  costValue: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#800080',
  },
  costDescription: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    textAlign: 'center',
  },
  insufficientFunds: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  insufficientText: {
    fontSize: 12,
    color: '#E74C3C',
    marginLeft: 6,
    fontWeight: '500',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
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
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // Enhanced Modal Styles for Android Fix
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black overlay
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: isVerySmallScreen ? screenWidth - 20 : 400,
    maxHeight: isSmallScreen ? '80%' : '70%',
    backgroundColor: 'white', // Solid white background
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 10,
        backgroundColor: '#FFFFFF', // Ensure solid white on Android
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        backgroundColor: '#FFFFFF',
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        backgroundColor: '#FFFFFF',
      },
    }),
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Explicit white background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#800080',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
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
    backgroundColor: '#FFFFFF', // Explicit white background
  },
  modalListContent: {
    paddingBottom: 20,
    backgroundColor: '#FFFFFF', // Explicit white background
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
    backgroundColor: '#FFFFFF', // Explicit white background
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