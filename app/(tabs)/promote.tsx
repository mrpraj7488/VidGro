import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Link, Type, Clock, DollarSign, TrendingUp, Eye, Search, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react-native';

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
      
      showToast('Video ID extracted. Testing embedability...');
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
        <div id="loading" class="loading">Loading video...</div>
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
              document.getElementById('error').textContent = 'Loading timeout. Video may not be embeddable.';
              
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
          Alert.alert(
            'Loading Timeout',
            'Video failed to load within 5 seconds. It may not be embeddable.',
            [{ text: 'OK' }]
          );
          break;
          
        case 'API_LOAD_ERROR':
        case 'PLAYER_INIT_ERROR':
          setError('Failed to load YouTube API. Please check your internet connection.');
          break;
          
        case 'LIVE_VIDEO_DETECTED':
          Alert.alert(
            'Live Video Not Supported',
            'Live videos cannot be promoted. Please choose a regular video.',
            [{ text: 'OK' }]
          );
          setVideoData(prev => prev ? { ...prev, embeddable: false, isLive: true } : null);
          break;
          
        case 'PLAYBACK_SUCCESS':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: true } : null);
          showToast('✅ Video is embeddable!');
          break;
          
        case 'PLAYBACK_FAILED':
          setTestingPlayback(false);
          setEmbedabilityTested(true);
          setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
          
          if (data.isEmbeddingError) {
            Alert.alert(
              'Video Not Embeddable',
              'This video cannot be embedded. Please make it embeddable first or choose a different video.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Video Error',
              data.message || 'Video playback failed. Please try a different video.',
              [{ text: 'OK' }]
            );
          }
          break;
          
        case 'RETRY_NEEDED':
          if (retryCount < maxRetries) {
            console.log(`Retrying video load (attempt ${data.retryAttempt})`);
            showToast(`HTTP 502, retrying... (${data.retryAttempt}/${maxRetries})`);
            setRetryCount(data.retryAttempt);
            
            // Retry after 2 seconds
            setTimeout(() => {
              setShowIframe(false);
              setTimeout(() => {
                setShowIframe(true);
              }, 100);
            }, 2000);
          } else {
            showToast('Video unavailable, skipping...');
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
    
    if (isNaN(userDuration) || userDuration < 10) {
      return 'Duration must be at least 10 seconds';
    }
    
    if (userDuration > 600) {
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

    // Check if video embedability was tested
    if (!videoData || !embedabilityTested) {
      Alert.alert(
        'Test Embedability First',
        'Please test the video embedability using the iframe preview before promoting.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!videoData.embeddable) {
      Alert.alert(
        'Video Not Embeddable',
        'This video cannot be embedded. Please make it embeddable first or choose a different video.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (videoData.isLive) {
      Alert.alert(
        'Live Video Not Supported',
        'Live videos cannot be promoted. Please choose a regular video.',
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

      // Create video promotion with video ID and embed URL
      const videoInsertData = {
        user_id: user.id,
        youtube_url: videoData.id, // Store only the video ID
        title,
        description: `Embed URL: ${videoData.embedUrl} | Original URL: ${videoData.originalUrl} | Auto-detected title: ${videoData.autoDetectedTitle || 'N/A'} | User-set duration: ${durationSeconds}s | Video ID: ${videoData.id}`,
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

      // Show success toast
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

  return (
    <View style={styles.container}>
      {/* Header with adjusted padding */}
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
                <Text style={styles.helperText}>Extracting video ID and preparing embed URL...</Text>
              )}
              <Text style={styles.helperText}>
                Supports both youtube.com/watch and youtu.be formats. Video embedability will be tested automatically.
              </Text>
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
                      Embedability Test {embedabilityTested && (videoData.embeddable ? '✅' : '❌')}
                      {videoData.isLive && ' (Live Video)'}
                      {loadingTimeout && ' (Timeout)'}
                    </Text>
                    {showIframe ? <ChevronUp color="#666" size={20} /> : <ChevronDown color="#666" size={20} />}
                  </View>
                </TouchableOpacity>
                
                {showIframe && (
                  <View style={styles.iframeContainer}>
                    <View style={styles.iframeHeader}>
                      <Text style={styles.iframeUrl}>Embed URL: {videoData.embedUrl}</Text>
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
                          disabled={!iframeLoaded}
                        >
                          <Type color="#FF4757" size={16} />
                          <Text style={styles.controlButtonText}>Get Title</Text>
                        </TouchableOpacity>
                      </View>
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
                Minimum 10 seconds, Maximum 600 seconds (10 minutes)
              </Text>
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
                    <Text style={styles.costLabel}>Embedability:</Text>
                    <Text style={[styles.costValue, { color: '#2ECC71' }]}>✓ Verified</Text>
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
              <Text style={styles.instructionsTitle}>How iframe embedability testing works:</Text>
              <Text style={styles.instructionsText}>
                1. Enter any YouTube URL format (youtube.com/watch or youtu.be){'\n'}
                2. System extracts video ID and creates embed URL{'\n'}
                3. Iframe automatically tests video embedability with 5-second timeout{'\n'}
                4. Title is auto-detected using JavaScript injection{'\n'}
                5. Live videos are automatically detected and rejected{'\n'}
                6. HTTP 502 errors are retried up to 2 times{'\n'}
                7. Only embeddable videos can be promoted{'\n'}
                8. Your video gets promoted to viewers efficiently!
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
  iframeHeader: {
    marginBottom: 12,
  },
  iframeUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  iframeControls: {
    flexDirection: 'row',
    gap: 8,
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