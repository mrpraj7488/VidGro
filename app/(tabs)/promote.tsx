import React, { useState, useRef, useEffect } from 'react';
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
  ToastAndroid,
  Dimensions,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Type, Clock, TrendingUp, Eye, Search, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, ChevronUp, Play, Pause, Crown, DollarSign } from 'lucide-react-native';
import GlobalHeader from './GlobalHeader'; // Import GlobalHeader

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface VideoData {
  id: string;
  embedUrl: string;
  thumbnail: string;
  title?: string;
  embeddable: boolean;
  originalUrl: string;
  autoDetectedTitle?: string;
  isLive?: boolean;
}

interface DropdownOption {
  label: string;
  value: number;
}

const VIEW_OPTIONS: DropdownOption[] = [
  { label: '35 views', value: 35 },
  { label: '50 views', value: 50 },
  { label: '100 views', value: 100 },
  { label: '200 views', value: 200 },
  { label: '300 views', value: 300 },
  { label: '400 views', value: 400 },
  { label: '500 views', value: 500 },
  { label: '750 views', value: 750 },
  { label: '1000 views', value: 1000 },
];

const DURATION_OPTIONS: DropdownOption[] = [
  { label: '45 seconds', value: 45 },
  { label: '60 seconds', value: 60 },
  { label: '90 seconds', value: 90 },
  { label: '120 seconds', value: 120 },
  { label: '150 seconds', value: 150 },
  { label: '180 seconds', value: 180 },
  { label: '240 seconds', value: 240 },
  { label: '300 seconds', value: 300 },
  { label: '360 seconds', value: 360 },
  { label: '420 seconds', value: 420 },
  { label: '480 seconds', value: 480 },
  { label: '540 seconds', value: 540 },
];

interface FuturisticDropdownProps {
  options: DropdownOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
  placeholder: string;
  visible: boolean;
  onClose: () => void;
}

const FuturisticDropdown: React.FC<FuturisticDropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder,
  visible,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  return (
    visible && (
      <Animated.View style={[styles.dropdownOverlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.dropdownBackdrop} onPress={onClose} />
        <Animated.View 
          style={[
            styles.dropdownContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            style={styles.dropdownHeader}
          >
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView 
            style={styles.dropdownScrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  selectedValue === option.value && styles.dropdownOptionSelected,
                  index === options.length - 1 && styles.dropdownOptionLast,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  selectedValue === option.value && styles.dropdownOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <CheckCircle color="#800080" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    )
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [userSetDuration, setUserSetDuration] = useState<number | null>(null);
  const [targetViews, setTargetViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [embedabilityTested, setEmbedabilityTested] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testingPlayback, setTestingPlayback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  const webviewRef = useRef<WebView>(null);
  const maxRetries = 2;
  const loadingTimeoutDuration = 5000;

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const calculateCosts = () => {
    const durationSeconds = userSetDuration || 0;
    const views = targetViews || 0;
    const baseCost = Math.ceil((views * durationSeconds) / 100 * 2.5);
    const vipDiscount = profile?.is_vip ? Math.ceil(baseCost * 0.1) : 0;
    const totalCost = baseCost - vipDiscount;
    return { baseCost, totalCost, vipDiscount, costPerView: Math.ceil(baseCost / views) || 0 };
  };

  const { baseCost, totalCost, vipDiscount, costPerView } = calculateCosts();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && extractVideoId(youtubeUrl)) {
        fetchVideoData();
      } else {
        setVideoData(null);
        setEmbedabilityTested(false);
        setError(null);
        setTitle('');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  const fetchVideoData = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setFetchingVideo(true);
    setError(null);
    setVideoData(null);
    setShowIframe(false);
    setEmbedabilityTested(false);
    setRetryCount(0);
    setLoadingTimeout(false);

    try {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) throw new Error('Invalid YouTube URL format');

      const oEmbedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oEmbedResponse.ok) {
        const oEmbedData = await oEmbedResponse.json();
        if (oEmbedData.title && !title) {
          setTitle(oEmbedData.title);
          showToast(`Title auto-filled: ${oEmbedData.title}`);
        }
      }

      const processedVideoData: VideoData = {
        id: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embeddable: false,
        originalUrl: youtubeUrl,
      };

      setVideoData(processedVideoData);
      setError(null);
      setShowIframe(true);
      showToast('Video processing... Testing compatibility...');
    } catch (error: any) {
      setError(error.message || 'Failed to extract video ID. Please check the URL format.');
      setVideoData(null);
    } finally {
      setFetchingVideo(false);
    }
  };

  const createIframeHTML = (embedUrl: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
          #player { width: 100%; height: 100%; border: none; }
          .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-family: Arial, sans-serif; z-index: 1000; }
          .error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff4757; font-family: Arial, sans-serif; text-align: center; z-index: 1000; }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">Testing video compatibility...</div>
        <div id="error" class="error" style="display: none;"></div>
        <div id="player"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
          var player;
          var isPlayerReady = false;
          var loadingTimeoutId = setTimeout(() => {
            if (!isPlayerReady) {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Video loading timeout. May not be embeddable.';
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOADING_TIMEOUT', message: 'Loading timeout' }));
            }
          }, ${loadingTimeoutDuration});

          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoData?.id}',
              playerVars: { autoplay: 0, controls: 0, modestbranding: 1, showinfo: 0, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3, enablejsapi: 1 },
              events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
            });
          }

          function onPlayerReady(event) {
            clearTimeout(loadingTimeoutId);
            isPlayerReady = true;
            document.getElementById('loading').style.display = 'none';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYER_READY', videoId: '${videoData?.id}' }));
            setTimeout(() => player.playVideo(), 1500);
          }

          function onPlayerStateChange(event) {
            if (event.data === 1) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYBACK_SUCCESS', embeddable: true }));
            }
          }

          function onPlayerError(event) {
            clearTimeout(loadingTimeoutId);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Video playback error';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYBACK_FAILED', embeddable: false }));
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'PLAYER_READY':
          setIframeLoaded(true);
          setLoadingTimeout(false);
          showToast('Video player loaded successfully');
          break;
        case 'LOADING_TIMEOUT':
          setLoadingTimeout(true);
          setIframeLoaded(false);
          setError('Video loading timeout. It may not be embeddable.');
          break;
        case 'PLAYBACK_SUCCESS':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: true } : null);
          setError(null);
          showToast('✅ Video is embeddable and ready for promotion!');
          break;
        case 'PLAYBACK_FAILED':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
          setError('This video cannot be embedded.');
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const validateDuration = () => {
    if (!userSetDuration || userSetDuration < 10) return 'Duration must be at least 10 seconds';
    if (userSetDuration > 600) return 'Duration must be less than 600 seconds';
    return null;
  };

  const handlePromoteVideo = async () => {
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
    const views = targetViews;
    if (isNaN(views) || views < 1 || views > 1000) {
      setError('Target views must be between 1 and 1000');
      return;
    }
    if (!user || !profile || profile.coins < totalCost) {
      setError(`You need 🪙${totalCost} coins. You have 🪙${profile?.coins || 0}.`);
      return;
    }
    if (!videoData || !embedabilityTested || !videoData.embeddable) {
      setError('Please test video compatibility first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: coinError } = await supabase.rpc('update_user_coins', {
        user_uuid: user.id,
        coin_amount: -totalCost,
        transaction_type_param: 'video_promotion',
        description_param: `Promoted: ${title}`,
      });
      if (coinError) throw new Error(`Failed to deduct coins: ${coinError.message}`);

      const { error: insertError } = await supabase.rpc('create_video_with_hold', {
        user_uuid: user.id,
        youtube_url_param: videoData.id,
        title_param: title,
        description_param: `Embed URL: ${videoData.embedUrl} | Original URL: ${videoData.originalUrl}`,
        duration_seconds_param: userSetDuration,
        coin_cost_param: totalCost,
        coin_reward_param: 3,
        target_views_param: views,
      });
      if (insertError) throw new Error(`Failed to create promotion: ${insertError.message}`);

      await refreshProfile();
      Alert.alert(
        'Video Promoted Successfully!',
        `Your video is on hold for 10 minutes.\nCost: 🪙${totalCost} coins deducted`,
        [{ text: 'OK' }]
      );
      resetForm();
    } catch (error: any) {
      setError(error.message || 'Failed to promote video.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setYoutubeUrl('');
    setTitle('');
    setUserSetDuration(null);
    setTargetViews(null);
    setVideoData(null);
    setError(null);
    setShowIframe(false);
    setIframeLoaded(false);
    setEmbedabilityTested(false);
    setIsPlaying(false);
    setTestingPlayback(false);
    setRetryCount(0);
    setLoadingTimeout(false);
  };

  const openDropdown = (type: 'views' | 'duration') => {
    if (type === 'views') {
      setShowDurationDropdown(false);
      setShowViewsDropdown(true);
    } else {
      setShowViewsDropdown(false);
      setShowDurationDropdown(true);
    }
  };

  const closeDropdowns = () => {
    setShowViewsDropdown(false);
    setShowDurationDropdown(false);
  };

  const getSelectedViewsLabel = () => {
    const option = VIEW_OPTIONS.find(opt => opt.value === targetViews);
    return option ? option.label : 'Select views';
  };

  const getSelectedDurationLabel = () => {
    const option = DURATION_OPTIONS.find(opt => opt.value === userSetDuration);
    return option ? option.label : 'Select duration';
  };

  const handleUpgradeToVip = () => {
    Alert.alert(
      'Upgrade to VIP',
      'VIP membership gives you 10% discount on all promotions!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => Alert.alert('VIP Benefits', 'Coming soon!') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle color="#D32F2F" size={20} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube URL *</Text>
              <View style={styles.inputContainer}>
                <Link color="#666" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="https://youtu.be/fCtFxT3n_l0"
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
                  <Search color={fetchingVideo ? "#999" : "#800080"} size={20} />
                </TouchableOpacity>
              </View>
              {fetchingVideo && <Text style={styles.helperText}>Checking video compatibility...</Text>}
            </View>

            {videoData && (
              <View style={styles.iframeSection}>
                <TouchableOpacity style={styles.iframeToggle} onPress={() => setShowIframe(!showIframe)}>
                  <View style={styles.iframeToggleContent}>
                    <Text style={styles.iframeToggleTitle}>
                      Compatibility Test {embedabilityTested && (videoData.embeddable ? '✅' : '❌')}
                    </Text>
                    {showIframe ? <ChevronUp color="#666" size={20} /> : <ChevronDown color="#666" size={20} />}
                  </View>
                </TouchableOpacity>
                {showIframe && (
                  <View style={styles.iframeContainer}>
                    <View style={styles.webviewContainer}>
                      <WebView
                        ref={webviewRef}
                        source={{ html: createIframeHTML(videoData.embedUrl) }}
                        style={styles.webview}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        mixedContentMode="compatibility"
                        originWhitelist={['*']}
                        allowsFullscreenVideo={false}
                      />
                    </View>
                    {embedabilityTested && (
                      <View style={[
                        styles.embedabilityResult,
                        videoData.embeddable ? styles.embedabilitySuccess : styles.embedabilityError,
                      ]}>
                        {videoData.embeddable ? (
                          <>
                            <CheckCircle color="#2ECC71" size={20} />
                            <Text style={styles.embedabilityText}>✅ Video is embeddable!</Text>
                          </>
                        ) : (
                          <>
                            <AlertCircle color="#E74C3C" size={20} />
                            <Text style={styles.embedabilityText}>❌ Video is not embeddable.</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

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
              {videoData?.autoDetectedTitle && (
                <TouchableOpacity
                  style={styles.autoTitleButton}
                  onPress={() => setTitle(videoData.autoDetectedTitle || '')}
                >
                  <Text style={styles.autoTitleText}>Use auto-detected: "{videoData.autoDetectedTitle}"</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Views *</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openDropdown('views')}>
                <Eye color="#666" size={20} style={styles.inputIcon} />
                <Text style={[styles.dropdownTriggerText, targetViews && styles.dropdownTriggerTextSelected]}>
                  {getSelectedViewsLabel()}
                </Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set Duration (seconds) *</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openDropdown('duration')}>
                <Clock color="#666" size={20} style={styles.inputIcon} />
                <Text style={[styles.dropdownTriggerText, userSetDuration && styles.dropdownTriggerTextSelected]}>
                  {getSelectedDurationLabel()}
                </Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            {userSetDuration && targetViews && (
              <View style={styles.costCard}>
                <Text style={styles.costTitle}>Promotion Cost</Text>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Base Cost:</Text>
                  <Text style={styles.costValue}>🪙{baseCost}</Text>
                </View>
                {profile?.is_vip && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>VIP Discount (10%):</Text>
                    <Text style={styles.discountValue}>-🪙{vipDiscount}</Text>
                  </View>
                )}
                <View style={styles.finalCostRow}>
                  <Text style={styles.finalCostLabel}>Final Cost:</Text>
                  <Text style={styles.finalCostValue}>🪙{totalCost}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Your balance:</Text>
                  <Text style={[styles.costValue, (profile?.coins || 0) < totalCost && styles.insufficientBalance]}>
                    🪙{profile?.coins || 0}
                  </Text>
                </View>
              </View>
            )}

            {!profile?.is_vip && userSetDuration && targetViews && (
              <TouchableOpacity style={styles.vipPrompt} onPress={handleUpgradeToVip}>
                <Crown color="#FFA726" size={20} />
                <Text style={styles.vipPromptText}>
                  VIP members save 🪙{vipDiscount || Math.ceil(baseCost * 0.1)} - Become VIP?
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.promoteButton,
                (loading || !youtubeUrl || !title || !userSetDuration || !targetViews || (profile?.coins || 0) < totalCost || validateDuration() || !videoData?.embeddable) && styles.buttonDisabled,
              ]}
              onPress={handlePromoteVideo}
              disabled={loading || !youtubeUrl || !title || !userSetDuration || !targetViews || (profile?.coins || 0) < totalCost || !!validateDuration() || !videoData?.embeddable}
            >
              <TrendingUp color="white" size={20} style={styles.buttonIcon} />
              <Text style={styles.promoteButtonText}>{loading ? 'Promoting...' : 'Promote Video'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FuturisticDropdown
        options={VIEW_OPTIONS}
        selectedValue={targetViews}
        onSelect={setTargetViews}
        placeholder="Select Number of Views"
        visible={showViewsDropdown}
        onClose={closeDropdowns}
      />
      <FuturisticDropdown
        options={DURATION_OPTIONS}
        selectedValue={userSetDuration}
        onSelect={setUserSetDuration}
        placeholder="Select Duration (seconds)"
        visible={showDurationDropdown}
        onClose={closeDropdowns}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    minHeight: Platform.OS === 'ios' ? 100 : 90,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 16,
  },
  hamburgerIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
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
  },
  coinEmoji: {
    fontSize: isSmallScreen ? 16 : 18,
    marginRight: 4,
  },
  coinCount: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  dropdownTriggerTextSelected: {
    color: '#333',
    fontWeight: '500',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  dropdownBackdrop: {
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.7,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdownScrollView: {
    maxHeight: screenHeight * 0.5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionSelected: {
    backgroundColor: '#F8F0FF',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#800080',
    fontWeight: '600',
  },
  iframeSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  iframeToggle: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iframeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iframeToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  iframeContainer: {
    padding: 16,
  },
  webviewContainer: {
    height: isSmallScreen ? 180 : 220,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  embedabilityResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  embedabilitySuccess: {
    backgroundColor: '#E8F5E8',
  },
  embedabilityError: {
    backgroundColor: '#FFE5E5',
  },
  embedabilityText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  autoTitleButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  autoTitleText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  costCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
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
    color: '#800080',
  },
  insufficientBalance: {
    color: '#FF4757',
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
    backgroundColor: '#800080',
    borderRadius: 12,
    height: 52,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#800080', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(128, 0, 128, 0.3)' },
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
});