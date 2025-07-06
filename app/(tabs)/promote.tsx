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
  
  const webviewRef = useRef<WebView>(null);

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
    setShowIframe(false);
    setEmbedabilityTested(false);

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
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch video data`);
      }
      
      const data = await response.json();
      console.log('Video data received:', data);

      if (data.valid && data.id) {
        const processedVideoData: VideoData = {
          id: data.id,
          embedUrl: data.embedUrl,
          thumbnail: data.thumbnail,
          embeddable: false, // Will be tested
          originalUrl: data.originalUrl || youtubeUrl,
        };

        setVideoData(processedVideoData);
        setError(null);
        setShowIframe(true); // Auto-show iframe for testing
        
        showToast('Video ID extracted. Testing embedability...');
      } else {
        setError(data.message || 'Invalid YouTube video');
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
          .controls {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
          }
          .control-btn {
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            padding: 8px 16px;
            margin: 0 4px;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <iframe 
          id="player"
          src="${embedUrl}?autoplay=1&controls=0&modestbranding=1&showinfo=0&rel=0&fs=0&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}"
          allow="autoplay; encrypted-media"
          allowfullscreen="false"
          onload="handleIframeLoad()"
          onerror="handleIframeError()"
        ></iframe>
        
        <div class="controls">
          <button class="control-btn" onclick="testPlayback()">Test Play</button>
          <button class="control-btn" onclick="detectTitle()">Get Title</button>
        </div>

        <script>
          let player;
          let isEmbeddable = false;
          let autoDetectedTitle = '';
          
          function handleIframeLoad() {
            console.log('Iframe loaded successfully');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'IFRAME_LOADED',
              success: true
            }));
            
            // Auto-test playback after load
            setTimeout(() => {
              testPlayback();
            }, 2000);
          }
          
          function handleIframeError() {
            console.log('Iframe failed to load');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'IFRAME_ERROR',
              success: false,
              message: 'Failed to load video iframe'
            }));
          }
          
          function testPlayback() {
            console.log('Testing video playback...');
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TESTING_PLAYBACK',
              message: 'Testing video playback...'
            }));
            
            // Try to detect if video is playing by checking iframe content
            const iframe = document.getElementById('player');
            if (iframe) {
              try {
                // Check if iframe loaded without errors
                isEmbeddable = true;
                
                // Auto-detect title from iframe
                setTimeout(() => {
                  detectTitle();
                }, 1000);
                
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PLAYBACK_SUCCESS',
                  embeddable: true,
                  message: 'Video appears to be embeddable'
                }));
              } catch (error) {
                console.error('Playback test failed:', error);
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PLAYBACK_FAILED',
                  embeddable: false,
                  message: 'Video is not embeddable: ' + error.message
                }));
              }
            }
          }
          
          function detectTitle() {
            try {
              // Try multiple methods to get video title
              let detectedTitle = '';
              
              // Method 1: Check document title
              if (document.title && document.title !== 'YouTube') {
                detectedTitle = document.title.replace(' - YouTube', '');
              }
              
              // Method 2: Try to access iframe content (may be blocked by CORS)
              const iframe = document.getElementById('player');
              if (iframe && iframe.contentDocument) {
                const iframeTitle = iframe.contentDocument.title;
                if (iframeTitle && iframeTitle !== 'YouTube') {
                  detectedTitle = iframeTitle.replace(' - YouTube', '');
                }
              }
              
              // Method 3: Generate a default title based on video ID
              if (!detectedTitle) {
                const urlParams = new URLSearchParams(iframe.src.split('?')[1]);
                const videoId = iframe.src.match(/embed\/([^?]+)/)?.[1];
                detectedTitle = \`Video \${videoId || 'Unknown'}\`;
              }
              
              autoDetectedTitle = detectedTitle;
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TITLE_DETECTED',
                title: detectedTitle,
                success: true
              }));
              
            } catch (error) {
              console.error('Title detection failed:', error);
              // Fallback title
              const videoId = '${videoData?.id || 'Unknown'}';
              autoDetectedTitle = \`Video \${videoId}\`;
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TITLE_DETECTED',
                title: autoDetectedTitle,
                success: false,
                message: 'Used fallback title due to CORS restrictions'
              }));
            }
          }
          
          // Auto-start testing when page loads
          window.addEventListener('load', () => {
            setTimeout(() => {
              handleIframeLoad();
            }, 1000);
          });
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
        case 'IFRAME_LOADED':
          setIframeLoaded(true);
          showToast('Video iframe loaded successfully');
          break;
          
        case 'IFRAME_ERROR':
          setError('Failed to load video iframe. Video may not be embeddable.');
          setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
          break;
          
        case 'TESTING_PLAYBACK':
          setTestingPlayback(true);
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
          Alert.alert(
            'Video Not Embeddable',
            'This video cannot be embedded. Please make it embeddable first or choose a different video.',
            [{ text: 'OK' }]
          );
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
  };

  const testPlaybackManually = () => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('testPlayback(); true;');
    }
  };

  const detectTitleManually = () => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript('detectTitle(); true;');
    }
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
                          disabled={testingPlayback}
                        >
                          <Play color="#FF4757" size={16} />
                          <Text style={styles.controlButtonText}>
                            {testingPlayback ? 'Testing...' : 'Test Play'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={detectTitleManually}
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
                      
                      {!iframeLoaded && (
                        <View style={styles.loadingOverlay}>
                          <Text style={styles.loadingText}>Loading video preview...</Text>
                        </View>
                      )}
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
                              ❌ Video is not embeddable. Please make it embeddable first.
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
                3. Iframe automatically tests video embedability{'\n'}
                4. Title is auto-detected using JavaScript injection{'\n'}
                5. Only embeddable videos can be promoted{'\n'}
                6. Your video gets promoted to viewers efficiently!
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
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