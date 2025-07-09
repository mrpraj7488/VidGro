import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Eye, 
  Clock, 
  Trash2, 
  RotateCcw, 
  Timer,
  Play,
  Pause,
  CircleCheck as CheckCircle,
  AlertTriangle
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoData {
  id: string;
  youtube_url: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold';
  created_at: string;
  updated_at: string;
  hold_until?: string;
  duration_seconds: number;
  video_views?: any[];
}

export default function EditVideoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const params = useLocalSearchParams();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [holdTimer, setHoldTimer] = useState(0);
  const [repromoteToggle, setRepromoteToggle] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);

  useEffect(() => {
    if (params.videoData) {
      try {
        const video = JSON.parse(params.videoData as string);
        setVideoData(video);
        
        // Calculate hold timer if video is on hold
        if (video.status === 'on_hold') {
          const holdUntil = new Date(video.hold_until || video.created_at);
          holdUntil.setMinutes(holdUntil.getMinutes() + 10);
          const remainingMs = holdUntil.getTime() - new Date().getTime();
          setHoldTimer(Math.max(0, Math.floor(remainingMs / 1000)));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error parsing video data:', error);
        router.back();
      }
    }
  }, [params.videoData]);

  // Update hold timer every second
  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [holdTimer]);

  const calculateTotalWatchTime = () => {
    if (!videoData) return 0;
    
    // Calculate based on promotion criteria: views × duration
    const totalSeconds = videoData.views_count * videoData.duration_seconds;
    return totalSeconds;
  };

  const formatWatchTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  const formatHoldTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getMinutesSinceCreation = () => {
    if (!videoData) return 0;
    const createdTime = new Date(videoData.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));
  };

  const getRefundInfo = () => {
    const minutesSinceCreation = getMinutesSinceCreation();
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 80;
    const refundAmount = Math.floor((videoData?.coin_cost || 0) * refundPercentage / 100);
    
    return { refundPercentage, refundAmount, isWithin10Minutes };
  };

  const handleDeleteVideo = async () => {
    if (!videoData || !user) return;

    const { refundPercentage, refundAmount, isWithin10Minutes } = getRefundInfo();
    
    // Special message for videos that just finished hold period
    const message = isWithin10Minutes
      ? `Delete video and restore 100% coins (🪙${refundAmount})?`
      : holdTimer === 0 && videoData.status === 'on_hold'
      ? `10 minutes elapsed: Deleting now refunds 80% coins (🪙${refundAmount}). Confirm?`
      : `Deleting video after 10 minutes: ${refundPercentage}% coins (🪙${refundAmount}) will be restored. Confirm?`;

    Alert.alert(
      'Delete Video',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the enhanced deletion function
              const { data: success, error: deleteError } = await supabase
                .rpc('delete_video_with_refund', {
                  video_uuid: videoData.id,
                  user_uuid: user.id
                });

              if (deleteError) throw deleteError;

              if (success) {
                // Log the deletion
                console.log(`Video ${videoData.youtube_url} deleted with ${refundPercentage}% refund`);

                // Refresh profile and clear queue
                await refreshProfile();
                clearQueue();

                // Animate coin update
                coinBounce.value = withSequence(
                  withSpring(1.3, { damping: 15, stiffness: 150 }),
                  withSpring(1, { damping: 15, stiffness: 150 })
                );

                Alert.alert('Success', `Video deleted and 🪙${refundAmount} coins restored!`, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Failed to delete video');
              }
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRepromoteVideo = async () => {
    if (!videoData || !user) return;

    Alert.alert(
      'Repromote Video',
      'This will reset all views and watch duration, and restart the video with a new 10-minute hold period. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repromote',
          onPress: async () => {
            try {
              // Use the enhanced extension function
              const { data: success, error } = await supabase
                .rpc('extend_video_promotion', {
                  video_uuid: videoData.id,
                  user_uuid: user.id
                });

              if (error) throw error;

              if (success) {
                // Set video to hold status with new hold period
                const { error: updateError } = await supabase
                  .from('videos')
                  .update({
                    status: 'on_hold',
                    hold_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', videoData.id)
                  .eq('user_id', user.id);

                if (updateError) throw updateError;

                // Log the repromote action
                console.log(`Video ${videoData.youtube_url} status changed to Pending for repromote`);

                // Clear video queue to refresh with repromoted video
                clearQueue();

                Alert.alert(
                  'Success',
                  'Video repromoted successfully! It will be on hold for 10 minutes before entering the queue again.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                throw new Error('Failed to repromote video');
              }
            } catch (error) {
              console.error('Error repromoting video:', error);
              Alert.alert('Error', 'Failed to repromote video. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'PENDING';
      default: return status.toUpperCase();
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  if (loading || !videoData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading video details...</Text>
      </View>
    );
  }

  const totalWatchTime = calculateTotalWatchTime();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {videoData.title}
        </Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(videoData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(videoData.status)}</Text>
            </View>
            <Text style={styles.videoId}>ID: {videoData.youtube_url}</Text>
          </View>
        </View>

        {/* Pending Status Timeline */}
        {videoData.status === 'on_hold' && holdTimer > 0 && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Timer color="#F39C12" size={24} />
              <Text style={styles.pendingTitle}>Pending Status</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatHoldTimer(holdTimer)} remaining</Text>
              <Text style={styles.timerSubtext}>Video will enter queue after hold period</Text>
            </View>
          </View>
        )}

        {/* Main Metrics - Only Total Views and Watch Time */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Video Metrics</Text>
          
          <View style={styles.metricsGrid}>
            {/* Total Views */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Eye color="#3498DB" size={24} />
                <Text style={styles.metricLabel}>Total Views</Text>
              </View>
              <Text style={styles.metricValue}>
                {videoData.views_count}/{videoData.target_views}
              </Text>
              <Text style={styles.metricSubtext}>
                {videoData.views_count} of {videoData.target_views} completed
              </Text>
            </View>

            {/* Watch Time */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Clock color="#F39C12" size={24} />
                <Text style={styles.metricLabel}>Watch Time</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatWatchTime(totalWatchTime)}
              </Text>
              <Text style={styles.metricSubtext}>
                Based on {videoData.duration_seconds}s per view
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {/* Delete Button */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteVideo}
          >
            <Trash2 color="white" size={20} />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Delete Video</Text>
              <Text style={styles.actionSubtext}>
                Refund: 🪙{getRefundInfo().refundAmount} ({getRefundInfo().refundPercentage}%)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Repromote Toggle */}
          <View style={styles.repromoteSection}>
            <View style={styles.repromoteHeader}>
              <Text style={styles.repromoteLabel}>Repromote</Text>
              <TouchableOpacity
                style={[styles.toggle, repromoteToggle && styles.toggleActive]}
                onPress={() => setRepromoteToggle(!repromoteToggle)}
              >
                <View style={[
                  styles.toggleThumb,
                  repromoteToggle && styles.toggleThumbActive
                ]} />
              </TouchableOpacity>
            </View>
            
            {repromoteToggle && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.repromoteButton]} 
                onPress={handleRepromoteVideo}
              >
                <RotateCcw color="white" size={20} />
                <View style={styles.actionContent}>
                  <Text style={styles.actionButtonText}>Reset & Repromote</Text>
                  <Text style={styles.actionSubtext}>
                    Reset views and start new 10-minute hold
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Information */}
        <View style={styles.statusInfoSection}>
          <Text style={styles.sectionTitle}>Status Information</Text>
          <View style={styles.statusInfoCard}>
            {videoData.status === 'on_hold' && (
              <View style={styles.statusMessage}>
                <Timer color="#F39C12" size={20} />
                <Text style={styles.statusMessageText}>
                  Video is pending and will enter the queue after the 10-minute hold period.
                </Text>
              </View>
            )}

            {videoData.status === 'active' && (
              <View style={styles.statusMessage}>
                <Play color="#2ECC71" size={20} />
                <Text style={styles.statusMessageText}>
                  Video is active and available in the view queue for users to watch.
                </Text>
              </View>
            )}

            {videoData.status === 'completed' && (
              <View style={styles.statusMessage}>
                <CheckCircle color="#3498DB" size={20} />
                <Text style={styles.statusMessageText}>
                  Video has reached its target views and is no longer in the queue.
                </Text>
              </View>
            )}

            {videoData.status === 'paused' && (
              <View style={styles.statusMessage}>
                <Pause color="#E74C3C" size={20} />
                <Text style={styles.statusMessageText}>
                  Video promotion is paused and not available in the view queue.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 143, 177, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#F48FB1',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 16,
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  videoId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  pendingCard: {
    backgroundColor: '#FFF8E1',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 8,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F39C12',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 4,
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
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
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  actionSection: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  repromoteButton: {
    backgroundColor: '#3498DB',
    marginTop: 8,
  },
  actionContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  repromoteSection: {
    backgroundColor: 'white',
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
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  repromoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repromoteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3498DB',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  statusInfoSection: {
    margin: 16,
    marginBottom: 32,
  },
  statusInfoCard: {
    backgroundColor: 'white',
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
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});