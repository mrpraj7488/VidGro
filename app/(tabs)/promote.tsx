import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Video, 
  Plus, 
  Coins, 
  Eye, 
  Clock, 
  TrendingUp, 
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Menu,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface VideoFormData {
  youtubeUrl: string;
  title: string;
  description: string;
  targetViews: number;
  duration: number;
}

interface PromotedVideo {
  id: string;
  youtube_url: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold';
  created_at: string;
  updated_at: string;
}

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<VideoFormData>({
    youtubeUrl: '',
    title: '',
    description: '',
    targetViews: 50,
    duration: 30,
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [promotedVideos, setPromotedVideos] = useState<PromotedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  
  // Validation state
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Animation values
  const coinBounce = useSharedValue(1);
  const advancedHeight = useSharedValue(0);

  // Calculate coin cost
  const calculateCoinCost = useCallback((views: number, duration: number) => {
    const baseCost = views * 2;
    const durationMultiplier = duration / 30;
    return Math.ceil(baseCost * durationMultiplier);
  }, []);

  const coinCost = calculateCoinCost(formData.targetViews, formData.duration);

  // Extract YouTube video ID
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Direct video ID
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

  // Validate YouTube URL
  const validateYouTubeUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setValidationStatus(null);
      return;
    }

    setValidating(true);
    
    try {
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        setValidationStatus({
          isValid: false,
          message: 'Invalid YouTube URL format',
          type: 'error'
        });
        return;
      }

      // Check if video already exists in database
      const { data: existingVideo, error } = await supabase
        .from('videos')
        .select('id, title, user_id')
        .eq('youtube_url', videoId)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing video:', error);
      }

      if (existingVideo) {
        if (existingVideo.user_id === user?.id) {
          setValidationStatus({
            isValid: false,
            message: 'You have already promoted this video',
            type: 'error'
          });
        } else {
          setValidationStatus({
            isValid: false,
            message: 'This video is already being promoted by another user',
            type: 'error'
          });
        }
        return;
      }

      // If we get here, the video is valid and not already promoted
      setValidationStatus({
        isValid: true,
        message: 'Video URL is valid and available for promotion',
        type: 'success'
      });

      // Auto-fill title if empty
      if (!formData.title.trim()) {
        setFormData(prev => ({
          ...prev,
          title: `Video ${videoId}`
        }));
      }

    } catch (error) {
      console.error('Error validating URL:', error);
      setValidationStatus({
        isValid: false,
        message: 'Error validating video URL',
        type: 'error'
      });
    } finally {
      setValidating(false);
    }
  }, [formData.title, user?.id]);

  // Debounced URL validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.youtubeUrl) {
        validateYouTubeUrl(formData.youtubeUrl);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.youtubeUrl, validateYouTubeUrl]);

  // Fetch promoted videos
  const fetchPromotedVideos = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingVideos(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPromotedVideos(data || []);
    } catch (error) {
      console.error('Error fetching promoted videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPromotedVideos();
  }, [fetchPromotedVideos]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    // Validation
    if (!formData.youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }

    if (!validationStatus?.isValid) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    if (profile.coins < coinCost) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${coinCost} coins to promote this video. You currently have ${profile.coins} coins.`
      );
      return;
    }

    setLoading(true);

    try {
      const videoId = extractVideoId(formData.youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid video URL');
      }

      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${formData.title}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video promotion with 10-minute hold
      const { data: newVideo, error: videoError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoId,
          title_param: formData.title,
          description_param: formData.description,
          duration_seconds_param: formData.duration,
          coin_cost_param: coinCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: formData.targetViews
        });

      if (videoError) throw videoError;

      // Refresh profile and videos
      await refreshProfile();
      await fetchPromotedVideos();

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

      // Reset form
      setFormData({
        youtubeUrl: '',
        title: '',
        description: '',
        targetViews: 50,
        duration: 30,
      });
      setValidationStatus(null);
      setShowAdvanced(false);

      Alert.alert(
        'Success!',
        'Your video has been submitted for promotion. It will be active in the queue after a 10-minute hold period.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', error.message || 'Failed to promote video');
    } finally {
      setLoading(false);
    }
  };

  // Toggle advanced options
  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
    advancedHeight.value = withTiming(showAdvanced ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  };

  // Animation styles
  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const advancedAnimatedStyle = useAnimatedStyle(() => ({
    opacity: advancedHeight.value,
    transform: [{ scaleY: advancedHeight.value }],
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'PENDING';
      default: return status.toUpperCase();
    }
  };

  const getValidationIcon = () => {
    if (validating) return <ActivityIndicator size="small" color="#666" />;
    if (!validationStatus) return null;
    
    switch (validationStatus.type) {
      case 'success': return <CheckCircle color="#2ECC71" size={16} />;
      case 'error': return <AlertCircle color="#E74C3C" size={16} />;
      case 'info': return <Info color="#3498DB" size={16} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF4757', '#FF6B8A']} style={styles.header}>
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Promote</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Promotion Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Promote Your Video</Text>
            
            <View style={styles.formCard}>
              {/* YouTube URL Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>YouTube URL *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://youtube.com/watch?v=... or video ID"
                    placeholderTextColor="#999"
                    value={formData.youtubeUrl}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, youtubeUrl: text }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.validationIcon}>
                    {getValidationIcon()}
                  </View>
                </View>
                {validationStatus && (
                  <Text style={[
                    styles.validationText,
                    { color: validationStatus.type === 'success' ? '#2ECC71' : '#E74C3C' }
                  ]}>
                    {validationStatus.message}
                  </Text>
                )}
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter a catchy title for your video"
                  placeholderTextColor="#999"
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  maxLength={100}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Brief description of your video..."
                  placeholderTextColor="#999"
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Basic Options */}
              <View style={styles.optionsRow}>
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>Target Views</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setShowViewsDropdown(!showViewsDropdown)}
                  >
                    <Text style={styles.dropdownText}>{formData.targetViews}</Text>
                    <ChevronDown color="#666" size={16} />
                  </TouchableOpacity>
                  
                  {showViewsDropdown && (
                    <View style={styles.dropdownMenu}>
                      {VIEW_OPTIONS.map((views) => (
                        <TouchableOpacity
                          key={views}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, targetViews: views }));
                            setShowViewsDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{views} views</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>Watch Duration</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setShowDurationDropdown(!showDurationDropdown)}
                  >
                    <Text style={styles.dropdownText}>{formData.duration}s</Text>
                    <ChevronDown color="#666" size={16} />
                  </TouchableOpacity>
                  
                  {showDurationDropdown && (
                    <View style={styles.dropdownMenu}>
                      {DURATION_OPTIONS.map((duration) => (
                        <TouchableOpacity
                          key={duration}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, duration }));
                            setShowDurationDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{duration} seconds</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Cost Display */}
              <View style={styles.costDisplay}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Total Cost:</Text>
                  <Text style={styles.costValue}>🪙{coinCost}</Text>
                </View>
                <Text style={styles.costSubtext}>
                  You'll earn 🪙3 for each completed view
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (loading || !validationStatus?.isValid || (profile?.coins || 0) < coinCost) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading || !validationStatus?.isValid || (profile?.coins || 0) < coinCost}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Plus color="white" size={20} />
                    <Text style={styles.submitButtonText}>Promote Video</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Promotions */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Your Promoted Videos</Text>
            
            {loadingVideos ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF4757" />
                <Text style={styles.loadingText}>Loading your videos...</Text>
              </View>
            ) : promotedVideos.length > 0 ? (
              <View style={styles.videosList}>
                {promotedVideos.map((video) => (
                  <View key={video.id} style={styles.videoItem}>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={styles.videoStats}>
                        {video.views_count}/{video.target_views} views • 🪙{video.coin_cost} spent
                      </Text>
                      <View style={styles.videoMeta}>
                        <Text style={styles.videoDate}>
                          {new Date(video.created_at).toLocaleDateString()}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
                          <Text style={styles.statusText}>
                            {getStatusText(video.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.videoAction}
                      onPress={() => {
                        const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtube_url}`;
                        if (Platform.OS === 'web') {
                          window.open(youtubeUrl, '_blank');
                        }
                      }}
                    >
                      <ExternalLink color="#666" size={20} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Video color="#999" size={48} />
                <Text style={styles.emptyStateText}>No promoted videos yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Promote your first video to start earning coins!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    minHeight: Platform.OS === 'ios' ? 100 : 90,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
    minWidth: isSmallScreen ? 70 : 80,
    justifyContent: 'center',
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginLeft: isSmallScreen ? 4 : 6,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    padding: 16,
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
    position: 'relative',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  validationIcon: {
    position: 'absolute',
    right: 16,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  optionGroup: {
    flex: 1,
    position: 'relative',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
    maxHeight: 200,
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
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  costDisplay: {
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
    color: '#FF4757',
  },
  costSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    paddingVertical: 16,
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
    backgroundColor: '#999',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recentSection: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  videosList: {
    backgroundColor: 'white',
    borderRadius: 16,
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
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoDate: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  videoAction: {
    padding: 8,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});