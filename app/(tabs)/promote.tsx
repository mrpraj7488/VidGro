import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Eye, Clock, DollarSign, Crown, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Link, Play, ChevronDown } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

interface VideoInfo {
  title: string;
  embedUrl: string;
  isEmbeddable: boolean;
  duration?: number;
}

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

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
  placeholder: string;
  icon: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ options, selectedValue, onSelect, placeholder, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotateValue = useSharedValue(0);

  const selectedOption = options.find(option => option.value === selectedValue);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    rotateValue.value = withTiming(isOpen ? 0 : 180, { duration: 200 });
  };

  const selectOption = (value: number) => {
    onSelect(value);
    setIsOpen(false);
    rotateValue.value = withTiming(0, { duration: 200 });
  };

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownButton} onPress={toggleDropdown}>
        <View style={styles.dropdownButtonContent}>
          {icon}
          <Text style={[styles.dropdownButtonText, !selectedOption && styles.placeholderText]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <Animated.View style={rotateStyle}>
          <ChevronDown color="#666" size={20} />
        </Animated.View>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownOption,
                selectedValue === option.value && styles.selectedOption
              ]}
              onPress={() => selectOption(option.value)}
            >
              <Text style={[
                styles.dropdownOptionText,
                selectedValue === option.value && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
  
  // Video info state
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // UI state
  const [isPromoting, setIsPromoting] = useState(false);
  const [showEmbedTest, setShowEmbedTest] = useState(false);
  
  // Animation values
  const costOpacity = useSharedValue(0);
  const vipBounce = useSharedValue(1);

  // Calculate total cost dynamically
  const calculateCost = useCallback((views: number, duration: number): number => {
    // Base cost calculation: views * duration * multiplier
    const baseCost = Math.ceil((views * duration) / 10); // Simplified formula
    return Math.max(baseCost, 10); // Minimum 10 coins
  }, []);

  const totalCost = selectedViews && selectedDuration 
    ? calculateCost(selectedViews, selectedDuration) 
    : 0;

  const vipDiscount = Math.ceil(totalCost * 0.1); // 10% discount
  const vipCost = totalCost - vipDiscount;
  const finalCost = profile?.is_vip ? vipCost : totalCost;

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

  // Fetch video information
  const fetchVideoInfo = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    setIsLoadingVideo(true);
    setVideoStatus('testing');
    setStatusMessage('Checking video compatibility...');

    try {
      // Simulate API call to get video info
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      // Test embeddability by trying to load the embed
      const isEmbeddable = await testEmbeddability(embedUrl);
      
      if (isEmbeddable) {
        // Try to get title from YouTube API or use a default
        const title = await fetchVideoTitle(videoId) || 'Video Title';
        
        const info: VideoInfo = {
          title,
          embedUrl,
          isEmbeddable: true,
        };
        
        setVideoInfo(info);
        setVideoTitle(title);
        setVideoStatus('success');
        setStatusMessage('Video is embeddable and ready for promotion!');
        setShowEmbedTest(true);
        
        return info;
      } else {
        setVideoStatus('error');
        setStatusMessage('This video cannot be embedded. Please try another video.');
        return null;
      }
    } catch (error) {
      setVideoStatus('error');
      setStatusMessage('Failed to check video. Please verify the URL and try again.');
      return null;
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Test if video can be embedded
  const testEmbeddability = async (embedUrl: string): Promise<boolean> => {
    try {
      // Simulate embeddability test
      return Math.random() > 0.2; // 80% success rate for demo
    } catch {
      return false;
    }
  };

  // Fetch video title (simplified - in real app would use YouTube API)
  const fetchVideoTitle = async (videoId: string): Promise<string | null> => {
    try {
      // In a real app, you'd use YouTube Data API
      // For now, return a placeholder title
      return `Video ${videoId.substring(0, 6)}`;
    } catch {
      return null;
    }
  };

  // Handle URL input change
  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setVideoInfo(null);
    setVideoStatus('idle');
    setStatusMessage('');
    setShowEmbedTest(false);
    setVideoTitle('');

    // Auto-fetch when URL looks complete
    if (url.length > 20 && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      const timeoutId = setTimeout(() => {
        fetchVideoInfo(url);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle video promotion
  const handlePromoteVideo = async () => {
    if (!user || !videoInfo || !selectedViews || !selectedDuration || !videoTitle.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (profile && profile.coins < finalCost) {
      Alert.alert('Insufficient Coins', `You need ₡${finalCost} coins to promote this video. You currently have ₡${profile.coins} coins.`);
      return;
    }

    setIsPromoting(true);

    try {
      // Create video promotion
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert([{
          user_id: user.id,
          youtube_url: extractVideoId(youtubeUrl) || youtubeUrl,
          title: videoTitle.trim(),
          description: `Promoted for ${selectedViews} views at ${selectedDuration} seconds`,
          duration_seconds: selectedDuration,
          coin_cost: finalCost,
          coin_reward: 3, // Standard reward per view
          target_views: selectedViews,
          status: 'active'
        }])
        .select()
        .single();

      if (videoError) throw videoError;

      // Deduct coins
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -finalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle.trim()}`,
          reference_uuid: video.id
        });

      if (coinError) throw coinError;

      // Refresh profile to update coin balance
      await refreshProfile();

      // Reset form
      setYoutubeUrl('');
      setVideoTitle('');
      setSelectedViews(null);
      setSelectedDuration(null);
      setVideoInfo(null);
      setVideoStatus('idle');
      setStatusMessage('');
      setShowEmbedTest(false);

      Alert.alert(
        'Success!', 
        `Your video has been promoted successfully! ₡${finalCost} coins have been deducted from your account.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  // Animate cost display
  useEffect(() => {
    if (totalCost > 0) {
      costOpacity.value = withTiming(1, { duration: 300 });
    } else {
      costOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [totalCost]);

  // VIP bounce animation
  const handleVipUpgrade = () => {
    vipBounce.value = withSpring(1.2, {
      damping: 15,
      stiffness: 150,
    }, () => {
      vipBounce.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    });
    
    Alert.alert('VIP Upgrade', 'VIP subscription feature coming soon! Get 10% off all promotions and ad-free experience.');
  };

  const costAnimatedStyle = useAnimatedStyle(() => ({
    opacity: costOpacity.value,
    transform: [{ scale: costOpacity.value }],
  }));

  const vipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vipBounce.value }],
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
          <DollarSign color="#FFD700" size={20} />
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
                value={youtubeUrl}
                onChangeText={handleUrlChange}
                placeholder="Paste your YouTube video URL here"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isLoadingVideo && (
                <ActivityIndicator size="small" color="#FF4757" style={styles.loadingIcon} />
              )}
            </View>
          </View>

          {/* Video Status */}
          {videoStatus !== 'idle' && (
            <View style={[
              styles.statusContainer,
              videoStatus === 'success' && styles.successStatus,
              videoStatus === 'error' && styles.errorStatus,
              videoStatus === 'testing' && styles.testingStatus
            ]}>
              <View style={styles.statusContent}>
                {videoStatus === 'testing' && <ActivityIndicator size="small" color="#FF4757" />}
                {videoStatus === 'success' && <CheckCircle color="#2ECC71" size={20} />}
                {videoStatus === 'error' && <AlertCircle color="#E74C3C" size={20} />}
                <Text style={[
                  styles.statusText,
                  videoStatus === 'success' && styles.successText,
                  videoStatus === 'error' && styles.errorText
                ]}>
                  {statusMessage}
                </Text>
              </View>
            </View>
          )}

          {/* Embeddability Test Preview */}
          {showEmbedTest && videoInfo && (
            <View style={styles.embedTestContainer}>
              <TouchableOpacity 
                style={styles.embedTestHeader}
                onPress={() => setShowEmbedTest(!showEmbedTest)}
              >
                <Text style={styles.embedTestTitle}>Video Preview</Text>
                <CheckCircle color="#2ECC71" size={20} />
              </TouchableOpacity>
              
              <View style={styles.embedPreview}>
                <View style={styles.videoThumbnail}>
                  <Play color="white" size={48} />
                </View>
                <View style={styles.videoPreviewInfo}>
                  <Text style={styles.videoPreviewTitle} numberOfLines={2}>
                    {videoInfo.title}
                  </Text>
                  <View style={styles.readyBadge}>
                    <CheckCircle color="#2ECC71" size={16} />
                    <Text style={styles.readyText}>Ready for promotion!</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Video Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Video Title *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={videoTitle}
                onChangeText={setVideoTitle}
                placeholder="Enter video title"
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Number of Views */}
          <View style={styles.section}>
            <Text style={styles.label}>Number of Views *</Text>
            <Dropdown
              options={viewOptions}
              selectedValue={selectedViews}
              onSelect={setSelectedViews}
              placeholder="Select views"
              icon={<Eye color="#FF4757" size={20} />}
            />
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.label}>Watch Duration *</Text>
            <Dropdown
              options={durationOptions}
              selectedValue={selectedDuration}
              onSelect={setSelectedDuration}
              placeholder="Select duration"
              icon={<Clock color="#FF4757" size={20} />}
            />
          </View>

          {/* Cost Display */}
          {totalCost > 0 && (
            <Animated.View style={[styles.costContainer, costAnimatedStyle]}>
              <View style={styles.costHeader}>
                <DollarSign color="#FF4757" size={24} />
                <Text style={styles.costTitle}>Promotion Cost</Text>
              </View>
              
              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Base Cost:</Text>
                  <Text style={styles.costValue}>₡{totalCost}</Text>
                </View>
                
                {profile?.is_vip ? (
                  <>
                    <View style={styles.costRow}>
                      <Text style={styles.discountLabel}>VIP Discount (10%):</Text>
                      <Text style={styles.discountValue}>-₡{vipDiscount}</Text>
                    </View>
                    <View style={[styles.costRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Cost:</Text>
                      <Text style={styles.totalValue}>₡{vipCost}</Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.costRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Cost:</Text>
                    <Text style={styles.totalValue}>₡{totalCost}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* VIP Upgrade Offer */}
          {!profile?.is_vip && totalCost > 0 && (
            <Animated.View style={[styles.vipContainer, vipAnimatedStyle]}>
              <TouchableOpacity style={styles.vipOffer} onPress={handleVipUpgrade}>
                <Crown color="#FFA726" size={24} />
                <View style={styles.vipContent}>
                  <Text style={styles.vipTitle}>VIP members save 10%!</Text>
                  <Text style={styles.vipSubtitle}>
                    Save ₡{vipDiscount} on this promotion - Become VIP?
                  </Text>
                </View>
                <View style={styles.vipArrow}>
                  <TrendingUp color="#FFA726" size={20} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Promote Button */}
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!videoInfo || !selectedViews || !selectedDuration || !videoTitle.trim() || isPromoting) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!videoInfo || !selectedViews || !selectedDuration || !videoTitle.trim() || isPromoting}
          >
            {isPromoting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <TrendingUp color="white" size={20} />
                <Text style={styles.promoteButtonText}>
                  Promote Video {totalCost > 0 && `(₡${finalCost})`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
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
    fontSize: 16,
    color: '#333',
    minHeight: 20,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  statusContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successStatus: {
    backgroundColor: '#E8F5E8',
    borderColor: '#2ECC71',
    borderWidth: 1,
  },
  errorStatus: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E74C3C',
    borderWidth: 1,
  },
  testingStatus: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  successText: {
    color: '#2ECC71',
  },
  errorText: {
    color: '#E74C3C',
  },
  embedTestContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  embedTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  embedTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  embedPreview: {
    flexDirection: 'row',
    padding: 16,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoPreviewInfo: {
    flex: 1,
  },
  videoPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyText: {
    fontSize: 12,
    color: '#2ECC71',
    fontWeight: '500',
    marginLeft: 4,
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
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
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 4,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: '#FFF3E0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#FF4757',
    fontWeight: '500',
  },
  costContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    color: '#2ECC71',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2ECC71',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 4,
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
  vipContainer: {
    marginBottom: 16,
  },
  vipOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  vipContent: {
    flex: 1,
    marginLeft: 12,
  },
  vipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 2,
  },
  vipSubtitle: {
    fontSize: 12,
    color: '#FF8F00',
  },
  vipArrow: {
    marginLeft: 8,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
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
    backgroundColor: '#CCC',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: 'none',
      },
    }),
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});