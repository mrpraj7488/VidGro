import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Eye, 
  Clock, 
  DollarSign, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Crown,
  ChevronDown,
  Link as LinkIcon,
  Loader
} from 'lucide-react-native';

interface VideoData {
  title: string;
  embedUrl: string;
  isEmbeddable: boolean;
}

const VIEW_OPTIONS = [35, 50, 100, 200, 300, 400, 500, 750, 1000];
const DURATION_OPTIONS = [45, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480, 540];

// Cost calculation formula: (views * duration) / 100 * 2.5
const calculateCost = (views: number, duration: number): number => {
  return Math.ceil((views * duration) / 100 * 2.5);
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(90);
  const [description, setDescription] = useState('');
  
  // UI state
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [embeddabilityStatus, setEmbeddabilityStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isPromoting, setIsPromoting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const webviewRef = useRef<WebView>(null);

  // Calculate costs
  const baseCost = calculateCost(selectedViews, selectedDuration);
  const vipDiscount = profile?.is_vip ? Math.ceil(baseCost * 0.1) : 0;
  const finalCost = baseCost - vipDiscount;
  const rewardPerView = Math.ceil(baseCost / selectedViews * 0.8); // 80% of cost per view as reward

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

  // Auto-fetch video data when URL changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && extractVideoId(youtubeUrl)) {
        fetchVideoData(youtubeUrl);
      } else {
        setVideoData(null);
        setEmbeddabilityStatus('idle');
        setStatusMessage('');
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  const fetchVideoData = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) return;

    setIsProcessingUrl(true);
    setEmbeddabilityStatus('testing');
    setStatusMessage('Checking video compatibility...');

    try {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      // Test embeddability by trying to load the embed URL
      const testResponse = await fetch(embedUrl, { method: 'HEAD' });
      
      if (testResponse.ok) {
        // Try to fetch title using YouTube oEmbed API (no API key required)
        try {
          const oEmbedResponse = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
          );
          
          if (oEmbedResponse.ok) {
            const oEmbedData = await oEmbedResponse.json();
            setVideoTitle(oEmbedData.title || '');
          }
        } catch (error) {
          console.log('Could not fetch title via oEmbed, user can enter manually');
        }

        setVideoData({
          title: videoTitle,
          embedUrl,
          isEmbeddable: true,
        });
        setEmbeddabilityStatus('success');
        setStatusMessage('Video is embeddable and ready for promotion!');
      } else {
        setVideoData({
          title: '',
          embedUrl: '',
          isEmbeddable: false,
        });
        setEmbeddabilityStatus('error');
        setStatusMessage('Video cannot be embedded. Please try a different video.');
      }
    } catch (error) {
      setEmbeddabilityStatus('error');
      setStatusMessage('Error checking video compatibility. Please try again.');
    } finally {
      setIsProcessingUrl(false);
    }
  };

  const handlePromoteVideo = async () => {
    if (!user || !videoData?.isEmbeddable) {
      Alert.alert('Error', 'Please ensure video is valid and embeddable');
      return;
    }

    if (!videoTitle.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }

    if (finalCost > (profile?.coins || 0)) {
      Alert.alert('Insufficient Coins', `You need ${finalCost} coins but only have ${profile?.coins || 0} coins.`);
      return;
    }

    setIsPromoting(true);

    try {
      // Deduct coins first
      const { data: coinResult, error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -finalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle}`,
          reference_uuid: null
        });

      if (coinError || !coinResult) {
        throw new Error('Failed to deduct coins');
      }

      // Create video promotion
      const { error: videoError } = await supabase
        .from('videos')
        .insert([{
          user_id: user.id,
          youtube_url: extractVideoId(youtubeUrl),
          title: videoTitle,
          description: description || '',
          duration_seconds: selectedDuration,
          coin_cost: finalCost,
          coin_reward: rewardPerView,
          target_views: selectedViews,
          status: 'active'
        }]);

      if (videoError) {
        throw videoError;
      }

      // Refresh profile to update coin balance
      await refreshProfile();

      Alert.alert(
        'Success!', 
        `Your video has been promoted successfully! ${selectedViews} people will watch it for ${selectedDuration} seconds each.`,
        [{ text: 'OK', onPress: resetForm }]
      );

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', error.message || 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const resetForm = () => {
    setYoutubeUrl('');
    setVideoTitle('');
    setDescription('');
    setVideoData(null);
    setEmbeddabilityStatus('idle');
    setStatusMessage('');
  };

  const handleUpgradeToVip = () => {
    Alert.alert(
      'Upgrade to VIP',
      'VIP membership gives you 10% discount on all promotions and other exclusive benefits!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => Alert.alert('VIP Benefits', 'Coming soon!') }
      ]
    );
  };

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
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* YouTube URL Input */}
          <View style={styles.section}>
            <Text style={styles.label}>YouTube URL *</Text>
            <View style={styles.inputContainer}>
              <LinkIcon color="#666" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="https://youtu.be/fCtFxT3n_l0"
                placeholderTextColor="#999"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              {isProcessingUrl && (
                <Loader color="#FF4757" size={20} style={styles.loadingIcon} />
              )}
            </View>
          </View>

          {/* Status Message */}
          {statusMessage && (
            <View style={[
              styles.statusContainer,
              embeddabilityStatus === 'success' ? styles.successStatus :
              embeddabilityStatus === 'error' ? styles.errorStatus : styles.testingStatus
            ]}>
              {embeddabilityStatus === 'success' && <CheckCircle color="#2ECC71" size={20} />}
              {embeddabilityStatus === 'error' && <AlertCircle color="#E74C3C" size={20} />}
              {embeddabilityStatus === 'testing' && <Loader color="#FF4757" size={20} />}
              <Text style={[
                styles.statusText,
                embeddabilityStatus === 'success' ? styles.successText :
                embeddabilityStatus === 'error' ? styles.errorText : styles.testingText
              ]}>
                {statusMessage}
              </Text>
            </View>
          )}

          {/* Video Preview */}
          {videoData?.isEmbeddable && videoData.embedUrl && (
            <View style={styles.videoPreview}>
              <WebView
                ref={webviewRef}
                source={{ uri: videoData.embedUrl }}
                style={styles.webview}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          )}

          {/* Video Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Video Title *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>T</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter video title"
                placeholderTextColor="#999"
                value={videoTitle}
                onChangeText={setVideoTitle}
              />
            </View>
          </View>

          {/* Number of Views Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>Number of Views *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(!showViewsDropdown)}
            >
              <Eye color="#666" size={20} style={styles.dropdownIcon} />
              <Text style={styles.dropdownText}>{selectedViews} views</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            
            {showViewsDropdown && (
              <View style={styles.dropdownList}>
                {VIEW_OPTIONS.map((views) => (
                  <TouchableOpacity
                    key={views}
                    style={[
                      styles.dropdownItem,
                      selectedViews === views && styles.selectedDropdownItem
                    ]}
                    onPress={() => {
                      setSelectedViews(views);
                      setShowViewsDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedViews === views && styles.selectedDropdownItemText
                    ]}>
                      {views} views
                    </Text>
                    {selectedViews === views && <CheckCircle color="#FF4757" size={16} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Duration Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>Set Duration (seconds) *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(!showDurationDropdown)}
            >
              <Clock color="#666" size={20} style={styles.dropdownIcon} />
              <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
              <ChevronDown color="#666" size={20} />
            </TouchableOpacity>
            
            {showDurationDropdown && (
              <View style={styles.dropdownList}>
                {DURATION_OPTIONS.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.dropdownItem,
                      selectedDuration === duration && styles.selectedDropdownItem
                    ]}
                    onPress={() => {
                      setSelectedDuration(duration);
                      setShowDurationDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedDuration === duration && styles.selectedDropdownItemText
                    ]}>
                      {duration} seconds
                    </Text>
                    {selectedDuration === duration && <CheckCircle color="#FF4757" size={16} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Cost Breakdown */}
          <View style={styles.costSection}>
            <Text style={styles.costTitle}>Promotion Cost</Text>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Base Cost:</Text>
              <Text style={styles.costValue}>₡{baseCost}</Text>
            </View>
            
            {profile?.is_vip && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>VIP Discount (10%):</Text>
                <Text style={styles.discountValue}>-₡{vipDiscount}</Text>
              </View>
            )}
            
            <View style={styles.finalCostRow}>
              <Text style={styles.finalCostLabel}>Final Cost:</Text>
              <Text style={styles.finalCostValue}>₡{finalCost}</Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Reward per view:</Text>
              <Text style={styles.costValue}>₡{rewardPerView}</Text>
            </View>
            
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Your balance:</Text>
              <Text style={[
                styles.costValue,
                (profile?.coins || 0) >= finalCost ? styles.sufficientBalance : styles.insufficientBalance
              ]}>
                ₡{profile?.coins || 0}
              </Text>
            </View>
          </View>

          {/* VIP Upgrade Prompt */}
          {!profile?.is_vip && (
            <TouchableOpacity style={styles.vipPrompt} onPress={handleUpgradeToVip}>
              <Crown color="#FFA726" size={20} />
              <Text style={styles.vipPromptText}>
                VIP members save ₡{Math.ceil(baseCost * 0.1)} on this promotion - Become VIP?
              </Text>
            </TouchableOpacity>
          )}

          {/* Description (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a description for your video..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Promote Button */}
          <TouchableOpacity
            style={[
              styles.promoteButton,
              (!videoData?.isEmbeddable || !videoTitle.trim() || (profile?.coins || 0) < finalCost || isPromoting) && styles.promoteButtonDisabled
            ]}
            onPress={handlePromoteVideo}
            disabled={!videoData?.isEmbeddable || !videoTitle.trim() || (profile?.coins || 0) < finalCost || isPromoting}
          >
            {isPromoting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <TrendingUp color="white" size={20} />
                <Text style={styles.promoteButtonText}>Promote Video</Text>
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
    fontSize: 18,
    fontWeight: '600',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    paddingVertical: 4,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successStatus: {
    backgroundColor: '#E8F5E8',
  },
  errorStatus: {
    backgroundColor: '#FFEBEE',
  },
  testingStatus: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#2ECC71',
  },
  errorText: {
    color: '#E74C3C',
  },
  testingText: {
    color: '#FF9800',
  },
  videoPreview: {
    height: 200,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  webview: {
    flex: 1,
  },
  dropdown: {
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
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedDropdownItem: {
    backgroundColor: '#FFF5F5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownItemText: {
    color: '#FF4757',
    fontWeight: '600',
  },
  costSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  costTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  finalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  finalCostLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalCostValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  sufficientBalance: {
    color: '#2ECC71',
  },
  insufficientBalance: {
    color: '#E74C3C',
  },
  vipPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  vipPromptText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
    flex: 1,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 20,
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
    marginLeft: 8,
  },
});