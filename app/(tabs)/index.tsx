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
import { DollarSign, RefreshCw, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import SeamlessVideoPlayer from '@/components/SeamlessVideoPlayer';
import { useVideoStore } from '@/store/videoStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

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

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinCount}>0</Text>
            <View style={styles.coinIcon}>
              <DollarSign color="white" size={16} />
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={32} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (loading || isLoadingQueue) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <View style={styles.coinIcon}>
              <DollarSign color="white" size={16} />
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <RefreshCw color="#FF4757" size={32} />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  if (error && !currentVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Video Promoter</Text>
          <View style={styles.coinDisplay}>
            <Animated.View style={coinAnimatedStyle}>
              <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
            </Animated.View>
            <View style={styles.coinIcon}>
              <DollarSign color="white" size={16} />
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <AlertTriangle color="#E74C3C" size={48} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              clearQueue();
              loadVideoQueue();
            }}
          >
            <RefreshCw color="white" size={20} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4757" />
      
      {/* Clean Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Video Promoter</Text>
        <View style={styles.coinDisplay}>
          <Animated.View style={coinAnimatedStyle}>
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </Animated.View>
          <View style={styles.coinIcon}>
            <DollarSign color="white" size={16} />
          </View>
        </View>
      </View>

      {/* Video Player Section - Centered and Clean */}
      {currentVideo && (
        <View style={styles.videoSection}>
          <SeamlessVideoPlayer
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

      {/* Video Title - Clean and Minimal */}
      {currentVideo && (
        <View style={styles.titleSection}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {currentVideo.title}
          </Text>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
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
    marginRight: 4,
  },
  coinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSection: {
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: isSmallScreen ? screenHeight * 0.5 : screenHeight * 0.55,
  },
  titleSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 12,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
});