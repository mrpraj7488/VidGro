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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Video, 
  Coins, 
  Eye, 
  Clock, 
  ChevronDown, 
  Play,
  Menu,
  ExternalLink
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');

  // Animation values
  const coinBounce = useSharedValue(1);

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

  const fetchVideoTitle = async (videoId: string) => {
    try {
      // For demo purposes, we'll use a placeholder title
      // In production, you'd use YouTube API to fetch the actual title
      setVideoTitle(`Video ${videoId.substring(0, 8)}`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('YouTube Video');
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

  const calculateCoinCost = (views: number, duration: number) => {
    // Base cost calculation: views * duration factor
    const durationFactor = duration / 30; // 30 seconds as base
    return Math.ceil(views * durationFactor * 2); // 2 coins per view-duration unit
  };

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);

  const handlePromoteVideo = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube URL or video ID');
      return;
    }

    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to promote this video.`);
      return;
    }

    setLoading(true);

    try {
      // Check if video already exists
      const { data: existingVideo, error: checkError } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_url', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVideo) {
        Alert.alert('Video Already Promoted', 'This video is already in your promotion list.');
        setLoading(false);
        return;
      }

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

      // Create video with 10-minute hold
      const holdUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const { error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          youtube_url: videoId,
          title: videoTitle || `YouTube Video ${videoId.substring(0, 8)}`,
          description: '',
          duration_seconds: selectedDuration,
          coin_cost: coinCost,
          coin_reward: 3, // Fixed reward per view
          target_views: selectedViews,
          status: 'on_hold',
          hold_until: holdUntil.toISOString(),
          views_count: 0
        });

      if (videoError) throw videoError;

      // Refresh profile to update coin balance
      await refreshProfile();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(0.8, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Video Promoted Successfully!',
        `Your video is now on hold for 10 minutes before entering the queue. Cost: 🪙${coinCost}`,
        [{ text: 'OK' }]
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
      setLoading(false);
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Promote</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Promotion Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Promote Your Video</Text>
          
          <View style={styles.formCard}>
            {/* YouTube URL Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>YouTube URL or Video ID</Text>
              <View style={styles.inputContainer}>
                <Video color="#FF4757" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  placeholderTextColor="#999"
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {youtubeUrl && (
                  <TouchableOpacity
                    style={styles.externalLink}
                    onPress={() => {
                      const videoId = extractVideoId(youtubeUrl);
                      if (videoId && Platform.OS === 'web') {
                        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                      }
                    }}
                  >
                    <ExternalLink color="#666" size={16} />
                  </TouchableOpacity>
                )}
              </View>
              {videoTitle && (
                <Text style={styles.videoPreview}>📹 {videoTitle}</Text>
              )}
            </View>

            {/* Target Views Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Views</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowViewsDropdown(!showViewsDropdown)}
              >
                <Eye color="#3498DB" size={20} />
                <Text style={styles.dropdownText}>{selectedViews} views</Text>
                <ChevronDown 
                  color="#666" 
                  size={20} 
                  style={[
                    styles.chevron,
                    showViewsDropdown && styles.chevronRotated
                  ]}
                />
              </TouchableOpacity>
              
              {showViewsDropdown && (
                <View style={styles.dropdownMenu}>
                  {VIEW_OPTIONS.map((views) => (
                    <TouchableOpacity
                      key={views}
                      style={[
                        styles.dropdownItem,
                        selectedViews === views && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setSelectedViews(views);
                        setShowViewsDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedViews === views && styles.dropdownItemTextSelected
                      ]}>
                        {views} views
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Watch Duration Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Required Watch Duration</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowDurationDropdown(!showDurationDropdown)}
              >
                <Clock color="#F39C12" size={20} />
                <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
                <ChevronDown 
                  color="#666" 
                  size={20} 
                  style={[
                    styles.chevron,
                    showDurationDropdown && styles.chevronRotated
                  ]}
                />
              </TouchableOpacity>
              
              {showDurationDropdown && (
                <View style={styles.dropdownMenu}>
                  {DURATION_OPTIONS.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.dropdownItem,
                        selectedDuration === duration && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setSelectedDuration(duration);
                        setShowDurationDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedDuration === duration && styles.dropdownItemTextSelected
                      ]}>
                        {duration} seconds
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Cost Summary */}
            <View style={styles.costSummary}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Total Cost:</Text>
                <Text style={styles.costValue}>🪙{coinCost}</Text>
              </View>
              <Text style={styles.costDescription}>
                {selectedViews} views × {selectedDuration}s duration
              </Text>
            </View>

            {/* Promote Button */}
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!youtubeUrl || loading || (profile?.coins || 0) < coinCost) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!youtubeUrl || loading || (profile?.coins || 0) < coinCost}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Play color="white" size={20} />
              )}
              <Text style={styles.promoteButtonText}>
                {loading ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>

            {(profile?.coins || 0) < coinCost && (
              <Text style={styles.insufficientFunds}>
                Insufficient coins. You need 🪙{coinCost - (profile?.coins || 0)} more.
              </Text>
            )}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Enter your YouTube video URL and select target views and duration
              </Text>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Your video enters a 10-minute hold period before going live
              </Text>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Users watch your video and you get views when they complete the required duration
              </Text>
            </View>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
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
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#333',
  },
  externalLink: {
    padding: 4,
  },
  videoPreview: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
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
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  costSummary: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  costDescription: {
    fontSize: 12,
    color: '#666',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    padding: 16,
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
    backgroundColor: '#999',
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  insufficientFunds: {
    textAlign: 'center',
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 8,
  },
  infoSection: {
    margin: 16,
    marginTop: 0,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
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
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});