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
import { ArrowLeft, Eye, Clock, TrendingUp, Activity, ChartBar as BarChart3, Trash2, RotateCcw, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Timer, Play, Pause } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoAnalytics {
  totalViews: number;
  completedViews: number;
  totalWatchTime: number;
  engagementRate: number;
  completionRate: number;
  averageWatchTime: number;
  coinsEarned: number;
  viewsRemaining: number;
  estimatedCompletionDays: number;
  minutesSinceCreation: number;
  canDelete: boolean;
  refundPercentage: number;
  refundAmount: number;
}

export default function EditVideoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const params = useLocalSearchParams();
  const [videoData, setVideoData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const coinBounce = useSharedValue(1);

  useEffect(() => {
    if (params.videoData) {
      try {
        const video = JSON.parse(params.videoData as string);
        setVideoData(video);
        calculateAnalytics(video);
      } catch (error) {
        console.error('Error parsing video data:', error);
        router.back();
      }
    }
  }, [params.videoData]);

  const calculateAnalytics = (video: any) => {
    const views = video.video_views || [];
    const totalViews = views.length;
    const completedViews = views.filter((view: any) => view.completed).length;
    const totalWatchTime = views.reduce((sum: number, view: any) => sum + view.watched_duration, 0);
    const coinsEarned = views.reduce((sum: number, view: any) => sum + view.coins_earned, 0);
    const engagementRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;
    const completionRate = video.target_views > 0 ? (video.views_count / video.target_views) * 100 : 0;
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const viewsRemaining = Math.max(0, video.target_views - video.views_count);

    // Calculate time since creation
    const createdTime = new Date(video.created_at);
    const now = new Date();
    const minutesSinceCreation = Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));

    // Calculate refund information
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 80;
    const refundAmount = Math.floor((video.coin_cost * refundPercentage) / 100);

    // Estimate completion time
    let estimatedCompletionDays = -1;
    if (video.views_count > 0 && viewsRemaining > 0) {
      const daysSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
      const viewsPerDay = video.views_count / Math.max(daysSinceCreated, 1);
      if (viewsPerDay > 0) {
        estimatedCompletionDays = viewsRemaining / viewsPerDay;
      }
    }

    setAnalytics({
      totalViews,
      completedViews,
      totalWatchTime,
      engagementRate,
      completionRate,
      averageWatchTime,
      coinsEarned,
      viewsRemaining,
      estimatedCompletionDays,
      minutesSinceCreation,
      canDelete: true,
      refundPercentage,
      refundAmount,
    });

    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatEstimatedCompletion = (days: number) => {
    if (days < 0) return 'Unknown';
    if (days < 1) return `${Math.ceil(days * 24)} hours`;
    if (days < 7) return `${Math.ceil(days)} days`;
    return `${Math.ceil(days / 7)} weeks`;
  };

  const handleDeleteVideo = async () => {
    if (!videoData || !analytics || !user) return;

    const message = analytics.minutesSinceCreation <= 10
      ? `Delete video and restore 100% coins (🪙${analytics.refundAmount})?`
      : `Deleting video after 10 minutes: ${analytics.refundPercentage}% coins (🪙${analytics.refundAmount}) will be restored. Confirm?`;

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
                console.log(`Video ${videoData.youtube_url} deleted with ${analytics.refundPercentage}% refund`);

                // Refresh profile and clear queue
                await refreshProfile();
                clearQueue();

                // Animate coin update
                coinBounce.value = withSequence(
                  withSpring(1.3, { damping: 15, stiffness: 150 }),
                  withSpring(1, { damping: 15, stiffness: 150 })
                );

                Alert.alert('Success', `Video deleted and 🪙${analytics.refundAmount} coins restored!`, [
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

  if (loading || !videoData || !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading video analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Video</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Info */}
        <View style={styles.videoInfoCard}>
          <Text style={styles.videoTitle} numberOfLines={3}>
            {videoData.title}
          </Text>
          <Text style={styles.videoUrl}>ID: {videoData.youtube_url}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(videoData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(videoData.status)}</Text>
            </View>
            <Text style={styles.videoDate}>
              Created: {new Date(videoData.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Analytics Grid */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Video Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Eye color="#3498DB" size={24} />
              <Text style={styles.analyticsValue}>{analytics.totalViews}</Text>
              <Text style={styles.analyticsLabel}>Total Views</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Clock color="#F39C12" size={24} />
              <Text style={styles.analyticsValue}>{formatDuration(analytics.totalWatchTime)}</Text>
              <Text style={styles.analyticsLabel}>Watch Time</Text>
            </View>

            <View style={styles.analyticsCard}>
              <TrendingUp color="#2ECC71" size={24} />
              <Text style={styles.analyticsValue}>{analytics.engagementRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Engagement</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Activity color="#E74C3C" size={24} />
              <Text style={styles.analyticsValue}>{formatDuration(analytics.averageWatchTime)}</Text>
              <Text style={styles.analyticsLabel}>Avg. Watch</Text>
            </View>

            <View style={styles.analyticsCard}>
              <BarChart3 color="#9B59B6" size={24} />
              <Text style={styles.analyticsValue}>{analytics.completionRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Completion</Text>
            </View>

            <View style={styles.analyticsCard}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.analyticsValue}>🪙{analytics.coinsEarned}</Text>
              <Text style={styles.analyticsLabel}>Earned</Text>
            </View>
          </View>
        </View>

        {/* Progress Information */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progress Information</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Views Remaining:</Text>
              <Text style={styles.progressValue}>{analytics.viewsRemaining}</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Estimated Completion:</Text>
              <Text style={styles.progressValue}>
                {formatEstimatedCompletion(analytics.estimatedCompletionDays)}
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Time Since Creation:</Text>
              <Text style={styles.progressValue}>{analytics.minutesSinceCreation} minutes</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Deletion Refund:</Text>
              <Text style={styles.progressValue}>
                🪙{analytics.refundAmount} ({analytics.refundPercentage}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {videoData.status === 'completed' && (
            <TouchableOpacity style={[styles.actionButton, styles.repromoteButton]} onPress={handleRepromoteVideo}>
              <RotateCcw color="white" size={20} />
              <Text style={styles.actionButtonText}>Repromote Video</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteVideo}>
            <Trash2 color="white" size={20} />
            <Text style={styles.actionButtonText}>Delete Video</Text>
          </TouchableOpacity>
        </View>

        {/* Status Information */}
        <View style={styles.statusInfoSection}>
          <Text style={styles.sectionTitle}>Status Information</Text>
          <View style={styles.statusInfoCard}>
            <View style={styles.statusInfoHeader}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(videoData.status) }]} />
              <Text style={styles.statusInfoTitle}>Current Status: {getStatusText(videoData.status)}</Text>
            </View>

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
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: 'white',
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
  videoInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  videoUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  statusContainer: {
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
  videoDate: {
    fontSize: 12,
    color: '#666',
  },
  analyticsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  coinIcon: {
    fontSize: 24,
  },
  analyticsValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressSection: {
    margin: 16,
  },
  progressCard: {
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
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionSection: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  repromoteButton: {
    backgroundColor: '#3498DB',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  statusInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  statusMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});