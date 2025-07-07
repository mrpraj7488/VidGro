import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { TriangleAlert as AlertTriangle } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface SeamlessVideoPlayerProps {
  videoId: string;
  youtubeUrl: string; // This now contains the video ID
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
  onVideoUnplayable: () => void;
  autoPlay?: boolean;
  onPlayerReady?: () => void;
  onStateChange?: (state: number) => void;
}

export interface SeamlessVideoPlayerRef {
  injectJavaScript: (script: string) => void;
}

const SeamlessVideoPlayer = forwardRef<SeamlessVideoPlayerRef, SeamlessVideoPlayerProps>(({
  videoId,
  youtubeUrl, // This is actually the video ID from database
  duration,
  coinReward,
  onVideoComplete,
  onVideoSkip,
  onError: reportErrorToParent,
  onVideoUnplayable,
  autoPlay = true,
  onPlayerReady,
  onStateChange
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const webviewRef = useRef<WebView>(null);
  const maxRetries = 2;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    injectJavaScript: (script: string) => {
      try {
        webviewRef.current?.injectJavaScript(script);
      } catch (error) {
        console.error('JavaScript injection failed:', error);
      }
    }
  }));

  // Extract YouTube video ID from the stored value (which is now just the video ID)
  const extractVideoIdFromUrl = (videoIdOrUrl: string): string | null => {
    console.log('Processing video ID/URL:', videoIdOrUrl);
    
    // If it's already a video ID (11 characters), return it directly
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
      console.log('Already a video ID:', videoIdOrUrl);
      return videoIdOrUrl;
    }
    
    // Otherwise, try to extract from URL patterns
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
      /youtube\.com\/embed\/([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = videoIdOrUrl.match(pattern);
      if (match && match[1]) {
        console.log('Extracted video ID:', match[1], 'from pattern:', pattern.source);
        return match[1];
      }
    }
    
    console.log('Could not extract video ID from:', videoIdOrUrl);
    return null;
  };

  const youtubeVideoId = extractVideoIdFromUrl(youtubeUrl);

  // Create optimized HTML content with enhanced error handling and retry logic
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
          font-family: Arial, sans-serif;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
        .loading {
          color: white;
          text-align: center;
          padding: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
        }
        .error {
          color: #ff4757;
          text-align: center;
          padding: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <div id="loading" class="loading">Loading video...</div>
      <div id="error" class="error" style="display: none;"></div>
      
      <script>
        console.log('Initializing video player for video ID: ${youtubeVideoId}');
        
        var player;
        var isPlayerReady = false;
        var currentTime = 0;
        var maxDuration = ${duration};
        var hasCompleted = false;
        var autoPlayEnabled = ${autoPlay};
        var progressCheckInterval;
        var loadingTimeoutId;
        var retryAttempt = ${retryCount};
        var maxRetries = ${maxRetries};
        var hasTimedOut = false;
        var isLiveVideo = false;
        var hasError = false;
        var initializationInProgress = false;
        var lastKnownState = -1;

        // Set loading timeout (5 seconds)
        loadingTimeoutId = setTimeout(function() {
          if (!isPlayerReady && !hasTimedOut && !hasError) {
            hasTimedOut = true;
            console.log('Loading timeout reached after 5 seconds');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Video unavailable, skipping...';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: 'LOADING_TIMEOUT',
              message: 'Video failed to load within 5 seconds',
              errorType: 'TIMEOUT',
              isEmbeddingError: true
            }));
          }
        }, 5000);

        // Load YouTube IFrame API with enhanced error handling
        function loadYouTubeAPI() {
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          tag.onerror = function() {
            console.error('Failed to load YouTube IFrame API - possible HTTP 502');
            clearTimeout(loadingTimeoutId);
            hasError = true;
            
            if (retryAttempt < maxRetries) {
              console.log('HTTP 502, retrying... (' + (retryAttempt + 1) + '/' + maxRetries + ')');
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'HTTP 502, retrying...';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'RETRY_NEEDED',
                error: 'HTTP_502',
                message: 'HTTP 502 error, retrying...',
                retryAttempt: retryAttempt + 1
              }));
            } else {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Video unavailable, skipping...';
              
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_UNPLAYABLE',
                error: 'API_LOAD_FAILED',
                message: 'Failed to load YouTube API after retries',
                errorType: 'API_ERROR',
                isEmbeddingError: true
              }));
            }
          };
          
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // Initialize API loading
        loadYouTubeAPI();

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
              videoId: '${youtubeVideoId}',
              playerVars: {
                'autoplay': 0, // Always start with autoplay 0, control manually
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
              type: 'VIDEO_UNPLAYABLE',
              error: 'PLAYER_INIT_ERROR',
              message: 'Failed to initialize YouTube player',
              errorType: 'INIT_ERROR',
              isEmbeddingError: true
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
            videoId: '${youtubeVideoId}',
            autoPlay: autoPlayEnabled
          }));
        }

        function onPlayerStateChange(event) {
          if (hasError || hasTimedOut) {
            return;
          }
          
          var state = event.data;
          lastKnownState = state;
          var stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
          };
          
          console.log('Player state changed to:', stateNames[state] || state);
          
          // Enhanced live video detection
          if (state === 3) { // BUFFERING
            setTimeout(function() {
              if (player && player.getPlayerState && player.getPlayerState() === 3) {
                // Check if it's a live video
                try {
                  var videoData = player.getVideoData();
                  if (videoData && videoData.isLive) {
                    isLiveVideo = true;
                    console.log('Live video detected');
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'Live videos not supported';
                    
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'VIDEO_UNPLAYABLE',
                      error: 'LIVE_VIDEO',
                      message: 'Live videos are not supported',
                      errorType: 'LIVE_VIDEO',
                      isEmbeddingError: true
                    }));
                    return;
                  }
                } catch (e) {
                  console.log('Could not check live status:', e);
                }
                
                // If still buffering after 5 seconds and not live, might be unplayable
                setTimeout(function() {
                  if (player && player.getPlayerState && player.getPlayerState() === 3) {
                    console.log('Video stuck in buffering state - likely unplayable');
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'VIDEO_UNPLAYABLE',
                      error: 'STUCK_BUFFERING',
                      message: 'Video stuck in buffering state',
                      errorType: 'BUFFERING_ERROR',
                      isEmbeddingError: true
                    }));
                  }
                }, 5000);
              }
            }, 3000);
          }
          
          // Send state change to React Native
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STATE_CHANGE',
            state: state,
            stateName: stateNames[state] || 'UNKNOWN'
          }));
          
          if (state === 0) { // ENDED
            console.log('Video ended naturally');
            if (!hasCompleted) {
              hasCompleted = true;
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_COMPLETED',
                currentTime: maxDuration
              }));
            }
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
          
          // Check if we should retry for certain errors
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
            // Determine if it's an embedding error
            var isEmbeddingError = event.data === 101 || event.data === 150 || event.data === 100;
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_UNPLAYABLE',
              error: event.data,
              message: errorMessage,
              errorType: isEmbeddingError ? 'NOT_EMBEDDABLE' : 'PLAYBACK_ERROR',
              isEmbeddingError: isEmbeddingError
            }));
          }
        }

        // Expose control functions for React Native
        window.playVideo = function() {
          if (isPlayerReady && player && player.playVideo && !hasError) {
            try {
              console.log('Manual play triggered');
              player.playVideo();
            } catch (error) {
              console.error('Error in manual play:', error);
            }
          }
        };

        window.pauseVideo = function() {
          if (isPlayerReady && player && player.pauseVideo && !hasError) {
            try {
              console.log('Manual pause triggered');
              player.pauseVideo();
            } catch (error) {
              console.error('Error in manual pause:', error);
            }
          }
        };

        window.getPlayerState = function() {
          if (isPlayerReady && player && player.getPlayerState) {
            try {
              return player.getPlayerState();
            } catch (error) {
              console.error('Error getting player state:', error);
              return lastKnownState;
            }
          }
          return lastKnownState;
        };

        // Handle page errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          console.error('Page error:', msg);
          hasError = true;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIDEO_UNPLAYABLE',
            error: 'PAGE_ERROR',
            message: 'Page error: ' + msg,
            errorType: 'PAGE_ERROR',
            isEmbeddingError: false
          }));
          return true;
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
          }
          if (loadingTimeoutId) {
            clearTimeout(loadingTimeoutId);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Reset states when video changes
  useEffect(() => {
    console.log('Video changed, resetting player state for:', videoId, youtubeUrl);
    setIsLoaded(false);
    setPlayerError(null);
    setRetryCount(0);
    setLoadingTimeout(false);
  }, [videoId]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message received:', data.type, data);
      
      switch (data.type) {
        case 'PLAYER_READY':
          console.log('Player ready message received for video:', data.videoId || youtubeVideoId);
          setIsLoaded(true);
          setPlayerError(null);
          setLoadingTimeout(false);
          onPlayerReady?.();
          break;
          
        case 'STATE_CHANGE':
          console.log('State change received:', data.stateName, 'state:', data.state);
          onStateChange?.(data.state);
          break;
          
        case 'VIDEO_COMPLETED':
          console.log('Video completed:', youtubeVideoId);
          onVideoComplete();
          break;
          
        case 'RETRY_NEEDED':
          if (retryCount < maxRetries) {
            console.log(`Retrying video load (attempt ${data.retryAttempt})`);
            setRetryCount(data.retryAttempt);
            
            // Retry after 2 seconds
            setTimeout(() => {
              if (webviewRef.current) {
                webviewRef.current.reload();
              }
            }, 2000);
          } else {
            console.log('Max retries reached, marking as unplayable');
            onVideoUnplayable();
          }
          break;
          
        case 'VIDEO_UNPLAYABLE':
          console.log('Video unplayable received:', data.message, 'for video:', youtubeVideoId);
          setPlayerError(data.message);
          onVideoUnplayable();
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      reportErrorToParent('Failed to parse video message');
    }
  }, [youtubeVideoId, retryCount, maxRetries, onPlayerReady, onStateChange, onVideoComplete, onVideoUnplayable, reportErrorToParent]);

  const handleWebViewLoad = useCallback(() => {
    console.log('WebView loaded for video:', youtubeVideoId);
  }, [youtubeVideoId]);

  const handleWebViewError = useCallback(() => {
    console.log('WebView error for video:', youtubeVideoId);
    setPlayerError('Failed to load video player');
    reportErrorToParent('Failed to load video player');
  }, [youtubeVideoId, reportErrorToParent]);

  // Show error if no video ID could be extracted
  if (!youtubeVideoId) {
    console.error('Could not extract video ID from:', youtubeUrl);
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle color="#FF4757" size={32} />
        <Text style={styles.errorText}>Invalid video ID format</Text>
        <Text style={styles.errorSubtext}>Video ID/URL: {youtubeUrl}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading overlay */}
      {!isLoaded && !loadingTimeout && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Loading video...</Text>
          <Text style={styles.loadingSubtext}>Video ID: {youtubeVideoId}</Text>
          {retryCount > 0 && (
            <Text style={styles.loadingSubtext}>Retry attempt: {retryCount}/{maxRetries}</Text>
          )}
        </View>
      )}
      
      {/* WebView Player */}
      <WebView
        ref={webviewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, !isLoaded && styles.hidden]}
        onMessage={handleWebViewMessage}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        allowsFullscreenVideo={false}
        allowsProtectedMedia={false}
        dataDetectorTypes={['none']}
      />
      
      {/* Error overlay */}
      {(playerError || loadingTimeout) && (
        <View style={styles.errorOverlay}>
          <AlertTriangle color="#FF4757" size={24} />
          <Text style={styles.errorText}>
            {loadingTimeout ? 'Video unavailable, skipping...' : 'Loading next video...'}
          </Text>
          <Text style={styles.errorSubtext}>{playerError}</Text>
        </View>
      )}
    </View>
  );
});

SeamlessVideoPlayer.displayName = 'SeamlessVideoPlayer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default SeamlessVideoPlayer;