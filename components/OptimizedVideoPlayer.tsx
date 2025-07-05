import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Award, Clock, RefreshCw, ExternalLink, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing
} from 'react-native-reanimated';

interface OptimizedVideoPlayerProps {
  videoId: string; // Database video ID
  youtubeUrl: string; // Direct YouTube URL from database
  duration: number; // User-set duration in seconds
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
}

export default function OptimizedVideoPlayer({
  videoId,
  youtubeUrl,
  duration,
  coinReward,
  onVideoComplete,
  onVideoSkip,
  onError: reportErrorToParent
}: OptimizedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useSimulation, setUseSimulation] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const progressValue = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const maxRetries = 2;
  
  // Add debug logging
  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `${timestamp}: ${info}`]);
    console.log(`[VideoPlayer] ${info}`);
  };

  // Extract YouTube video ID and create embed URL
  useEffect(() => {
    if (youtubeUrl) {
      addDebugInfo(`Processing URL: ${youtubeUrl}`);
      const videoIdMatch = extractVideoIdFromUrl(youtubeUrl);
      if (videoIdMatch) {
        setYoutubeVideoId(videoIdMatch);
        addDebugInfo(`Extracted video ID: ${videoIdMatch}`);
        
        // Create multiple embed URL strategies
        const embedStrategies = [
          // Strategy 1: Standard embed with minimal restrictions
          `https://www.youtube.com/embed/${videoIdMatch}?autoplay=0&controls=1&modestbranding=1&rel=0&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
          // Strategy 2: No-cookie domain
          `https://www.youtube-nocookie.com/embed/${videoIdMatch}?autoplay=0&controls=1&modestbranding=1&rel=0&fs=0`,
          // Strategy 3: Minimal parameters
          `https://www.youtube.com/embed/${videoIdMatch}?autoplay=0&controls=1`,
        ];
        
        setEmbedUrl(embedStrategies[retryCount] || embedStrategies[0]);
        addDebugInfo(`Using embed strategy ${retryCount + 1}: ${embedStrategies[retryCount] || embedStrategies[0]}`);
        
        // Set loading timeout
        loadingTimeoutRef.current = setTimeout(() => {
          if (!isLoaded && !playerError) {
            addDebugInfo('Loading timeout reached, trying simulation mode');
            setLoadingTimeout(true);
            setUseSimulation(true);
            setIsLoaded(true);
            setPlayerReady(true);
          }
        }, 10000);
        
        // Initialize player
        setTimeout(() => {
          initializePlayer(videoIdMatch);
        }, 1000);
      } else {
        const error = 'Invalid YouTube URL format';
        setPlayerError(error);
        addDebugInfo(`Error: ${error}`);
        reportErrorToParent(error);
      }
    }
  }, [youtubeUrl, retryCount]);

  // Initialize player with multiple strategies
  const initializePlayer = (videoId: string) => {
    try {
      addDebugInfo(`Initializing player for video: ${videoId}`);
      
      if (Platform.OS === 'web') {
        // Try iframe first, then fallback to simulation
        setTimeout(() => {
          if (!isLoaded) {
            addDebugInfo('Iframe not loaded, checking for issues...');
            testIframeLoad();
          }
        }, 5000);
        
        loadYouTubeAPI(videoId);
      } else {
        // For mobile, use simulation immediately
        addDebugInfo('Mobile platform detected, using simulation');
        setUseSimulation(true);
        setTimeout(() => {
          setIsLoaded(true);
          setPlayerReady(true);
        }, 2000);
      }
    } catch (error) {
      addDebugInfo(`Error initializing player: ${error}`);
      handleRetry();
    }
  };

  // Test if iframe can load
  const testIframeLoad = () => {
    if (!embedUrl || !youtubeVideoId) return;
    
    addDebugInfo('Testing iframe load capability...');
    
    // Create a test iframe to check if video loads
    const testFrame = document.createElement('iframe');
    testFrame.src = embedUrl;
    testFrame.style.display = 'none';
    testFrame.onload = () => {
      addDebugInfo('Iframe loaded successfully');
      setIsLoaded(true);
      setPlayerReady(true);
      document.body.removeChild(testFrame);
    };
    testFrame.onerror = () => {
      addDebugInfo('Iframe failed to load, switching to simulation');
      setUseSimulation(true);
      setIsLoaded(true);
      setPlayerReady(true);
      document.body.removeChild(testFrame);
    };
    
    document.body.appendChild(testFrame);
    
    // Remove test frame after timeout
    setTimeout(() => {
      if (document.body.contains(testFrame)) {
        addDebugInfo('Iframe test timeout, using simulation');
        setUseSimulation(true);
        setIsLoaded(true);
        setPlayerReady(true);
        document.body.removeChild(testFrame);
      }
    }, 3000);
  };

  // Load YouTube IFrame API with improved error handling
  const loadYouTubeAPI = (videoId: string) => {
    if (Platform.OS !== 'web') return;
    
    try {
      addDebugInfo('Loading YouTube IFrame API...');
      
      // Check if API is already loaded
      if ((window as any).YT && (window as any).YT.Player) {
        addDebugInfo('YouTube API already loaded');
        setTimeout(() => createYouTubePlayer(videoId), 500);
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        addDebugInfo('YouTube API script already loading...');
        const checkAPI = setInterval(() => {
          if ((window as any).YT && (window as any).YT.Player) {
            clearInterval(checkAPI);
            addDebugInfo('YouTube API loaded via existing script');
            setTimeout(() => createYouTubePlayer(videoId), 500);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkAPI);
          if (!playerReady) {
            addDebugInfo('API loading timeout, falling back to simulation');
            setUseSimulation(true);
            setIsLoaded(true);
            setPlayerReady(true);
          }
        }, 8000);
        return;
      }

      // Load the API
      addDebugInfo('Loading YouTube API script...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onload = () => addDebugInfo('YouTube API script loaded');
      tag.onerror = () => {
        addDebugInfo('Failed to load YouTube API script');
        setUseSimulation(true);
        setIsLoaded(true);
        setPlayerReady(true);
      };
      
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // API ready callback
      (window as any).onYouTubeIframeAPIReady = () => {
        addDebugInfo('YouTube API ready callback fired');
        setTimeout(() => createYouTubePlayer(videoId), 500);
      };
      
    } catch (error) {
      addDebugInfo(`Error loading YouTube API: ${error}`);
      setUseSimulation(true);
      setIsLoaded(true);
      setPlayerReady(true);
    }
  };

  // Create YouTube player with enhanced error handling
  const createYouTubePlayer = (videoId: string) => {
    if (!youtubeVideoId || Platform.OS !== 'web') return;

    try {
      const playerId = `youtube-player-${videoId}`;
      const playerElement = document.getElementById(playerId);
      
      if (!playerElement) {
        addDebugInfo('Player element not found, using simulation');
        setUseSimulation(true);
        setIsLoaded(true);
        setPlayerReady(true);
        return;
      }

      addDebugInfo(`Creating YouTube player for video: ${youtubeVideoId}`);
      
      playerRef.current = new (window as any).YT.Player(playerId, {
        height: '100%',
        width: '100%',
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1, // Enable controls for better compatibility
          modestbranding: 1,
          showinfo: 0,
          rel: 0,
          fs: 0,
          disablekb: 0, // Allow keyboard for better UX
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (error) {
      addDebugInfo(`Error creating YouTube player: ${error}`);
      setUseSimulation(true);
      setIsLoaded(true);
      setPlayerReady(true);
    }
  };

  const onPlayerReady = (event: any) => {
    addDebugInfo('YouTube player ready');
    setIsLoaded(true);
    setPlayerReady(true);
    setPlayerError(null);
    setLoadingTimeout(false);
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Test video availability
    try {
      const player = event.target;
      const videoData = player.getVideoData();
      addDebugInfo(`Video data: ${JSON.stringify(videoData)}`);
      
      if (!videoData || !videoData.title) {
        addDebugInfo('Video may not be available, but continuing...');
      }
    } catch (error) {
      addDebugInfo(`Could not get video data: ${error}`);
    }
  };

  const onPlayerStateChange = (event: any) => {
    const state = event.data;
    const YT = (window as any).YT;
    if (!YT) return;
    
    const stateNames = {
      [YT.PlayerState.UNSTARTED]: 'UNSTARTED',
      [YT.PlayerState.ENDED]: 'ENDED',
      [YT.PlayerState.PLAYING]: 'PLAYING',
      [YT.PlayerState.PAUSED]: 'PAUSED',
      [YT.PlayerState.BUFFERING]: 'BUFFERING',
      [YT.PlayerState.CUED]: 'CUED',
    };
    
    addDebugInfo(`Player state: ${stateNames[state] || state}`);
    
    switch (state) {
      case YT.PlayerState.PLAYING:
        setIsPlaying(true);
        setPlayerError(null);
        if (!hasStarted) {
          setHasStarted(true);
          addDebugInfo('Video playback started successfully');
        }
        startProgressMonitoring();
        break;
      case YT.PlayerState.PAUSED:
        setIsPlaying(false);
        break;
      case YT.PlayerState.ENDED:
        setIsPlaying(false);
        break;
      case YT.PlayerState.BUFFERING:
        addDebugInfo('Video buffering...');
        break;
      case YT.PlayerState.CUED:
        addDebugInfo('Video cued and ready');
        break;
    }
  };

  const onPlayerError = (event: any) => {
    const errorMessages: { [key: number]: string } = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Video not allowed to be played in embedded players',
      150: 'Video not allowed to be played in embedded players',
    };
    
    const errorMessage = errorMessages[event.data] || 'Video playback error';
    addDebugInfo(`YouTube player error: ${errorMessage} (${event.data})`);
    
    // For embedding errors, switch to simulation immediately
    if (event.data === 101 || event.data === 150) {
      addDebugInfo('Video cannot be embedded, switching to simulation mode');
      setUseSimulation(true);
      setIsLoaded(true);
      setPlayerReady(true);
      setPlayerError(null);
      return;
    }
    
    setPlayerError(errorMessage);
    
    // Auto-retry for other errors
    setTimeout(() => {
      if (retryCount < maxRetries) {
        addDebugInfo('Auto-retrying due to player error...');
        handleRetry();
      } else {
        addDebugInfo('Max retries reached, switching to simulation');
        setUseSimulation(true);
        setIsLoaded(true);
        setPlayerReady(true);
        setPlayerError(null);
      }
    }, 3000);
  };

  // Handle retry logic
  const handleRetry = () => {
    if (retryCount >= maxRetries) {
      addDebugInfo('Max retries reached, using simulation mode');
      setUseSimulation(true);
      setIsLoaded(true);
      setPlayerReady(true);
      setPlayerError(null);
      return;
    }

    addDebugInfo(`Retrying video load (attempt ${retryCount + 1}/${maxRetries + 1})`);
    setRetryCount(prev => prev + 1);
    setIsLoaded(false);
    setPlayerReady(false);
    setPlayerError(null);
    setLoadingTimeout(false);
    
    // Clean up existing player
    if (playerRef.current && playerRef.current.destroy) {
      try {
        playerRef.current.destroy();
        playerRef.current = null;
      } catch (error) {
        addDebugInfo(`Error destroying player: ${error}`);
      }
    }
  };

  // Monitor video progress
  const startProgressMonitoring = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    addDebugInfo('Starting progress monitoring');
    
    timerRef.current = setInterval(() => {
      let currentVideoTime = 0;
      
      if (!useSimulation && Platform.OS === 'web' && playerRef.current && playerRef.current.getCurrentTime) {
        try {
          currentVideoTime = playerRef.current.getCurrentTime();
        } catch (error) {
          addDebugInfo(`Error getting current time: ${error}`);
          currentVideoTime = currentTime + 1;
        }
      } else {
        if (isPlaying) {
          currentVideoTime = currentTime + 1;
        } else {
          return;
        }
      }
      
      const effectiveTime = Math.min(currentVideoTime, duration);
      setCurrentTime(effectiveTime);
      
      const progress = Math.min(effectiveTime / duration, 1);
      progressValue.value = withTiming(progress, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });

      // Check for completion (100% of user-set duration)
      if (effectiveTime >= duration && !isCompleted) {
        addDebugInfo(`Video completion detected at: ${effectiveTime} of ${duration}`);
        setIsCompleted(true);
        setIsPlaying(false);
        
        if (!useSimulation && Platform.OS === 'web' && playerRef.current && playerRef.current.pauseVideo) {
          try {
            playerRef.current.pauseVideo();
          } catch (error) {
            addDebugInfo(`Error pausing video: ${error}`);
          }
        }
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        coinBounce.value = withTiming(1.3, { duration: 200 }, () => {
          coinBounce.value = withTiming(1, { duration: 200 });
        });
        
        completionTimeoutRef.current = setTimeout(() => {
          onVideoComplete();
        }, 1000);
      }
    }, 1000);
  };

  // Reset states when video changes
  useEffect(() => {
    addDebugInfo(`Video changed to: ${videoId}`);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoaded(false);
    setHasStarted(false);
    setIsCompleted(false);
    setPlayerError(null);
    setPlayerReady(false);
    setLoadingTimeout(false);
    setRetryCount(0);
    setUseSimulation(false);
    setDebugInfo([]);
    progressValue.value = 0;
    
    clearAllTimeouts();
    
    if (playerRef.current && playerRef.current.destroy) {
      try {
        playerRef.current.destroy();
        playerRef.current = null;
      } catch (error) {
        console.error('Error destroying player:', error);
      }
    }
  }, [videoId]);

  const clearAllTimeouts = () => {
    [timerRef, completionTimeoutRef, loadingTimeoutRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  const extractVideoIdFromUrl = (url: string): string | null => {
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

  const handlePlayPause = async () => {
    addDebugInfo(`Play/Pause toggled (simulation: ${useSimulation})`);
    
    if (!useSimulation && Platform.OS === 'web' && playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          // Add delay before playing to ensure player is ready
          setTimeout(() => {
            if (playerRef.current && playerRef.current.playVideo) {
              playerRef.current.playVideo();
            }
          }, 100);
        }
      } catch (error) {
        addDebugInfo(`Error controlling playback: ${error}`);
        // Fall back to simulation mode
        setUseSimulation(true);
        setIsPlaying(!isPlaying);
        if (!hasStarted) {
          setHasStarted(true);
          startProgressMonitoring();
        }
      }
    } else {
      // Simulation mode
      if (!hasStarted) {
        setHasStarted(true);
        addDebugInfo('Video playback started (simulation mode)');
        startProgressMonitoring();
      }
      
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = () => {
    clearAllTimeouts();
    
    Alert.alert(
      'Skip Video',
      `You will not earn ${coinReward} coins for this video. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => {
            if (!useSimulation && Platform.OS === 'web' && playerRef.current && playerRef.current.pauseVideo) {
              try {
                playerRef.current.pauseVideo();
              } catch (error) {
                addDebugInfo(`Error pausing video: ${error}`);
              }
            }
            setIsPlaying(false);
            setCurrentTime(0);
            setHasStarted(false);
            setIsCompleted(false);
            progressValue.value = 0;
            onVideoSkip();
          }
        },
      ]
    );
  };

  const handleManualRetry = () => {
    addDebugInfo('Manual retry requested');
    setPlayerError(null);
    handleRetry();
  };

  const openInYouTube = () => {
    if (Platform.OS === 'web') {
      window.open(youtubeUrl, '_blank');
    } else {
      Alert.alert('Open in YouTube', 'This would open the video in YouTube app');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const progressPercentage = Math.round((currentTime / duration) * 100);
  const remainingTime = Math.max(0, duration - currentTime);

  // Show loading state
  if (!playerReady && !playerError) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>
            {loadingTimeout ? 'Preparing video player...' : 'Loading video player...'}
          </Text>
          <Text style={styles.loadingSubtext}>
            Video ID: {youtubeVideoId}
            {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
          </Text>
          
          {loadingTimeout && (
            <TouchableOpacity style={styles.skipLoadingButton} onPress={() => {
              setUseSimulation(true);
              setIsLoaded(true);
              setPlayerReady(true);
            }}>
              <Play color="white" size={16} />
              <Text style={styles.skipLoadingText}>Use Simulation Mode</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.playerContainer}>
        {Platform.OS === 'web' && embedUrl && !useSimulation ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* YouTube API Player */}
            <div 
              id={`youtube-player-${videoId}`}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            />
            
            {/* Enhanced fallback iframe */}
            <iframe
              src={embedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: '#000',
                zIndex: playerRef.current ? -1 : 1,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen={false}
              onLoad={() => {
                addDebugInfo('Fallback iframe loaded');
                if (!playerRef.current) {
                  setIsLoaded(true);
                  setPlayerReady(true);
                }
              }}
              onError={() => {
                addDebugInfo('Iframe failed to load, switching to simulation');
                setUseSimulation(true);
                setIsLoaded(true);
                setPlayerReady(true);
              }}
            />
          </div>
        ) : (
          // Simulation mode or mobile player
          <View style={styles.simulationContainer}>
            <View style={styles.simulationHeader}>
              <AlertTriangle color="#FFA726" size={20} />
              <Text style={styles.simulationTitle}>
                {useSimulation ? 'Simulation Mode' : 'Mobile Player'}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause color="white" size={32} />
              ) : (
                <Play color="white" size={32} />
              )}
            </TouchableOpacity>
            
            <Text style={styles.simulationText}>
              {isPlaying ? `Playing... ${formatTime(currentTime)}` : 'Tap to start watching'}
            </Text>
            
            <Text style={styles.simulationNote}>
              Duration: {formatTime(duration)} • Reward: {coinReward} coins
            </Text>
            
            <Text style={styles.simulationVideoId}>
              Video: {youtubeVideoId}
            </Text>
            
            {useSimulation && (
              <Text style={styles.simulationWarning}>
                Video iframe couldn't load. Using simulation mode to track progress.
              </Text>
            )}
            
            {isPlaying && (
              <View style={styles.simulationProgress}>
                <View style={styles.simulationProgressBar}>
                  <Animated.View style={[styles.simulationProgressFill, progressAnimatedStyle]} />
                </View>
                <Text style={styles.simulationProgressText}>
                  {progressPercentage}% complete
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Progress Bar */}
        <View style={styles.progressOverlay}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>
      </View>

      {/* Video Info */}
      <View style={styles.videoInfo}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Clock color="#666" size={16} />
            <Text style={styles.statValue}>{formatTime(remainingTime)}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progressPercentage}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
          
          <View style={styles.statItem}>
            <Animated.View style={[styles.coinContainer, coinAnimatedStyle]}>
              <Award color="#FFA726" size={16} />
              <Text style={styles.statValue}>{coinReward}</Text>
            </Animated.View>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>

        {/* Status Banner */}
        {isCompleted ? (
          <LinearGradient
            colors={['#2ECC71', '#27AE60']}
            style={styles.completionBanner}
          >
            <Award color="white" size={24} />
            <Text style={styles.completionText}>
              Completed! You earned {coinReward} coins!
            </Text>
          </LinearGradient>
        ) : hasStarted ? (
          <View style={styles.watchingBanner}>
            <Play color="#FF4757" size={20} />
            <Text style={styles.watchingText}>
              Watch {formatTime(duration)} to earn {coinReward} coins
            </Text>
          </View>
        ) : (
          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>
              {Platform.OS === 'web' ? 'Click the play button to start watching' : 'Tap the play button to start'}
            </Text>
          </View>
        )}

        {/* Debug Information */}
        {debugInfo.length > 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Log:</Text>
            {debugInfo.map((info, index) => (
              <Text key={index} style={styles.debugText}>{info}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={openInYouTube}
        >
          <ExternalLink color="#666" size={20} />
          <Text style={styles.controlText}>Open in YouTube</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handlePlayPause}
          disabled={!playerReady}
        >
          {isPlaying ? (
            <Pause color="#FF4757" size={20} />
          ) : (
            <Play color="#FF4757" size={20} />
          )}
          <Text style={styles.controlText}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <SkipForward color="white" size={20} />
          <Text style={styles.skipButtonText}>Skip Video</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  playerContainer: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
    height: 220,
  },
  simulationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  simulationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 166, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  simulationTitle: {
    color: '#FFA726',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  simulationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  simulationNote: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  simulationVideoId: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  simulationWarning: {
    color: '#FFA726',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  simulationProgress: {
    width: '100%',
    alignItems: 'center',
  },
  simulationProgressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  simulationProgressFill: {
    height: '100%',
    backgroundColor: '#FF4757',
    borderRadius: 2,
  },
  simulationProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    zIndex: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4757',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  skipLoadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  skipLoadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  videoInfo: {
    margin: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  completionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  watchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  watchingText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '500',
  },
  instructionBanner: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionText: {
    color: '#666',
    fontSize: 14,
  },
  debugContainer: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  controlText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});