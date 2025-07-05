import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ToastAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Type, Clock, DollarSign, TrendingUp, Eye, Search, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';

interface VideoData {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  valid: boolean;
  embeddable: boolean;
  embedUrl: string;
  watchUrl: string;
  originalUrl: string;
  warning?: string;
}

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [userSetDuration, setUserSetDuration] = useState('');
  const [targetViews, setTargetViews] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  const fetchVideoData = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setFetchingVideo(true);
    setError(null);
    setVideoData(null);

    try {
      console.log('Fetching video data for URL:', youtubeUrl);

      const response = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle embeddability error specifically
        if (errorData.embeddable === false) {
          Alert.alert(
            'Video Not Embeddable',
            'This video cannot be embedded. Please make it embeddable first or choose a different video.',
            [{ text: 'OK' }]
          );
          setError('Video not embeddable');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch video data`);
      }
      
      const data = await response.json();
      console.log('Video data received:', data);

      if (data.valid && data.embeddable) {
        // Create VideoData object with all required fields
        const processedVideoData: VideoData = {
          id: data.id,
          title: data.title,
          duration: data.duration,
          thumbnail: data.thumbnail,
          valid: data.valid,
          embeddable: data.embeddable,
          embedUrl: data.embedUrl || `https://www.youtube.com/embed/${data.id}`,
          watchUrl: data.watchUrl || `https://www.youtube.com/watch?v=${data.id}`,
          originalUrl: data.originalUrl || youtubeUrl,
          warning: data.warning
        };

        setVideoData(processedVideoData);
        setTitle(data.title || '');
        setError(null);
        
        if (data.warning) {
          showToast(`Warning: ${data.warning}`);
        }
        
        showToast('Video validated successfully!');
      } else {
        const errorMsg = data.embeddable === false 
          ? 'Video not embeddable, make it embeddable first'
          : data.message || 'Invalid YouTube video';
        
        if (data.embeddable === false) {
          Alert.alert(
            'Video Not Embeddable',
            'This video cannot be embedded. Please make it embeddable first or choose a different video.',
            [{ text: 'OK' }]
          );
        }
        
        setError(errorMsg);
        setVideoData(null);
      }
    } catch (error: any) {
      console.error('Error fetching video data:', error);
      setError(error.message || 'Failed to fetch video information. Please check your internet connection and try again.');
      setVideoData(null);
    } finally {
      setFetchingVideo(false);
    }
  };

  const calculateCosts = () => {
    const durationSeconds = parseInt(userSetDuration) || 0;
    const views = parseInt(targetViews) || 0;
    
    // Enhanced cost calculation: 1 coin per 10 seconds per view
    const costPerView = Math.ceil(durationSeconds / 10);
    const totalCost = costPerView * views;
    const rewardPerView = Math.ceil(costPerView * 0.8); // 80% of cost goes to viewers
    
    return { totalCost, rewardPerView, costPerView };
  };

  const { totalCost, rewardPerView } = calculateCosts();

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const validateDuration = () => {
    const userDuration = parseInt(userSetDuration);
    const videoDuration = videoData?.duration || 0;
    
    if (isNaN(userDuration) || userDuration < 10) {
      return 'Duration must be at least 10 seconds';
    }
    
    if (userDuration > 600) {
      return 'Duration must be less than 600 seconds (10 minutes)';
    }
    
    if (videoDuration > 0 && userDuration > videoDuration) {
      return `Duration cannot exceed actual video length (${videoDuration} seconds)`;
    }
    
    return null;
  };

  const handlePromoteVideo = async () => {
    // Input validation
    if (!youtubeUrl || !title || !userSetDuration || !targetViews) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validateYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    const durationError = validateDuration();
    if (durationError) {
      setError(durationError);
      return;
    }

    const durationSeconds = parseInt(userSetDuration);
    const views = parseInt(targetViews);

    if (isNaN(views) || views < 1 || views > 1000) {
      setError('Target views must be between 1 and 1000');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!profile || profile.coins < totalCost) {
      setError(`You need ${totalCost} coins to promote this video. You have ${profile?.coins || 0} coins.`);
      return;
    }

    // Check if video is embeddable before proceeding
    if (!videoData || !videoData.embeddable) {
      Alert.alert(
        'Video Not Embeddable',
        'Please validate the video first and ensure it is embeddable.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Promoting video with data:', {
        userId: user.id,
        totalCost,
        title,
        duration: durationSeconds,
        targetViews: views,
        youtubeUrl: videoData.embedUrl, // Store embed URL for playback
        embeddable: videoData.embeddable
      });

      // Use the database function to deduct coins safely
      const { data: coinUpdateResult, error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -totalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted: ${title}`,
        });

      if (coinError) {
        console.error('Error deducting coins:', coinError);
        throw new Error(`Failed to deduct coins: ${coinError.message}`);
      }

      if (!coinUpdateResult) {
        throw new Error('Insufficient coins or failed to deduct coins');
      }

      console.log('Coins deducted successfully');

      // Create video promotion with embed URL for playback
      const videoInsertData = {
        user_id: user.id,
        youtube_url: videoData.embedUrl, // Store embed URL for seamless playback
        title,
        description: `Original URL: ${videoData.originalUrl} | User-set duration: ${durationSeconds}s${videoData?.duration ? ` (Actual: ${videoData.duration}s)` : ''} - Embeddable: ${videoData.embeddable}${videoData?.warning ? ` - Warning: ${videoData.warning}` : ''}`,
        duration_seconds: durationSeconds,
        coin_cost: totalCost,
        coin_reward: rewardPerView,
        target_views: views,
        views_count: 0,
        status: 'active',
      };

      console.log('Inserting video data:', videoInsertData);

      const { data: videoResult, error: insertError } = await supabase
        .from('videos')
        .insert(videoInsertData)
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Error creating video promotion:', insertError);
        throw new Error(`Failed to create video promotion: ${insertError.message}`);
      }

      console.log('Video promotion created successfully:', videoResult);

      // Refresh profile to get updated coin balance
      await refreshProfile();

      // Show success toast instead of alert
      showToast(`Video promoted successfully! ${totalCost} coins deducted.`);
      
      // Reset form
      resetForm();

    } catch (error: any) {
      console.error('Error promoting video:', error);
      setError(error.message || 'Failed to promote video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setYoutubeUrl('');
    setTitle('');
    setUserSetDuration('');
    setTargetViews('');
    setVideoData(null);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <DollarSign color="white" size={20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle color="#D32F2F" size={20} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* YouTube URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube URL *</Text>
              <View style={styles.inputContainer}>
                <Link color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[styles.fetchButton, fetchingVideo && styles.fetchButtonDisabled]}
                  onPress={fetchVideoData}
                  disabled={fetchingVideo || !youtubeUrl.trim()}
                >
                  <Search color={fetchingVideo ? "#999" : "#FF4757"} size={20} />
                </TouchableOpacity>
              </View>
              {fetchingVideo && (
                <Text style={styles.helperText}>Validating video embeddability and converting URL...</Text>
              )}
              <Text style={styles.helperText}>
                Supports both youtube.com/watch and youtu.be formats. URL will be automatically converted for optimal playback.
              </Text>
            </View>

            {/* Video Preview */}
            {videoData && videoData.embeddable && (
              <View style={styles.videoPreview}>
                <View style={styles.videoPreviewHeader}>
                  <CheckCircle color="#2ECC71" size={20} />
                  <Text style={styles.videoPreviewTitle}>Video Validated & URL Converted</Text>
                </View>
                <View style={styles.videoPreviewContent}>
                  <Image 
                    source={{ uri: videoData.thumbnail }} 
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {videoData.title}
                    </Text>
                    <Text style={styles.videoDuration}>
                      Actual Duration: {formatTime(videoData.duration)}
                    </Text>
                    <Text style={styles.videoNote}>
                      ✅ Embeddable - Ready for promotion
                    </Text>
                    <Text style={styles.urlConversion}>
                      🔄 URL converted to embed format for optimal playback
                    </Text>
                    {videoData.warning && (
                      <Text style={styles.videoWarning}>
                        ⚠️ {videoData.warning}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.urlDetails}>
                  <Text style={styles.urlLabel}>Original URL:</Text>
                  <Text style={styles.urlText} numberOfLines={1}>{videoData.originalUrl}</Text>
                  <Text style={styles.urlLabel}>Embed URL (stored):</Text>
                  <Text style={styles.urlText} numberOfLines={1}>{videoData.embedUrl}</Text>
                </View>
              </View>
            )}

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Video Title *</Text>
              <View style={styles.inputContainer}>
                <Type color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter video title"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>
            </View>

            {/* User-Set Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set Duration (seconds) *</Text>
              <View style={styles.inputContainer}>
                <Clock color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 120"
                  value={userSetDuration}
                  onChangeText={setUserSetDuration}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <Text style={styles.helperText}>
                Minimum 10 seconds, Maximum 600 seconds
                {videoData && ` (Video is ${videoData.duration}s long)`}
              </Text>
              {userSetDuration && videoData && parseInt(userSetDuration) > videoData.duration && (
                <Text style={styles.errorHelperText}>
                  ⚠️ Duration cannot exceed actual video length ({videoData.duration}s)
                </Text>
              )}
            </View>

            {/* Target Views */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Views *</Text>
              <View style={styles.inputContainer}>
                <Eye color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100"
                  value={targetViews}
                  onChangeText={setTargetViews}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <Text style={styles.helperText}>Maximum 1000 views per promotion</Text>
            </View>

            {/* Cost Calculation */}
            {userSetDuration && targetViews && (
              <View style={styles.costCard}>
                <Text style={styles.costTitle}>Promotion Cost</Text>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Cost per view:</Text>
                  <Text style={styles.costValue}>{Math.ceil(parseInt(userSetDuration) / 10)} coins</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Total Cost:</Text>
                  <Text style={styles.costValue}>{totalCost} coins</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Reward per view:</Text>
                  <Text style={styles.costValue}>{rewardPerView} coins</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Your balance:</Text>
                  <Text style={[
                    styles.costValue, 
                    (profile?.coins || 0) < totalCost && styles.insufficientBalance
                  ]}>
                    {profile?.coins || 0} coins
                  </Text>
                </View>
                {videoData && videoData.embeddable && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>URL Format:</Text>
                    <Text style={[styles.costValue, { color: '#2ECC71' }]}>✓ Optimized for playback</Text>
                  </View>
                )}
              </View>
            )}

            {/* Promote Button */}
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (loading || !youtubeUrl || !title || !userSetDuration || !targetViews || (profile?.coins || 0) < totalCost || validateDuration() || !videoData?.embeddable) && styles.buttonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={loading || !youtubeUrl || !title || !userSetDuration || !targetViews || (profile?.coins || 0) < totalCost || !!validateDuration() || !videoData?.embeddable}
            >
              <TrendingUp color="white" size={20} style={styles.buttonIcon} />
              <Text style={styles.promoteButtonText}>
                {loading ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How URL conversion works:</Text>
              <Text style={styles.instructionsText}>
                1. Enter any YouTube URL format (youtube.com/watch or youtu.be){'\n'}
                2. System validates embeddability and extracts video ID{'\n'}
                3. URL is automatically converted to embed format for optimal playback{'\n'}
                4. Both original and embed URLs are stored for reference{'\n'}
                5. Viewers see seamless video playback in the app{'\n'}
                6. Your video gets promoted to more viewers!
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 50,
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
    marginLeft: 4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
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
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#333',
  },
  fetchButton: {
    padding: 8,
  },
  fetchButtonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorHelperText: {
    fontSize: 12,
    color: '#FF4757',
    marginTop: 4,
    fontWeight: '500',
  },
  videoPreview: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2ECC71',
    ...Platform.select({
      ios: {
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(46, 204, 113, 0.1)',
      },
    }),
  },
  videoPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ECC71',
    marginLeft: 8,
  },
  videoPreviewContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  videoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  videoNote: {
    fontSize: 11,
    color: '#2ECC71',
    fontWeight: '500',
    marginBottom: 4,
  },
  urlConversion: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4,
  },
  videoWarning: {
    fontSize: 11,
    color: '#FF4757',
    fontWeight: '500',
  },
  urlDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  urlLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  urlText: {
    fontSize: 10,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  costCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  insufficientBalance: {
    color: '#FF4757',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    height: 52,
    marginBottom: 24,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});