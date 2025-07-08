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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Link, 
  Type, 
  Clock, 
  Coins, 
  TrendingUp, 
  Eye, 
  Search, 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause,
  Crown,
  Sparkles
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

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState<number>(35);
  const [selectedDuration, setSelectedDuration] = useState<number>(45);
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
  const [activeDropdown, setActiveDropdown] = useState<'views' | 'duration' | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [autoFetching, setAutoFetching] = useState(false);
  
  const webviewRef = useRef<WebView>(null);
  const maxRetries = 2;
  const loadingTimeoutDuration = 5000; // 5 seconds

  // Animation values
  const dropdownOpacity = useSharedValue(0);
  const dropdownTranslateY = useSharedValue(300);

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

  // Dynamic cost calculation
  const calculateCosts = () => {
    // Cost formula: 1 coin per 10 seconds per view
    const costPerView = Math.ceil(selectedDuration / 10);
    const totalCost = costPerView * selectedViews;
    const rewardPerView = Math.ceil(costPerView * 0.8); // 80% of cost goes to viewers
    
    // VIP discount (10% off)
    const vipDiscount = profile?.is_vip ? Math.ceil(totalCost * 0.1) : 0;
    const finalCost = totalCost - vipDiscount;
    
    return { totalCost, finalCost, rewardPerView, costPerView, vipDiscount };
  };

  const { totalCost, finalCost, rewardPerView, vipDiscount } = calculateCosts();

  // Auto-fetch video data when URL changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))) {
        fetchVideoData();
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  const fetchVideoData = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setAutoFetching(true);
    setFetchingVideo(true);
    setError(null);
    setVideoData(null);
    setShowIframe(false);
    setEmbedabilityTested(false);
    setRetryCount(0);
    setLoadingTimeout(false);
    setVideoStatus('Checking video compatibility...');

    try {
      console.log('Extracting video ID from URL:', youtubeUrl);
      const videoId = extractVideoId(youtubeUrl);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      console.log('Video ID extracted:', videoId);

      const processedVideoData: VideoData = {
        id: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embeddable: false, // Will be tested
        originalUrl: youtubeUrl,
      };

      setVideoData(processedVideoData);
      setError(null);
      setShowIframe(true); // Auto-show iframe for testing
      setVideoStatus('Testing video embeddability...');
      
      showToast('Video found. Testing compatibility...');
    } catch (error: any) {
      console.error('Error extracting video data:', error);
      setError('Invalid YouTube URL. Please check the format.');
      setVideoData(null);
      setVideoStatus('');
    } finally {
      setFetchingVideo(false);
      setAutoFetching(false);
    }
  };

  const createIframeHTML = (embedUrl: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          #player {
            width: 100%;
            height: 100%;
            border: none;
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
          }
          .error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff4757;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">Testing compatibility...</div>
        <div id="error" class="error" style="display: none;"></div>
        <div id="player"></div>
        
        <script>
          console.log('Initializing YouTube iframe validation for video ID: ${videoData?.id}');
          
          var player;
          var isPlayerReady = false;
          var loadingTimeoutId;
          var retryAttempt = ${retryCount};
          var maxRetries = ${maxRetries};
          var hasTimedOut = false;
          var isLiveVideo = false;
          var hasError = false;
          var initializationInProgress = false;
          
          // Set loading timeout
          loadingTimeoutId = setTimeout(function() {
            if (!isPlayerReady && !hasTimedOut) {
              hasTimedOut = true;
              console.log('Loading timeout reached');
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Video may not be compatible for embedding.';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOADING_TIMEOUT',
                message: 'Loading timeout after ${loadingTimeoutDuration}ms'
              }));
            }
          }, ${loadingTimeoutDuration});

          // Load YouTube IFrame API
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          tag.onerror = function() {
            console.error('Failed to load YouTube IFrame API');
            clearTimeout(loadingTimeoutId);
            hasError = true;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Failed to load video player';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'API_LOAD_ERROR',
              message: 'Failed to load YouTube IFrame API'
            }));
          };
          
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          function onYouTubeIframeAPIReady() {
            if (initializationInProgress || hasError || hasTimedOut) {
              return;
            }
            
            initializationInProgress = true;
            console.log('YouTube IFrame API ready');
            
            try {
              player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '${videoData?.id}',
                playerVars: {
                  'autoplay': 0,
                  'controls': 0,
                  'modestbranding': 1,
                  'showinfo': 0,
                  'rel': 0,
                  'fs': 0,
                  'disablekb': 1,
                  'iv_load_policy': 3,
                  'enablejsapi': 1,
                  'origin': window.location.origin
                },
                events: {
                  'onReady': onPlayerReady,
                  'onStateChange': onPlayerStateChange,
                  'onError': onPlayerError
                }
              });
            } catch (error) {
              console.error('Error creating YouTube player:', error);
              hasError = true;
              clearTimeout(loadingTimeoutId);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Failed to initialize player';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYER_INIT_ERROR',
                message: 'Failed to initialize YouTube player'
              }));
            }
          }

          function onPlayerReady(event) {
            if (hasError || hasTimedOut) {
              return;
            }
            
            console.log('Player ready');
            clearTimeout(loadingTimeoutId);
            isPlayerReady = true;
            document.getElementById('loading').style.display = 'none';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY',
              videoId: '${videoData?.id}'
            }));
            
            // Auto-start playback test with delay
            setTimeout(function() {
              if (player && player.playVideo && isPlayerReady && !hasError) {
                try {
                  console.log('Starting auto-playback test');
                  player.playVideo();
                } catch (error) {
                  console.error('Error starting playback:', error);
                }
              }
            }, 1500);
            
            // Auto-detect title
            setTimeout(function() {
              detectTitle();
            }, 2000);
          }

          function onPlayerStateChange(event) {
            if (hasError || hasTimedOut) {
              return;
            }
            
            var state = event.data;
            var stateNames = {
              '-1': 'UNSTARTED',
              '0': 'ENDED',
              '1': 'PLAYING',
              '2': 'PAUSED',
              '3': 'BUFFERING',
              '5': 'CUED'
            };
            
            console.log('Player state changed to:', stateNames[state] || state);
            
            if (state === 1) { // PLAYING
              console.log('Video is playing - embeddable confirmed');
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYBACK_SUCCESS',
                embeddable: true,
                state: state,
                stateName: stateNames[state]
              }));
            } else if (state === 2) { // PAUSED
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STATE_CHANGE',
                state: state,
                stateName: stateNames[state]
              }));
            }
          }

          function onPlayerError(event) {
            console.error('Player error:', event.data);
            clearTimeout(loadingTimeoutId);
            hasError = true;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            
            var errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not allowed to be played in embedded players',
              150: 'Video not allowed to be played in embedded players'
            };
            
            var errorMessage = errorMessages[event.data] || 'Video playback error';
            document.getElementById('error').textContent = errorMessage;
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYBACK_FAILED',
              embeddable: false,
              error: event.data,
              message: errorMessage,
              isEmbeddingError: event.data === 101 || event.data === 150
            }));
          }
          
          function detectTitle() {
            try {
              var detectedTitle = '';
              
              // Try to get video data from player
              if (player && player.getVideoData) {
                try {
                  var videoData = player.getVideoData();
                  if (videoData && videoData.title) {
                    detectedTitle = videoData.title;
                  }
                } catch (e) {
                  console.log('Could not get video data:', e);
                }
              }
              
              // Fallback title
              if (!detectedTitle) {
                detectedTitle = 'Video ${videoData?.id || 'Unknown'}';
              }
              
              console.log('Title detected:', detectedTitle);
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TITLE_DETECTED',
                title: detectedTitle,
                success: true
              }));
              
            } catch (error) {
              console.error('Title detection failed:', error);
              var fallbackTitle = 'Video ${videoData?.id || 'Unknown'}';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TITLE_DETECTED',
                title: fallbackTitle,
                success: false,
                message: 'Used fallback title'
              }));
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          setIframeLoaded(true);
          setLoadingTimeout(false);
          setVideoStatus('Testing video playback...');
          break;
          
        case 'LOADING_TIMEOUT':
          setLoadingTimeout(true);
          setIframeLoaded(false);
          setVideoStatus('Video may not be compatible for embedding');
          break;
          
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
          setError('Failed to load video player. Please check your internet connection.');
          setVideoStatus('');
          break;
          
        case 'PLAYBACK_SUCCESS':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: true } : null);
          setVideoStatus('✅ Video is embeddable and ready for promotion!');
          break;
          
        case 'PLAYBACK_FAILED':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
          
          if (data.isEmbeddingError) {
            setVideoStatus('❌ Video cannot be embedded. Please make it embeddable first.');
          } else {
            setVideoStatus('❌ Video playback failed. Please try a different video.');
          }
          break;
          
        case 'TITLE_DETECTED':
          if (data.title) {
            setVideoData(prev => prev ? { ...prev, autoDetectedTitle: data.title } : null);
            if (!title) {
              setTitle(data.title);
            }
          }
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const openDropdown = (type: 'views' | 'duration') => {
    if (activeDropdown === type) {
      closeDropdown();
      return;
    }
    
    setActiveDropdown(type);
    dropdownOpacity.value = withTiming(1, { duration: 300 });
    dropdownTranslateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
  };

  const closeDropdown = () => {
    dropdownOpacity.value = withTiming(0, { duration: 300 });
    dropdownTranslateY.value = withTiming(300, { duration: 300 });
    setTimeout(() => setActiveDropdown(null), 300);
  };

  const selectOption = (type: 'views' | 'duration', value: number) => {
    if (type === 'views') {
      setSelectedViews(value);
    } else {
      setSelectedDuration(value);
    }
    closeDropdown();
  };

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ translateY: dropdownTranslateY.value }],
  }));

  const handlePromoteVideo = async () => {
    // Input validation
    if (!youtubeUrl || !title) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!profile || profile.coins < finalCost) {
      setError(`You need ₡${finalCost} coins to promote this video. You have ₡${profile?.coins || 0} coins.`);
      return;
    }

    // Check if video embedability was tested
    if (!videoData || !embedabilityTested) {
      setError('Please wait for video compatibility check to complete');
      return;
    }

    if (!videoData.embeddable) {
      setError('This video cannot be embedded. Please make it embeddable first or choose a different video.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Promoting video with data:', {
        userId: user.id,
        finalCost,
        title,
        duration: selectedDuration,
        targetViews: selectedViews,
        videoId: videoData.id,
        embeddable: videoData.embeddable
      });

      // Use the database function to deduct coins safely
      const { data: coinUpdateResult, error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -finalCost,
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

      // Create video promotion with video ID and embed URL
      const videoInsertData = {
        user_id: user.id,
        youtube_url: videoData.id, // Store only the video ID
        title,
        description: `Embed URL: ${videoData.embedUrl} | Original URL: ${videoData.originalUrl} | Auto-detected title: ${videoData.autoDetectedTitle || 'N/A'} | User-set duration: ${selectedDuration}s | Video ID: ${videoData.id}`,
        duration_seconds: selectedDuration,
        coin_cost: finalCost,
        coin_reward: rewardPerView,
        target_views: selectedViews,
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

      // Show success toast
      showToast(`Video promoted successfully! ₡${finalCost} coins deducted.`);
      
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
    setSelectedViews(35);
    setSelectedDuration(45);
    setVideoData(null);
    setError(null);
    setShowIframe(false);
    setIframeLoaded(false);
    setEmbedabilityTested(false);
    setIsPlaying(false);
    setTestingPlayback(false);
    setRetryCount(0);
    setLoadingTimeout(false);
    setVideoStatus('');
    setAutoFetching(false);
  };

  const handleVIPUpgrade = () => {
    Alert.alert(
      'Upgrade to VIP',
      'Get 10% off all promotions and enjoy ad-free experience!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => showToast('VIP upgrade coming soon!') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with coin display */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Promote Your Video</Text>
        <View style={styles.coinDisplay}>
          <Coins color="white" size={20} />
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
                  placeholder="https://youtu.be/fCtFxT3n_l0"
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {(fetchingVideo || autoFetching) && (
                  <ActivityIndicator size="small" color="#FF4757" style={styles.loadingIcon} />
                )}
              </View>
            </View>

            {/* Video Status */}
            {videoStatus && (
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.statusText,
                  videoStatus.includes('✅') ? styles.successText : 
                  videoStatus.includes('❌') ? styles.errorText : styles.infoText
                ]}>
                  {videoStatus}
                </Text>
              </View>
            )}

            {/* Iframe Preview (Hidden from user) */}
            {videoData && showIframe && (
              <View style={styles.hiddenIframe}>
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

            {/* Number of Views Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Views *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('views')}
              >
                <Eye color="#666" size={20} style={styles.inputIcon} />
                <Text style={styles.dropdownText}>{selectedViews} views</Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            {/* Duration Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Watch Duration *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('duration')}
              >
                <Clock color="#666" size={20} style={styles.inputIcon} />
                <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            {/* Cost Calculation */}
            <View style={styles.costCard}>
              <Text style={styles.costTitle}>Promotion Cost</Text>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Cost per view:</Text>
                <View style={styles.costValueContainer}>
                  <Coins color="#FF4757" size={16} />
                  <Text style={styles.costValue}>{Math.ceil(selectedDuration / 10)}</Text>
                </View>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Total Cost:</Text>
                <View style={styles.costValueContainer}>
                  <Coins color="#FF4757" size={16} />
                  <Text style={styles.costValue}>{totalCost}</Text>
                </View>
              </View>
              {profile?.is_vip && (
                <View style={styles.costRow}>
                  <Text style={styles.vipDiscountLabel}>VIP Discount (10%):</Text>
                  <View style={styles.costValueContainer}>
                    <Coins color="#2ECC71" size={16} />
                    <Text style={styles.discountValue}>-{vipDiscount}</Text>
                  </View>
                </View>
              )}
              <View style={[styles.costRow, styles.finalCostRow]}>
                <Text style={styles.finalCostLabel}>Final Cost:</Text>
                <View style={styles.costValueContainer}>
                  <Coins color="#FF4757" size={18} />
                  <Text style={styles.finalCostValue}>{finalCost}</Text>
                </View>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Your Balance:</Text>
                <View style={styles.costValueContainer}>
                  <Coins color={(profile?.coins || 0) < finalCost ? "#E74C3C" : "#2ECC71"} size={16} />
                  <Text style={[
                    styles.costValue, 
                    (profile?.coins || 0) < finalCost && styles.insufficientBalance
                  ]}>
                    {profile?.coins || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* VIP Upgrade Section */}
            {!profile?.is_vip && (
              <TouchableOpacity style={styles.vipCard} onPress={handleVIPUpgrade}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.vipGradient}
                >
                  <Crown color="white" size={24} />
                  <View style={styles.vipContent}>
                    <Text style={styles.vipTitle}>VIP members pay 10% less</Text>
                    <Text style={styles.vipSubtitle}>Become VIP?</Text>
                  </View>
                  <Sparkles color="white" size={20} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Promote Button */}
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (loading || !youtubeUrl || !title || (profile?.coins || 0) < finalCost || !videoData?.embeddable) && styles.buttonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={loading || !youtubeUrl || !title || (profile?.coins || 0) < finalCost || !videoData?.embeddable}
            >
              <TrendingUp color="white" size={20} style={styles.buttonIcon} />
              <Text style={styles.promoteButtonText}>
                {loading ? 'Promoting...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Modal */}
      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <Animated.View style={[styles.dropdownModal, dropdownAnimatedStyle]}>
            <LinearGradient
              colors={['#FF4757', '#FF6B8A']}
              style={styles.dropdownHeader}
            >
              <Text style={styles.dropdownHeaderText}>
                {activeDropdown === 'views' ? 'Select Number of Views' : 'Select Watch Duration'}
              </Text>
              <TouchableOpacity onPress={closeDropdown}>
                <ChevronUp color="white" size={24} />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {(activeDropdown === 'views' ? VIEW_OPTIONS : DURATION_OPTIONS).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    (activeDropdown === 'views' ? selectedViews : selectedDuration) === option.value && styles.selectedOption
                  ]}
                  onPress={() => selectOption(activeDropdown!, option.value)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    (activeDropdown === 'views' ? selectedViews : selectedDuration) === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {(activeDropdown === 'views' ? selectedViews : selectedDuration) === option.value && (
                    <CheckCircle color="#FF4757" size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
  loadingIcon: {
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#2ECC71',
  },
  errorText: {
    color: '#E74C3C',
  },
  infoText: {
    color: '#4ECDC4',
  },
  hiddenIframe: {
    height: 1,
    width: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
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
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
  vipDiscountLabel: {
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '500',
  },
  finalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  finalCostLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  costValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
    marginLeft: 4,
  },
  finalCostValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4757',
    marginLeft: 4,
  },
  insufficientBalance: {
    color: '#FF4757',
  },
  vipCard: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  vipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  vipContent: {
    flex: 1,
    marginLeft: 12,
  },
  vipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  vipSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  dropdownList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#FFF5F5',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#FF4757',
    fontWeight: '600',
  },
});