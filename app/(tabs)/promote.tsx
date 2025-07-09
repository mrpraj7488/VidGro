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
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Type, Clock, TrendingUp, Eye, Search, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, ChevronUp, Play, Pause, Crown, DollarSign } from 'lucide-react-native';

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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.dropdownOverlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.dropdownBackdrop} onPress={onClose} />
        <Animated.View 
          style={[
            styles.dropdownContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#FF4757', '#FF6B8A', '#FFA726']}
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
                  index === options.length - 1 && styles.dropdownOptionLast
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  selectedValue === option.value && styles.dropdownOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <CheckCircle color="#FF4757" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
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
  
  // Dropdown states
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  const webviewRef = useRef<WebView>(null);
  const maxRetries = 2;
  const loadingTimeoutDuration = 5000; // 5 seconds

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

  // Enhanced cost calculation: Dynamic formula (views × duration) / 100 × 2.5
  const calculateCosts = () => {
    const durationSeconds = userSetDuration || 0;
    const views = targetViews || 0;
    
    // Dynamic cost calculation: (views × duration) / 100 × 2.5
    const baseCost = Math.ceil((views * durationSeconds) / 100 * 2.5);
    
    // VIP discount: 10% off for VIP members
    const vipDiscount = profile?.is_vip ? Math.ceil(baseCost * 0.1) : 0;
    const totalCost = baseCost - vipDiscount;
    
    // Reward per view: 80% of base cost per view
    const rewardPerView = Math.ceil((baseCost / views) * 0.8) || 0;
    
    return { 
      baseCost, 
      totalCost, 
      rewardPerView, 
      vipDiscount,
      costPerView: Math.ceil(baseCost / views) || 0
    };
  };

  const { baseCost, totalCost, rewardPerView, vipDiscount, costPerView } = calculateCosts();

  // Auto-fetch video data when URL changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && extractVideoId(youtubeUrl)) {
        fetchVideoData();
      } else {
        setVideoData(null);
        setEmbedabilityTested(false);
        setError(null);
        setTitle(''); // Clear auto-filled title when URL is cleared
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
    setError(null);
    setVideoData(null);
    setShowIframe(false);
    setEmbedabilityTested(false);
    setRetryCount(0);
    setLoadingTimeout(false);

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
          if (oEmbedData.title && !title) {
            setTitle(oEmbedData.title);
            showToast(`Title auto-filled: ${oEmbedData.title}`);
          }
        }
      } catch (oEmbedError) {
        console.log('Could not fetch title via oEmbed, user can enter manually');
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
      
      showToast('Video processing... Testing compatibility...');
    } catch (error: any) {
      console.error('Error extracting video data:', error);
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
          
          // Manual control functions
          window.testPlayback = function() {
            if (player && player.playVideo && isPlayerReady && !hasError) {
              try {
                console.log('Manual playback test triggered');
                player.playVideo();
              } catch (error) {
                console.error('Error in manual playback:', error);
              }
            }
          };
          
          window.detectTitle = function() {
            try {
              detectTitle();
            } catch (error) {
              console.error('Error in manual title detection:', error);
            }
          };
          
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
          break;
          
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
          setError('Failed to load YouTube API. Please check your internet connection.');
          break;
          
        case 'LIVE_VIDEO_DETECTED':
          setError('Live videos cannot be promoted. Please choose a regular video.');
          setVideoData(prev => prev ? { ...prev, embeddable: false, isLive: true } : null);
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
          
          if (data.isEmbeddingError) {
            setError('This video cannot be embedded. Please make it embeddable first or choose a different video.');
          } else {
            setError(data.message || 'Video playback failed. Please try a different video.');
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
          }
          break;
          
        case 'TITLE_DETECTED':
          if (data.title) {
            setVideoData(prev => prev ? { ...prev, autoDetectedTitle: data.title } : null);
            if (!title) {
              setTitle(data.title);
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
    if (!userSetDuration || userSetDuration < 10) {
      return 'Duration must be at least 10 seconds';
    }
    
    if (userSetDuration > 600) {
      return 'Duration must be less than 600 seconds (10 minutes)';
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

    const views = targetViews;

    if (isNaN(views) || views < 1 || views > 1000) {
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

    setLoading(true);
    setError(null);

    try {
      console.log('Promoting video with data:', {
        userId: user.id,
        totalCost,
        title,
        duration: userSetDuration,
        targetViews: views,
        videoId: videoData.id,
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

      // Create video promotion with 10-minute hold using the enhanced function
      const { data: videoResult, error: insertError } = await supabase
        .rpc('create_video_with_hold', {
          user_uuid: user.id,
          youtube_url_param: videoData.id, // Store only the video ID
          title_param: title,
          description_param: `Embed URL: ${videoData.embedUrl} | Original URL: ${videoData.originalUrl} | Auto-detected title: ${videoData.autoDetectedTitle || 'N/A'} | User-set duration: ${userSetDuration}s | Video ID: ${videoData.id}`,
          duration_seconds_param: userSetDuration,
          coin_cost_param: totalCost,
          coin_reward_param: rewardPerView,
          target_views_param: views
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
        `Cost: 🪙${totalCost} coins deducted\n` +
        `Reward: 🪙${rewardPerView} per view`,
        [{ text: 'OK', onPress: () => {} }]
      );
      
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

  const testPlaybackManually = () => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.testPlayback && window.testPlayback(); true;');
    }
  };

  const detectTitleManually = () => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('window.detectTitle && window.detectTitle(); true;');
    }
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
      'VIP membership gives you 10% discount on all promotions and other exclusive benefits!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => Alert.alert('VIP Benefits', 'Coming soon!') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with coin icon */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Promote Your Video</Text>
        <View style={styles.coinDisplay}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
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
                <TouchableOpacity
                  style={[styles.fetchButton, fetchingVideo && styles.fetchButtonDisabled]}
                  onPress={fetchVideoData}
                  disabled={fetchingVideo || !youtubeUrl.trim()}
                >
                  <Search color={fetchingVideo ? "#999" : "#FF4757"} size={20} />
                </TouchableOpacity>
              </View>
              {fetchingVideo && (
                <Text style={styles.helperText}>Checking video compatibility...</Text>
              )}
            </View>

            {/* Iframe Preview */}
            {videoData && (
              <View style={styles.iframeSection}>
                <TouchableOpacity
                  style={styles.iframeToggle}
                  onPress={() => setShowIframe(!showIframe)}
                >
                  <View style={styles.iframeToggleContent}>
                    <Text style={styles.iframeToggleTitle}>
                      Compatibility Test {embedabilityTested && (videoData.embeddable ? '✅' : '❌')}
                      {videoData.isLive && ' (Live Video)'}
                      {loadingTimeout && ' (Timeout)'}
                    </Text>
                    {showIframe ? <ChevronUp color="#666" size={20} /> : <ChevronDown color="#666" size={20} />}
                  </View>
                </TouchableOpacity>
                
                {showIframe && (
                  <View style={styles.iframeContainer}>
                    <View style={styles.iframeControls}>
                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={testPlaybackManually}
                        disabled={testingPlayback || !iframeLoaded}
                      >
                        <Play color="#FF4757" size={16} />
                        <Text style={styles.controlButtonText}>
                          {testingPlayback ? 'Testing...' : 'Test Play'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={detectTitleManually}
                        disabled={!iframeLoaded}<Type color="#FF4757" size={16} />
                      >
                        <Type color="#FF4757" size={16} />
                        <Text style={styles.controlButtonText}>Get Title</Text>
                      </TouchableOpacity>
                    </View>
                  
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
                        videoData.embeddable ? styles.embedabilitySuccess : styles.embedabilityError
                      ]}>
                        {videoData.embeddable ? (
                          <>
                            <CheckCircle color="#2ECC71" size={20} />
                            <Text style={styles.embedabilityText}>
                              ✅ Video is embeddable and ready for promotion!
                            </Text>
                          </>
                        ) : (
                          <>
                            <AlertCircle color="#E74C3C" size={20} />
                            <Text style={styles.embedabilityText}>
                              ❌ Video is not embeddable{videoData.isLive ? ' (Live video)' : ''}. Please make it embeddable first.
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}
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
              {videoData?.autoDetectedTitle && (
                <TouchableOpacity
                  style={styles.autoTitleButton}
                  onPress={() => setTitle(videoData.autoDetectedTitle || '')}
                >
                  <Text style={styles.autoTitleText}>
                    Use auto-detected: "{videoData.autoDetectedTitle}"
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Number of Views Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Views *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('views')}
              >
                <Eye color="#666" size={20} style={styles.inputIcon} />
                <Text style={[
                  styles.dropdownTriggerText,
                  targetViews && styles.dropdownTriggerTextSelected
                ]}>
                  {getSelectedViewsLabel()}
                </Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            {/* Duration Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set Duration (seconds) *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openDropdown('duration')}
              >
                <Clock color="#666" size={20} style={styles.inputIcon} />
                <Text style={[
                  styles.dropdownTriggerText,
                  userSetDuration && styles.dropdownTriggerTextSelected
                ]}>
                  {getSelectedDurationLabel()}
                </Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>
            </View>

            {/* Enhanced Cost Calculation */}
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
                  <Text style={styles.costLabel}>Reward per view:</Text>
                  <Text style={styles.costValue}>🪙{rewardPerView}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Your balance:</Text>
                  <Text style={[
                    styles.costValue, 
                    (profile?.coins || 0) < totalCost && styles.insufficientBalance
                  ]}>
                    🪙{profile?.coins || 0}
                  </Text>
                </View>
                {videoData && videoData.embeddable && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Compatibility:</Text>
                    <Text style={[styles.costValue, { color: '#2ECC71' }]}>✓ Verified</Text>
                  </View>
                )}
              </View>
            )}

            {/* VIP Discount and Upgrade Feature */}
            {!profile?.is_vip && userSetDuration && targetViews && (
              <TouchableOpacity style={styles.vipPrompt} onPress={handleUpgradeToVip}>
                <Crown color="#FFA726" size={20} />
                <Text style={styles.vipPromptText}>
                  VIP members save 🪙{vipDiscount || Math.ceil(baseCost * 0.1)} on this promotion - Become VIP?
                </Text>
              </TouchableOpacity>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Futuristic Dropdowns */}
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
  holdInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
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
  holdInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  holdInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStep: {
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusStepText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusArrow: {
    paddingHorizontal: 8,
  },
  statusArrowText: {
    fontSize: 16,
    color: '#999',
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
  dropdownTrigger: {
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
    backgroundColor: '#FFF8F8',
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
    color: '#FF4757',
    fontWeight: '600',
  },
  iframeSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
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
  iframeControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#FF4757',
    fontWeight: '500',
  },
  webviewContainer: {
    height: isSmallScreen ? 180 : 220,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
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
});