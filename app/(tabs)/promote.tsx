import React, { useState, useEffect, useRef } from 'react';
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
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Eye, Clock, Coins, Crown, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, Play, TrendingUp, Sparkles } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  withSequence,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

interface DropdownOption {
  label: string;
  value: number;
}

const viewOptions: DropdownOption[] = [
  { label: '10 views', value: 10 },
  { label: '25 views', value: 25 },
  { label: '35 views', value: 35 },
  { label: '50 views', value: 50 },
  { label: '75 views', value: 75 },
  { label: '100 views', value: 100 },
];

const durationOptions: DropdownOption[] = [
  { label: '30 seconds', value: 30 },
  { label: '45 seconds', value: 45 },
  { label: '50 seconds', value: 50 },
  { label: '60 seconds', value: 60 },
  { label: '90 seconds', value: 90 },
  { label: '120 seconds', value: 120 },
];

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
  placeholder: string;
  icon: React.ReactNode;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(0);

  const selectedOption = options.find(option => option.value === selectedValue);

  useEffect(() => {
    rotateValue.value = withTiming(isOpen ? 180 : 0, { duration: 200 });
    scaleValue.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
  }, [isOpen]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const dropdownStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleValue.value }],
    opacity: scaleValue.value,
  }));

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, selectedValue && styles.dropdownButtonSelected]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={styles.dropdownButtonContent}>
          {icon}
          <Text style={[
            styles.dropdownButtonText,
            selectedValue && styles.dropdownButtonTextSelected
          ]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <Animated.View style={rotateStyle}>
          <ChevronDown color={selectedValue ? "#FF4757" : "#999"} size={20} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <Animated.View style={[styles.dropdownList, dropdownStyle]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownOption,
                selectedValue === option.value && styles.dropdownOptionSelected
              ]}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                selectedValue === option.value && styles.dropdownOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Video processing state
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isEmbeddable, setIsEmbeddable] = useState<boolean | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Animation values
  const costOpacity = useSharedValue(0);
  const costScale = useSharedValue(0.8);
  const vipBounce = useSharedValue(1);
  const successScale = useSharedValue(0);

  // Calculate total cost
  const calculateCost = (views: number, duration: number): number => {
    // Base cost calculation: views * duration / 10 (simplified formula)
    const baseCost = Math.ceil((views * duration) / 15);
    return Math.max(baseCost, 10); // Minimum 10 coins
  };

  const totalCost = selectedViews && selectedDuration 
    ? calculateCost(selectedViews, selectedDuration) 
    : 0;

  const vipDiscount = Math.ceil(totalCost * 0.1);
  const finalCost = profile?.is_vip ? totalCost - vipDiscount : totalCost;

  // Show/hide cost animation
  useEffect(() => {
    if (selectedViews && selectedDuration) {
      costOpacity.value = withTiming(1, { duration: 300 });
      costScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      costOpacity.value = withTiming(0, { duration: 200 });
      costScale.value = withTiming(0.8, { duration: 200 });
    }
  }, [selectedViews, selectedDuration]);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string | null => {
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

  // Process YouTube URL
  const processYouTubeUrl = async (url: string) => {
    if (!url.trim()) {
      setEmbedUrl('');
      setIsEmbeddable(null);
      setShowPreview(false);
      setVideoTitle('');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setIsEmbeddable(false);
      return;
    }

    setIsProcessingUrl(true);
    setIsEmbeddable(null);

    try {
      const newEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
      setEmbedUrl(newEmbedUrl);

      // Simulate embeddability test
      setTimeout(() => {
        setIsEmbeddable(true);
        setShowPreview(true);
        
        // Auto-fill title if empty
        if (!videoTitle.trim()) {
          setVideoTitle(`Video ${videoId}`);
        }
        
        setIsProcessingUrl(false);
      }, 1500);

    } catch (error) {
      setIsEmbeddable(false);
      setIsProcessingUrl(false);
    }
  };

  // Handle URL input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processYouTubeUrl(youtubeUrl);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  // Handle VIP upgrade
  const handleVipUpgrade = () => {
    Alert.alert(
      'Upgrade to VIP',
      'Get 10% off all promotions and enjoy ad-free experience!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => {
          // Navigate to VIP upgrade screen
          Alert.alert('VIP Upgrade', 'VIP upgrade feature coming soon!');
        }}
      ]
    );
  };

  // Handle video promotion
  const handlePromoteVideo = async () => {
    if (!youtubeUrl.trim() || !videoTitle.trim() || !selectedViews || !selectedDuration) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (!isEmbeddable) {
      Alert.alert('Video Error', 'This video cannot be embedded. Please try a different video.');
      return;
    }

    if (!profile || profile.coins < finalCost) {
      Alert.alert('Insufficient Coins', `You need ₡${finalCost} coins to promote this video.`);
      return;
    }

    setIsLoading(true);

    try {
      const videoId = extractVideoId(youtubeUrl);
      
      // Create video promotion
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert([{
          user_id: user!.id,
          youtube_url: videoId!,
          title: videoTitle,
          description: '',
          duration_seconds: selectedDuration,
          coin_cost: finalCost,
          coin_reward: 3,
          target_views: selectedViews,
          status: 'active'
        }])
        .select()
        .single();

      if (videoError) throw videoError;

      // Deduct coins
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user!.id,
          coin_amount: -finalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle}`,
          reference_uuid: video.id
        });

      if (coinError) throw coinError;

      // Success animation
      successScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Refresh profile
      await refreshProfile();

      // Reset form
      setYoutubeUrl('');
      setVideoTitle('');
      setSelectedViews(null);
      setSelectedDuration(null);
      setEmbedUrl('');
      setIsEmbeddable(null);
      setShowPreview(false);

      Alert.alert(
        'Success!',
        `Your video has been promoted successfully! ₡${finalCost} coins deducted.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to promote video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Animated styles
  const costAnimatedStyle = useAnimatedStyle(() => ({
    opacity: costOpacity.value,
    transform: [{ scale: costScale.value }],
  }));

  const vipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vipBounce.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Promote Your Video</Text>
        <View style={styles.coinDisplay}>
          <Text style={styles.coinCount}>₡{profile?.coins || 0}</Text>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* YouTube URL Input */}
          <View style={styles.section}>
            <Text style={styles.label}>YouTube URL *</Text>
            <View style={styles.inputContainer}>
              <Link color="#FF4757" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Paste your YouTube URL here"
                placeholderTextColor="#999"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isProcessingUrl && (
                <ActivityIndicator size="small" color="#FF4757" style={styles.loadingIcon} />
              )}
            </View>
          </View>

          {/* Embeddability Status */}
          {youtubeUrl.trim() && (
            <View style={styles.statusContainer}>
              {isProcessingUrl ? (
                <View style={styles.statusItem}>
                  <ActivityIndicator size="small" color="#FFA726" />
                  <Text style={styles.statusText}>Checking video compatibility...</Text>
                </View>
              ) : isEmbeddable === true ? (
                <View style={[styles.statusItem, styles.successStatus]}>
                  <CheckCircle color="#2ECC71" size={20} />
                  <Text style={[styles.statusText, styles.successText]}>
                    Video is embeddable and ready for promotion!
                  </Text>
                </View>
              ) : isEmbeddable === false ? (
                <View style={[styles.statusItem, styles.errorStatus]}>
                  <AlertCircle color="#E74C3C" size={20} />
                  <Text style={[styles.statusText, styles.errorText]}>
                    This video cannot be embedded. Try a different video.
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Video Preview */}
          {showPreview && embedUrl && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Video Preview</Text>
              <View style={styles.videoContainer}>
                <WebView
                  source={{ uri: embedUrl }}
                  style={styles.webview}
                  allowsFullscreenVideo={false}
                  mediaPlaybackRequiresUserAction={true}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.webviewLoading}>
                      <ActivityIndicator size="large" color="#FF4757" />
                    </View>
                  )}
                />
              </View>
            </View>
          )}

          {/* Video Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Video Title *</Text>
            <View style={styles.inputContainer}>
              <Play color="#FF4757" size={20} style={styles.inputIcon} />
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

          {/* Views and Duration Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Number of Views *</Text>
            <CustomDropdown
              options={viewOptions}
              selectedValue={selectedViews}
              onSelect={setSelectedViews}
              placeholder="Select target views"
              icon={<Eye color={selectedViews ? "#FF4757" : "#999"} size={20} />}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Watch Duration *</Text>
            <CustomDropdown
              options={durationOptions}
              selectedValue={selectedDuration}
              onSelect={setSelectedDuration}
              placeholder="Select watch duration"
              icon={<Clock color={selectedDuration ? "#FF4757" : "#999"} size={20} />}
            />
          </View>

          {/* Cost Display */}
          {selectedViews && selectedDuration && (
            <Animated.View style={[styles.costContainer, costAnimatedStyle]}>
              <View style={styles.costHeader}>
                <Coins color="#FF4757" size={24} />
                <Text style={styles.costTitle}>Promotion Cost</Text>
              </View>
              
              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Base Cost:</Text>
                  <Text style={styles.costValue}>₡{totalCost}</Text>
                </View>
                
                {profile?.is_vip && (
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, styles.discountLabel]}>VIP Discount (10%):</Text>
                    <Text style={[styles.costValue, styles.discountValue]}>-₡{vipDiscount}</Text>
                  </View>
                )}
                
                <View style={[styles.costRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Cost:</Text>
                  <Text style={styles.totalValue}>₡{finalCost}</Text>
                </View>
              </View>

              {/* VIP Upgrade Offer */}
              {!profile?.is_vip && (
                <Animated.View style={[styles.vipOffer, vipAnimatedStyle]}>
                  <TouchableOpacity
                    style={styles.vipOfferButton}
                    onPress={() => {
                      vipBounce.value = withSequence(
                        withSpring(1.1, { damping: 10, stiffness: 150 }),
                        withSpring(1, { damping: 15, stiffness: 150 })
                      );
                      handleVipUpgrade();
                    }}
                  >
                    <Crown color="#FFA726" size={20} />
                    <Text style={styles.vipOfferText}>
                      VIP members save ₡{vipDiscount} - Become VIP?
                    </Text>
                    <Sparkles color="#FFA726" size={16} />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Promote Button */}
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!youtubeUrl.trim() || !videoTitle.trim() || !selectedViews || !selectedDuration || !isEmbeddable) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!youtubeUrl.trim() || !videoTitle.trim() || !selectedViews || !selectedDuration || !isEmbeddable || isLoading}
          >
            <LinearGradient
              colors={['#FF4757', '#FF6B8A']}
              style={styles.promoteButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <TrendingUp color="white" size={20} />
                  <Text style={styles.promoteButtonText}>
                    Promote Video {finalCost > 0 && `(₡${finalCost})`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Success Animation */}
          <Animated.View style={[styles.successAnimation, successAnimatedStyle]}>
            <CheckCircle color="#2ECC71" size={48} />
          </Animated.View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: isSmallScreen ? 16 : 20,
  },
  section: {
    marginBottom: isSmallScreen ? 20 : 24,
  },
  label: {
    fontSize: isSmallScreen ? 16 : 18,
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
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    minHeight: 48,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  successStatus: {
    backgroundColor: '#F0F8F0',
    borderColor: '#2ECC71',
  },
  errorStatus: {
    backgroundColor: '#FFF5F5',
    borderColor: '#E74C3C',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  successText: {
    color: '#2ECC71',
    fontWeight: '500',
  },
  errorText: {
    color: '#E74C3C',
    fontWeight: '500',
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  videoContainer: {
    height: isSmallScreen ? 180 : 220,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
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
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  dropdownButtonSelected: {
    borderColor: '#FF4757',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
  dropdownButtonTextSelected: {
    color: '#333',
    fontWeight: '500',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    zIndex: 1001,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    color: '#FF4757',
    fontWeight: '500',
  },
  costContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    fontSize: 18,
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
  discountLabel: {
    color: '#2ECC71',
  },
  discountValue: {
    color: '#2ECC71',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  vipOffer: {
    marginTop: 16,
  },
  vipOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  vipOfferText: {
    fontSize: 14,
    color: '#FFA726',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  promoteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  promoteButtonDisabled: {
    opacity: 0.5,
  },
  promoteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  successAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 1000,
  },
});