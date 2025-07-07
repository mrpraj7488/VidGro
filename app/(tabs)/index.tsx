import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ToastAndroid,
  StatusBar,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, RefreshCw, TriangleAlert as AlertTriangle, Menu } from 'lucide-react-native';
import SeamlessVideoPlayer from '@/components/SeamlessVideoPlayer';
import { useVideoStore } from '@/store/videoStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isVerySmallScreen = screenWidth < 350;

export default function ViewTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { 
    getCurrentVideo, 
    moveToNextVideo, 
    fetchVideos, 
    isLoading: isLoadingQueue,
    clearQueue,
    removeCurrentVideo,
    resetQueue
  } = useVideoStore();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const coinBounce = useSharedValue(1);
  const currentVideo = getCurrentVideo();

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('Toast:', message);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadVideoQueue();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && !currentVideo && !loading && !isLoadingQueue) {
      console.log('🔄 No current video, auto-reloading queue...');
      loadVideoQueue();
    }
  }, [currentVideo, user, loading, isLoadingQueue]);

  const loadVideoQueue = async () => {
    if (!user || isLoadingQueue || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading video queue for user:', user.id);
      
      await fetchVideos(user.id);
      
      const video = getCurrentVideo();
      if (!video) {
        console.log('⚠️ No active videos in queue, attempting reset...');
        
        await resetQueue(user.id);
        
        const newVideo = getCurrentVideo();
        if (!newVideo) {
          setError('No active videos available for viewing at the moment.');
        } else {
          console.log('✅ Active video loaded after reset:', newVideo.youtube_url);
        }
      } else {
        console.log('✅ Current active video loaded:', video.youtube_url);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading video queue:', error);
      setError(error.message || 'Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = async () => {
    if (!currentVideo || !user || !profile) {
      console.error('❌ Missing required data for completing video');
      return;
    }

    try {
      console.log('🎯 Completing video silently:', currentVideo.youtube_url);

      const { data: existingView } = await supabase
        .from('video_views')
        .select('id, coins_earned')
        .eq('video_id', currentVideo.id)
        .eq('viewer_id', user.id)
        .single();

      let coinsToAward = currentVideo.coin_reward;
      let shouldUpdateVideoCount = true;

      if (existingView) {
        console.log('🔄 User has watched this video before, updating existing view...');
        
        const { error: updateError } = await supabase
          .from('video_views')
          .update({
            watched_duration: currentVideo.duration_seconds,
            completed: true,
            coins_earned: existingView.coins_earned + currentVideo.coin_reward,
            created_at: new Date().toISOString()
          })
          .eq('id', existingView.id);

        if (updateError) {
          console.error('❌ Error updating existing video view:', updateError);
          throw new Error(`Failed to update video view: ${updateError.message}`);
        }

        shouldUpdateVideoCount = false;
        console.log('✅ Existing video view updated successfully');
      } else {
        console.log('🆕 First time watching this video, creating new view...');
        
        const { error: viewError } = await supabase
          .from('video_views')
          .insert({
            video_id: currentVideo.id,
            viewer_id: user.id,
            watched_duration: currentVideo.duration_seconds,
            completed: true,
            coins_earned: currentVideo.coin_reward
          });

        if (viewError) {
          console.error('❌ Error creating video view:', viewError);
          throw new Error(`Failed to record video view: ${viewError.message}`);
        }

        console.log('✅ New video view recorded successfully');
      }

      const { error: coinError } = await supabase
        .from('profiles')
        .update({ 
          coins: (profile.coins || 0) + coinsToAward,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (coinError) {
        console.error('❌ Error updating coins:', coinError);
        throw new Error(`Failed to update coins: ${coinError.message}`);
      }

      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: coinsToAward,
          transaction_type: 'video_watch',
          description: `Watched video: ${currentVideo.title}${existingView ? ' (repeat view)' : ''}`,
          reference_id: currentVideo.id
        });

      if (transactionError) {
        console.error('⚠️ Error recording transaction:', transactionError);
      }

      if (shouldUpdateVideoCount) {
        const { data: videoData, error: fetchError } = await supabase
          .from('videos')
          .select('views_count')
          .eq('id', currentVideo.id)
          .single();

        if (fetchError) {
          console.error('⚠️ Error fetching video data:', fetchError);
        } else {
          const newViewsCount = (videoData.views_count || 0) + 1;
          
          const { error: videoUpdateError } = await supabase
            .from('videos')
            .update({ 
              views_count: newViewsCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentVideo.id);

          if (videoUpdateError) {
            console.error('⚠️ Error updating video view count:', videoUpdateError);
          }
        }
      }

      console.log('✅ Video completion processed successfully');

      await refreshProfile();

      coinBounce.value = withSpring(1.3, { damping: 8 }, () => {
        coinBounce.value = withSpring(1);
      });

      setTimeout(() => {
        console.log('🔄 Moving to next video after completion...');
        moveToNextVideo();
        
        setTimeout(() => {
          const nextVideo = getCurrentVideo();
          if (!nextVideo) {
            console.log('🔄 No next video, triggering reload...');
            loadVideoQueue();
          } else {
            console.log('✅ Next video ready:', nextVideo.youtube_url);
          }
        }, 100);
      }, 100);

    } catch (error: any) {
      console.error('❌ Error completing video:', error);
      setError(error.message || 'Failed to complete video. Please try again.');
    }
  };

  const handleVideoSkip = () => {
    console.log('⏭️ Skipping video (user choice)');
    showToast('Skipped video');
    
    moveToNextVideo();
    
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('🔄 No next video after skip, triggering reload...');
        loadVideoQueue();
      } else {
        console.log('✅ Next video ready after skip:', nextVideo.youtube_url);
      }
    }, 100);
  };

  const handleVideoUnplayable = async () => {
    console.log('🚨 Video is unplayable, removing from queue...');
    showToast('Removed unplayable video');
    
    await removeCurrentVideo();
    
    setTimeout(() => {
      const nextVideo = getCurrentVideo();
      if (!nextVideo) {
        console.log('🔄 No next video after removal, triggering reload...');
        loadVideoQueue();
      } else {
        console.log('✅ Next video ready after removal:', nextVideo.youtube_url);
      }
    }, 100);
  };

  const handleVideoError = (errorMessage: string) => {
    console.error('❌ Video error:', errorMessage);
    setError(errorMessage);
    
    setTimeout(() => {
      handleVideoUnplayable();
    }, 5000);
  };

  const openInYouTube = () => {
    if (currentVideo) {
      if (Platform.OS === 'web') {
        window.open(`https://www.youtube.com/watch?v=${currentVideo.youtube_url}`, '_blank');
      } else {
        showToast('Opening in YouTube...');
      }
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>0</Text>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={isVerySmallScreen ? 28 : 32} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (loading || isLoadingQueue) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={isVerySmallScreen ? 28 : 32} />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (error && !currentVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
          </View>
        </View>
        <View style={styles.errorContainer}>
          <AlertTriangle color="#E74C3C" size={isVerySmallScreen ? 40 : 48} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              clearQueue();
              loadVideoQueue();
            }}
          >
            <RefreshCw color="white" size={isVerySmallScreen ? 16 : 20} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4757" />
      
      {/* Responsive Header */}
      <View style={styles.header}>
        <Menu color="white" size={isVerySmallScreen ? 20 : 24} />
        <Text style={styles.headerTitle}>Video Promoter</Text>
        <View style={styles.coinDisplay}>
          <Animated.View style={coinAnimatedStyle}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
          <DollarSign color="white" size={isVerySmallScreen ? 14 : 16} />
        </View>
      </View>

      {/* Responsive Video Player Section */}
      {currentVideo && (
        <View style={styles.videoSection}>
          <CleanVideoPlayer
            videoId={currentVideo.id}
            youtubeUrl={currentVideo.youtube_url}
            duration={currentVideo.duration_seconds}
            coinReward={currentVideo.coin_reward}
            onVideoComplete={handleVideoComplete}
            onVideoSkip={handleVideoSkip}
            onError={handleVideoError}
            onVideoUnplayable={handleVideoUnplayable}
          />
        </View>
      )}

      {/* Responsive Bottom Controls Section */}
      <View style={styles.bottomSection}>
        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.youtubeButton}
            onPress={openInYouTube}
          >
            <Text style={styles.youtubeButtonText}>Open on Youtube</Text>
          </TouchableOpacity>
          
          <View style={styles.autoPlayContainer}>
            <Text style={styles.autoPlayLabel}>Auto Play</Text>
            <TouchableOpacity
              style={[styles.toggleSwitch, autoPlay && styles.toggleSwitchActive]}
              onPress={() => setAutoPlay(!autoPlay)}
            >
              <View style={[styles.toggleThumb, autoPlay && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {currentVideo && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentVideo.duration_seconds}</Text>
              <Text style={styles.statLabel}>Seconds to get coins</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentVideo.coin_reward}</Text>
              <Text style={styles.statLabel}>Coins will be added</Text>
            </View>
          </View>
        )}

        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleVideoSkip}>
          <Text style={styles.skipButtonText}>SKIP VIDEO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Clean Video Player Component without overlays - Responsive
function CleanVideoPlayer({ 
  videoId, 
  youtubeUrl, 
  duration, 
  coinReward, 
  onVideoComplete, 
  onVideoSkip, 
  onError, 
  onVideoUnplayable 
}: {
  videoId: string;
  youtubeUrl: string;
  duration: number;
  coinReward: number;
  onVideoComplete: () => void;
  onVideoSkip: () => void;
  onError: (error: string) => void;
  onVideoUnplayable: () => void;
}) {
  const extractVideoIdFromUrl = (videoIdOrUrl: string): string | null => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
      return videoIdOrUrl;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = videoIdOrUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const youtubeVideoId = extractVideoIdFromUrl(youtubeUrl);

  if (!youtubeVideoId) {
    return (
      <View style={styles.errorVideoContainer}>
        <AlertTriangle color="#FF4757" size={isVerySmallScreen ? 28 : 32} />
        <Text style={styles.errorVideoText}>Invalid video format</Text>
      </View>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=0&modestbranding=1&showinfo=0&rel=0&fs=0&disablekb=1`;

  return (
    <View style={styles.cleanVideoContainer}>
      {Platform.OS === 'web' ? (
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
        />
      ) : (
        <View style={styles.mobileVideoPlaceholder}>
          <Text style={styles.mobileVideoText}>Video Player</Text>
          <Text style={styles.mobileVideoSubtext}>Video ID: {youtubeVideoId}</Text>
        </View>
      )}
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
    backgroundColor: '#FF4757',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isVerySmallScreen ? 10 : 12,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 20,
  },
  coinCount: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    marginRight: 4,
  },
  videoSection: {
    backgroundColor: '#000',
    height: isVerySmallScreen 
      ? screenHeight * 0.35 
      : isSmallScreen 
        ? screenHeight * 0.4 
        : screenHeight * 0.45,
  },
  cleanVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorVideoText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    marginTop: 12,
  },
  mobileVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  mobileVideoText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  mobileVideoSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: isVerySmallScreen ? 10 : 12,
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingTop: isVerySmallScreen ? 16 : 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 20 : 30,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  youtubeButtonText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#666',
    fontWeight: '500',
  },
  autoPlayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isVerySmallScreen ? 8 : 12,
  },
  autoPlayLabel: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#333',
    fontWeight: '500',
  },
  toggleSwitch: {
    width: isVerySmallScreen ? 44 : 50,
    height: isVerySmallScreen ? 26 : 30,
    borderRadius: isVerySmallScreen ? 13 : 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#FF4757',
  },
  toggleThumb: {
    width: isVerySmallScreen ? 22 : 26,
    height: isVerySmallScreen ? 22 : 26,
    borderRadius: isVerySmallScreen ? 11 : 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: isVerySmallScreen ? 30 : 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: isVerySmallScreen ? 32 : isSmallScreen ? 36 : 42,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  statLabel: {
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 20,
  },
  skipButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButtonText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    lineHeight: isVerySmallScreen ? 20 : 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: isVerySmallScreen ? 20 : 24,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
  },
});