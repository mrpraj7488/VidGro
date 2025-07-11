import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ToastAndroid,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Search, Eye, Clock, TrendingUp, ChevronDown, Check, ChevronUp, Play, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Type, Crown, DollarSign } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import Animated as ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

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
  value: number;
  label: string;
}

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 10, label: '10 views' },
  { value: 25, label: '25 views' },
  { value: 35, label: '35 views' },
  { value: 50, label: '50 views' },
  { value: 100, label: '100 views' },
  { value: 200, label: '200 views' },
  { value: 300, label: '300 views' },
  { value: 500, label: '500 views' },
];

const DURATION_OPTIONS: DropdownOption[] = [
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
  { value: 90, label: '90 seconds' },
  { value: 120, label: '120 seconds' },
  { value: 150, label: '150 seconds' },
  { value: 180, label: '180 seconds' },
  { value: 240, label: '240 seconds' },
  { value: 300, label: '300 seconds' },
  { value: 360, label: '360 seconds' },
  { value: 420, label: '420 seconds' },
  { value: 480, label: '480 seconds' },
  { value: 540, label: '540 seconds' },
];

interface FuturisticDropdownProps {
  visible: boolean;
  onClose: () => void;
  options: DropdownOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
  title: string;
}

const FuturisticDropdown: React.FC<FuturisticDropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title,
}) => {
  const slideY = useSharedValue(screenWidth);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      slideY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      slideY.value = withTiming(screenWidth, { duration: 250 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ReanimatedAnimated.View style={[styles.dropdownOverlay, overlayStyle]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
        <ReanimatedAnimated.View style={[styles.dropdownModal, modalStyle]}>
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            style={styles.dropdownHeader}
          >
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedValue === option.value && styles.selectedOption,
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  selectedValue === option.value && styles.selectedOptionText,
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Check color="#800080" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ReanimatedAnimated.View>
      </ReanimatedAnimated.View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isPromoting, setIsPromoting] = useState(false);
  
  // Dropdown state
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  // Video validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    title?: string;
    thumbnail?: string;
    error?: string;
  } | null>(null);
  const [showCompatibilityTest, setShowCompatibilityTest] = useState(false);

  // Enhanced video processing state
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

  const webviewRef = useRef<WebView>(null);
  const maxRetries = 2;
  const loadingTimeoutDuration = 5000; // 5 seconds

  // Animation values
  const buttonScale = useSharedValue(1);
  const validationScale = useSharedValue(0);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Handle direct video ID
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

  // Enhanced cost calculation: Dynamic formula (views × duration) / 100 × 2.5
  const calculateCosts = () => {
    const durationSeconds = selectedDuration || 0;
    const views = selectedViews || 0;
    
    // Dynamic cost calculation: (views × duration) / 100 × 2.5
    const baseCost = Math.ceil((views * durationSeconds) / 100 * 2.5);
    
    // VIP discount: 10% off for VIP members
    const vipDiscount = profile?.is_vip ? Math.ceil(baseCost * 0.1) : 0;
    const totalCost = baseCost - vipDiscount;
    
    return { 
      baseCost, 
      totalCost, 
      vipDiscount,
      costPerView: Math.ceil(baseCost / views) || 0
    };
  };

  const { baseCost, totalCost, vipDiscount, costPerView } = calculateCosts();

  // Auto-fetch video data when URL changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && extractVideoId(youtubeUrl)) {
        fetchVideoData();
      } else {
        setVideoData(null);
        setEmbedabilityTested(false);
        setError(null);
        setVideoTitle(''); // Clear auto-filled title when URL is cleared
        setValidationResult(null);
        setShowCompatibilityTest(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  const fetchVideoData = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setFetchingVideo(true);
    setIsValidating(true);
    setError(null);
    setVideoData(null);
    setShowIframe(false);
    setEmbedabilityTested(false);
    setRetryCount(0);
    setLoadingTimeout(false);
    setValidationResult(null);

    try {
      console.log('Extracting video ID from URL:', youtubeUrl);
      const videoId = extractVideoId(youtubeUrl);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      console.log('Video ID extracted:', videoId);

      // Auto-fetch title using YouTube oEmbed API (no API key required)
      try {
        const oEmbedResponse = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        
        if (oEmbedResponse.ok) {
          const oEmbedData = await oEmbedResponse.json();
          if (oEmbedData.title && !videoTitle) {
            setVideoTitle(oEmbedData.title);
            showToast(`Title auto-filled: ${oEmbedData.title}`);
          }
          
          // Set validation result
          setValidationResult({
            isValid: true,
            title: oEmbedData.title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          });
        }
      } catch (oEmbedError) {
        console.log('Could not fetch title via oEmbed, user can enter manually');
        // Simulate validation result
        setValidationResult({
          isValid: true,
          title: `Video ${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        });
      }

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
      setShowCompatibilityTest(true);
      
      validationScale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      
      showToast('Video processing... Testing compatibility...');
    } catch (error: any) {
      console.error('Error extracting video data:', error);
      setError(error.message || 'Failed to extract video ID. Please check the URL format.');
      setVideoData(null);
      setValidationResult({
        isValid: false,
        error: error.message || 'Invalid YouTube URL format'
      });
    } finally {
      setFetchingVideo(false);
      setIsValidating(false);
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
        <div id="loading" class="loading">Testing video compatibility...</div>
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
              document.getElementById('error').textContent = 'Video loading timeout. May not be embeddable.';
              
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
            document.getElementById('error').textContent = 'Failed to load YouTube API';
            
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
            
            // Auto-start playback test with delay to prevent stack overflow
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
            
            // Check for live video (buffering state that doesn't progress)
            if (state === 3) { // BUFFERING
              setTimeout(function() {
                if (player && player.getPlayerState && player.getPlayerState() === 3) {
                  // Still buffering after 3 seconds, might be live
                  try {
                    var videoData = player.getVideoData();
                    if (videoData && videoData.isLive) {
                      isLiveVideo = true;
                      console.log('Live video detected');
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'LIVE_VIDEO_DETECTED',
                        message: 'Live videos are not supported'
                      }));
                      return;
                    }
                  } catch (error) {
                    console.log('Could not check live status:', error);
                  }
                }
              }, 3000);
            }
            
            if (state === 1) { // PLAYING
              console.log('Video is playing - embedable confirmed');
              
              // Extract title
              setTimeout(function() {
                detectTitle();
              }, 2000);
              
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
            
            // Check if we should retry
            if ((event.data === 5 || !event.data) && retryAttempt < maxRetries) {
              console.log('Retrying due to error:', errorMessage);
              setTimeout(function() {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'RETRY_NEEDED',
                  error: event.data,
                  message: errorMessage,
                  retryAttempt: retryAttempt + 1
                }));
              }, 2000);
            } else {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PLAYBACK_FAILED',
                embeddable: false,
                error: event.data,
                message: errorMessage,
                isEmbeddingError: event.data === 101 || event.data === 150
              }));
            }
          }
          
          function detectTitle() {
            try {
              var detectedTitle = '';
              
              // Method 1: Check document title
              if (document.title && document.title !== 'YouTube') {
                detectedTitle = document.title.replace(' - YouTube', '');
              }
              
              // Method 2: Try to get video data from player
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
              
              // Method 3: Fallback title
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
          
          // Handle page errors
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Page error:', msg);
            hasError = true;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAGE_ERROR',
              message: 'Page error: ' + msg
            }));
            return true; // Prevent default error handling
          };
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
          showToast('Video player loaded successfully');
          break;
          
        case 'LOADING_TIMEOUT':
          setLoadingTimeout(true);
          setIframeLoaded(false);
          setError('Video loading timeout. It may not be embeddable.');
          setValidationResult({
            isValid: false,
            error: 'Video loading timeout. May not be embeddable.'
          });
          break;
          
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
          setError('Failed to load YouTube API. Please check your internet connection.');
          setValidationResult({
            isValid: false,
            error: 'Failed to load YouTube API'
          });
          break;
          
        case 'LIVE_VIDEO_DETECTED':
          setError('Live videos cannot be promoted. Please choose a regular video.');
          setVideoData(prev => prev ? { ...prev, embeddable: false, isLive: true } : null);
          setValidationResult({
            isValid: false,
            error: 'Live videos are not supported'
          });
          break;
          
        case 'PLAYBACK_SUCCESS':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: true } : null);
          setError(null);
          setValidationResult({
            isValid: true,
            title: videoData?.autoDetectedTitle || videoTitle,
            thumbnail: videoData?.thumbnail
          });
          showToast('✅ Video is embeddable and ready for promotion!');
          break;
          
        case 'PLAYBACK_FAILED':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
          
          if (data.isEmbeddingError) {
            setError('This video cannot be embedded. Please make it embeddable first or choose a different video.');
            setValidationResult({
              isValid: false,
              error: 'Video cannot be embedded'
            });
          } else {
            setError(data.message || 'Video playback failed. Please try a different video.');
            setValidationResult({
              isValid: false,
              error: data.message || 'Video playback failed'
            });
          }
          break;
          
        case 'RETRY_NEEDED':
          if (retryCount < maxRetries) {
            console.log(`Retrying video load (attempt ${data.retryAttempt})`);
            showToast(`Retrying... (${data.retryAttempt}/${maxRetries})`);
            setRetryCount(data.retryAttempt);
            
            // Retry after 2 seconds
            setTimeout(() => {
              setShowIframe(false);
              setTimeout(() => {
                setShowIframe(true);
              }, 100);
            }, 2000);
          } else {
            showToast('Video unavailable after retries');
            setError('Video failed to load after multiple attempts.');
            setValidationResult({
              isValid: false,
              error: 'Video failed to load after multiple attempts'
            });
          }
          break;
          
        case 'TITLE_DETECTED':
          if (data.title) {
            setVideoData(prev => prev ? { ...prev, autoDetectedTitle: data.title } : null);
            if (!videoTitle) {
              setVideoTitle(data.title);
            }
            showToast(`Title detected: ${data.title}`);
          }
          break;
          
        case 'STATE_CHANGE':
          if (data.state === 1) { // PLAYING
            setIsPlaying(true);
          } else if (data.state === 2) { // PAUSED
            setIsPlaying(false);
          }
          break;
          
        case 'PAGE_ERROR':
          console.log('Page error in iframe:', data.message);
          setError('Page error occurred in video player.');
          setValidationResult({
            isValid: false,
            error: 'Page error occurred in video player'
          });
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
    if (!selectedDuration || selectedDuration < 10) {
      return 'Duration must be at least 10 seconds';
    }
    
    if (selectedDuration > 600) {
      return 'Duration must be less than 600 seconds (10 minutes)';
    }
    
    return null;
  };

  const handlePromoteVideo = async () => {
    // Input validation
    if (!youtubeUrl || !videoTitle || !selectedDuration || !selectedViews) {
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

    if (isNaN(selectedViews) || selectedViews < 1 || selectedViews > 1000) {
      setError('Target views must be between 1 and 1000');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!profile || profile.coins < totalCost) {
      setError(`You need 🪙${totalCost} coins to promote this video. You have 🪙${profile?.coins || 0} coins.`);
      return;
    }

    // Check if video embedability was tested
    if (!videoData || !embedabilityTested) {
      setError('Please test the video compatibility using the preview before promoting.');
      return;
    }

    if (!videoData.embeddable) {
      setError('This video cannot be embedded. Please make it embeddable first or choose a different video.');
      return;
    }

    if (videoData.isLive) {
      setError('Live videos cannot be promoted. Please choose a regular video.');
      return;
    }

    setIsPromoting(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      console.log('Promoting video with data:', {
        userId: user.id,
        totalCost,
        title: videoTitle,
        duration: selectedDuration,
        targetViews: selectedViews,
        videoId: videoData.id,
        embeddable: videoData.embeddable
      });

      // Use the database function to deduct coins safely
      const { data: coinUpdateResult, error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -totalCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted: ${videoTitle}`,
        });

      if (coinError) {
        console.error('Error deducting coins:', coinError);
        throw new Error(`Failed to deduct coins: ${coinError.message}`);
      }

      if (!coinUpdateResult) {
        throw new Error('Insufficient coins or failed to deduct coins');
      }

      console.log('Coins deducted successfully');

      // Create video promotion with 10-minute hold using the enhanced function
      const { data: videoResult, error: insertError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoData.id, // Store only the video ID
          title_param: videoTitle,
          description_param: `Embed URL: ${videoData.embedUrl} | Original URL: ${videoData.originalUrl} | Auto-detected title: ${videoData.autoDetectedTitle || 'N/A'} | User-set duration: ${selectedDuration}s | Video ID: ${videoData.id}`,
          duration_seconds_param: selectedDuration,
          coin_cost_param: totalCost,
          coin_reward_param: 3, // Fixed reward per view
          target_views_param: selectedViews
        });

      if (insertError) {
        console.error('Error creating video promotion:', insertError);
        throw new Error(`Failed to create video promotion: ${insertError.message}`);
      }

      console.log('Video promotion created successfully with hold period:', videoResult);
      console.log(`Video ${videoData.id} status changed to Pending`);

      // Refresh profile to get updated coin balance
      await refreshProfile();

      // Show enhanced success alert with hold period information
      Alert.alert(
        'Video Promoted Successfully!',
        `Your video has been promoted and is now on hold for 10 minutes.\n\n` +
        `Status Flow:\n` +
        `• PENDING (0-10 minutes): Video is on hold\n` +
        `• ACTIVE (After 10 minutes): Video enters view queue\n` +
        `• COMPLETED (Target reached): Video promotion finished\n\n` +
        `Cost: 🪙${totalCost} coins deducted`,
        [{ text: 'OK', onPress: () => {} }]
      );
      
      // Reset form
      resetForm();

    } catch (error: any) {
      console.error('Error promoting video:', error);
      setError(error.message || 'Failed to promote video. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  const resetForm = () => {
    setYoutubeUrl('');
    setVideoTitle('');
    setSelectedViews(50);
    setSelectedDuration(30);
    setVideoData(null);
    setError(null);
    setShowIframe(false);
    setIframeLoaded(false);
    setEmbedabilityTested(false);
    setIsPlaying(false);
    setTestingPlayback(false);
    setRetryCount(0);
    setLoadingTimeout(false);
    setValidationResult(null);
    setShowCompatibilityTest(false);
    validationScale.value = 0;
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

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const validationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: validationScale.value }],
    opacity: validationScale.value,
  }));

  const coinCost = totalCost;
  const canAfford = profile ? profile.coins >= coinCost : false;

  return (
    <View style={styles.container}>
      <GlobalHeader title="Promote" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />

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

          {/* YouTube URL Input */}
          <View style={styles.section}>
            <Text style={styles.label}>YouTube URL *</Text>
            <View style={styles.inputContainer}>
              <Link color="#800080" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="https://youtu.be/fCtFxT3n_l0"
                placeholderTextColor="#999"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={styles.validateButton}
                onPress={fetchVideoData}
                disabled={isValidating || !youtubeUrl}
              >
                {isValidating ? (
                  <ActivityIndicator size="small" color="#800080" />
                ) : (
                  <Search color="#800080" size={20} />
                )}
              </TouchableOpacity>
            </View>
            {fetchingVideo && (
              <Text style={styles.helperText}>Checking video compatibility...</Text>
            )}
          </View>

          {/* Compatibility Test Results */}
          {showCompatibilityTest && validationResult && (
            <ReanimatedAnimated.View style={[styles.compatibilitySection, validationAnimatedStyle]}>
              <TouchableOpacity
                style={styles.compatibilityHeader}
                onPress={() => setShowIframe(!showIframe)}
              >
                <Text style={styles.compatibilityTitle}>
                  Compatibility Test {validationResult.isValid ? '✅' : '❌'}
                </Text>
                {showIframe ? <ChevronUp color="#800080" size={20} /> : <ChevronDown color="#800080" size={20} />}
              </TouchableOpacity>
              
              {showIframe && (
                <View style={styles.compatibilityContent}>
                  {validationResult.isValid && validationResult.thumbnail && (
                    <Image
                      source={{ uri: validationResult.thumbnail }}
                      style={styles.videoThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  
                  {/* WebView for advanced testing */}
                  {videoData && showIframe && (
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
                  )}
                  
                  {validationResult.isValid ? (
                    <View style={styles.successMessage}>
                      <CheckCircle color="#4CAF50" size={20} />
                      <Text style={styles.successText}>
                        ✅ Video is embeddable and ready for promotion!
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.errorMessage}>
                      <AlertCircle color="#E74C3C" size={20} />
                      <Text style={styles.errorText}>
                        {validationResult.error || 'Video validation failed'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ReanimatedAnimated.View>
          )}

          {/* Video Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Video Title *</Text>
            <View style={styles.inputContainer}>
              <Type color="#800080" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter video title"
                placeholderTextColor="#999"
                value={videoTitle}
                onChangeText={setVideoTitle}
                multiline
                maxLength={100}
              />
            </View>
            {videoData?.autoDetectedTitle && videoTitle !== videoData.autoDetectedTitle && (
              <TouchableOpacity
                style={styles.titleSuggestion}
                onPress={() => setVideoTitle(videoData.autoDetectedTitle!)}
              >
                <Text style={styles.suggestionLabel}>Use auto-detected:</Text>
                <Text style={styles.suggestionText}>{videoData.autoDetectedTitle}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Number of Views Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>Number of Views *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowViewsDropdown(true)}
            >
              <Eye color="#800080" size={20} />
              <Text style={styles.dropdownText}>
                {VIEW_OPTIONS.find(opt => opt.value === selectedViews)?.label || 'Select views'}
              </Text>
              <ChevronDown color="#800080" size={20} />
            </TouchableOpacity>
          </View>

          {/* Duration Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>Set Duration (seconds) *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDurationDropdown(true)}
            >
              <Clock color="#800080" size={20} />
              <Text style={styles.dropdownText}>
                {DURATION_OPTIONS.find(opt => opt.value === selectedDuration)?.label || 'Select duration'}
              </Text>
              <ChevronDown color="#800080" size={20} />
            </TouchableOpacity>
          </View>

          {/* Enhanced Cost Summary */}
          <View style={styles.costSection}>
            <View style={styles.costHeader}>
              <Text style={styles.costTitle}>Promotion Cost</Text>
              <Text style={[styles.costAmount, !canAfford && styles.costAmountError]}>
                🪙{coinCost}
              </Text>
            </View>
            <View style={styles.costBreakdown}>
              <Text style={styles.costDetail}>• Base cost: 🪙{baseCost}</Text>
              {profile?.is_vip && (
                <Text style={styles.costDetail}>• VIP discount (10%): -🪙{vipDiscount}</Text>
              )}
              <Text style={styles.costDetail}>• Each viewer earns 3 coins for watching</Text>
              <Text style={styles.costDetail}>• Your balance: 🪙{profile?.coins || 0}</Text>
              {videoData && videoData.embeddable && (
                <Text style={[styles.costDetail, { color: '#2ECC71' }]}>• Compatibility: ✓ Verified</Text>
              )}
            </View>
            {!canAfford && (
              <View style={styles.insufficientFunds}>
                <AlertCircle color="#E74C3C" size={16} />
                <Text style={styles.insufficientText}>
                  Insufficient coins. You have 🪙{profile?.coins || 0}
                </Text>
              </View>
            )}
          </View>

          {/* VIP Discount and Upgrade Feature */}
          {!profile?.is_vip && selectedDuration && selectedViews && (
            <TouchableOpacity style={styles.vipPrompt} onPress={handleUpgradeToVip}>
              <Crown color="#FFA726" size={20} />
              <Text style={styles.vipPromptText}>
                VIP members save 🪙{vipDiscount || Math.ceil(baseCost * 0.1)} on this promotion - Become VIP?
              </Text>
            </TouchableOpacity>
          )}

          {/* Promote Button */}
          <ReanimatedAnimated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.promoteButton,
                (!canAfford || !validationResult?.isValid || isPromoting || !videoData?.embeddable) && styles.promoteButtonDisabled
              ]}
              onPress={handlePromoteVideo}
              disabled={!canAfford || !validationResult?.isValid || isPromoting || !videoData?.embeddable}
            >
              <TrendingUp color="white" size={20} />
              <Text style={styles.promoteButtonText}>
                {isPromoting ? 'Promoting Video...' : 'Promote Video'}
              </Text>
            </TouchableOpacity>
          </ReanimatedAnimated.View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <Text style={styles.infoText}>• Your video enters a 10-minute hold period</Text>
            <Text style={styles.infoText}>• After hold, it becomes active in the viewing queue</Text>
            <Text style={styles.infoText}>• Users earn 3 coins for watching your video</Text>
            <Text style={styles.infoText}>• Track progress in the Analytics tab</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdowns with proper z-index */}
      <FuturisticDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        title="Select Number of Views"
      />

      <FuturisticDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        title="Select Duration (seconds)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  label: {
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
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    paddingVertical: 12,
  },
  validateButton: {
    padding: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  compatibilitySection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
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
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  compatibilityTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
  },
  compatibilityContent: {
    padding: 16,
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  webviewContainer: {
    height: isSmallScreen ? 180 : 220,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  webview: {
    flex: 1,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  titleSuggestion: {
    backgroundColor: '#F3E8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#800080',
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#333',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dropdownText: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    marginLeft: 12,
  },
  costSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
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
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  costTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  costAmount: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#800080',
  },
  costAmountError: {
    color: '#E74C3C',
  },
  costBreakdown: {
    marginBottom: 12,
  },
  costDetail: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
    marginBottom: 4,
  },
  insufficientFunds: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
  },
  insufficientText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#E74C3C',
    marginLeft: 6,
  },
  vipPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    backgroundColor: '#F0F8FF',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#1976D2',
    marginBottom: 4,
  },
  // Dropdown Modal Styles with proper z-index
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000, // Higher than GlobalHeader modal
    elevation: 1000, // Higher than GlobalHeader modal
  },
  overlayPressable: {
    flex: 1,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 1000, // Higher than GlobalHeader modal
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#F3E8FF',
  },
  optionText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#800080',
    fontWeight: '600',
  },
});