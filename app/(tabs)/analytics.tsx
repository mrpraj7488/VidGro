import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Video, Coins, ChevronDown, ChevronUp, CreditCard as Edit3, Trash2, RotateCcw, Eye, Clock, TrendingUp, Activity, Menu, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface AnalyticsData {
  totalVideosPromoted: number;
  totalCoinsEarned: number;
  recentActivities: any[];
  promotedVideos: any[];
}

interface PromotedVideo {
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
  total_watch_time: number;
  engagement_rate: number;
  hold_until?: string;
}

interface VideoAnalytics {
  totalViews: number;
  totalWatchTime: number;
  engagementRate: number;
  averageWatchTime: number;
}

export default function AnalyticsTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVideosPromoted: 0,
    totalCoinsEarned: 0,
    recentActivities: [],
    promotedVideos: [],
  });
  const [loading, setLoading] = useState(true);
  const [showMoreVideos, setShowMoreVideos] = useState(false);
  const [showMoreActivities, setShowMoreActivities] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PromotedVideo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoAnalytics, setVideoAnalytics] = useState<VideoAnalytics | null>(null);

  // Animation values
  const videosHeight = useSharedValue(0);
  const activitiesHeight = useSharedValue(0);
  const coinBounce = useSharedValue(1);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      // Set up real-time updates for video status changes
      const interval = setInterval(checkVideoHoldStatus, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch promoted videos with analytics
      const { data: promotedVideos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          video_views(watched_duration, completed, created_at)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Calculate analytics for each video
      const videosWithAnalytics = promotedVideos?.map(video => {
        const views = video.video_views || [];
        const totalWatchTime = views.reduce((sum: number, view: any) => sum + view.watched_duration, 0);
        const completedViews = views.filter((view: any) => view.completed).length;
        const engagementRate = video.views_count > 0 ? (completedViews / video.views_count) * 100 : 0;

        return {
          ...video,
          total_watch_time: totalWatchTime,
          engagement_rate: engagementRate,
        };
      }) || [];

      // Fetch coin transactions for recent activities
      const { data: transactions, error: transactionsError } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;

      // Calculate totals
      const totalVideosPromoted = videosWithAnalytics.length;
      const totalCoinsEarned = transactions
        ?.filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      setAnalytics({
        totalVideosPromoted,
        totalCoinsEarned,
        recentActivities: transactions || [],
        promotedVideos: videosWithAnalytics,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkVideoHoldStatus = async () => {
    if (!user) return;

    try {
      const { data: heldVideos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'on_hold');

      if (error) throw error;

      for (const video of heldVideos || []) {
        const holdUntil = new Date(video.hold_until || video.created_at);
        holdUntil.setMinutes(holdUntil.getMinutes() + 10);

        if (new Date() >= holdUntil) {
          // Release video to queue
          await supabase
            .from('videos')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', video.id);

          console.log(`Video ${video.youtube_url} released to queue after 10-minute hold`);
        }
      }

      // Refresh analytics to show updated status
      fetchAnalytics();
    } catch (error) {
      console.error('Error checking video hold status:', error);
    }
  };

  const handleEditVideo = async (video: PromotedVideo) => {
    setSelectedVideo(video);
    
    // Fetch detailed analytics for this video
    const { data: views, error } = await supabase
      .from('video_views')
      .select('*')
      .eq('video_id', video.id);

    if (!error && views) {
      const totalViews = views.length;
      const totalWatchTime = views.reduce((sum, view) => sum + view.watched_duration, 0);
      const completedViews = views.filter(view => view.completed).length;
      const engagementRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;
      const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

      setVideoAnalytics({
        totalViews,
        totalWatchTime,
        engagementRate,
        averageWatchTime,
      });
    }

    setShowVideoModal(true);
  };

  const handleDeleteVideo = async (video: PromotedVideo) => {
    const createdAt = new Date(video.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 80;
    const refundAmount = Math.floor((video.coin_cost * refundPercentage) / 100);

    const message = isWithin10Minutes 
      ? `Delete video and restore 100% coins (₡${refundAmount})?`
      : `Deleting video after 10 minutes: ${refundPercentage}% coins (₡${refundAmount}) will be restored. Confirm?`;

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
              // Delete video
              const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

              if (deleteError) throw deleteError;

              // Refund coins
              const { error: refundError } = await supabase
                .rpc('update_user_coins', {
                  user_uuid: user.id,
                  coin_amount: refundAmount,
                  transaction_type_param: 'admin_adjustment',
                  description_param: `Refund for deleted video: ${video.title} (${refundPercentage}%)`,
                  reference_uuid: video.id
                });

              if (refundError) throw refundError;

              // Refresh data
              await refreshProfile();
              await fetchAnalytics();
              setShowVideoModal(false);

              // Animate coin update
              coinBounce.value = withSpring(1.2, {
                damping: 15,
                stiffness: 150,
              }, () => {
                coinBounce.value = withSpring(1);
              });

              Alert.alert('Success', `Video deleted and ₡${refundAmount} coins restored!`);
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleExtendVideo = async (video: PromotedVideo) => {
    Alert.alert(
      'Extend Video Promotion',
      'Reset views and extend promotion for this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: async () => {
            try {
              // Reset video stats and set to active
              const { error } = await supabase
                .from('videos')
                .update({
                  views_count: 0,
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', video.id);

              if (error) throw error;

              // Clear existing views for this video
              await supabase
                .from('video_views')
                .delete()
                .eq('video_id', video.id);

              await fetchAnalytics();
              setShowVideoModal(false);
              Alert.alert('Success', 'Video promotion extended successfully!');
            } catch (error) {
              console.error('Error extending video:', error);
              Alert.alert('Error', 'Failed to extend video promotion.');
            }
          }
        }
      ]
    );
  };

  const toggleVideosExpansion = () => {
    setShowMoreVideos(!showMoreVideos);
    videosHeight.value = withTiming(showMoreVideos ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  };

  const toggleActivitiesExpansion = () => {
    setShowMoreActivities(!showMoreActivities);
    activitiesHeight.value = withTiming(showMoreActivities ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#F39C12';
      case 'on_hold': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'ON HOLD';
      default: return status.toUpperCase();
    }
  };

  const videosAnimatedStyle = useAnimatedStyle(() => ({
    opacity: videosHeight.value,
    transform: [{ scaleY: videosHeight.value }],
  }));

  const activitiesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: activitiesHeight.value,
    transform: [{ scaleY: activitiesHeight.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const displayedVideos = showMoreVideos ? analytics.promotedVideos : analytics.promotedVideos.slice(0, 4);
  const displayedActivities = showMoreActivities ? analytics.recentActivities : analytics.recentActivities.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2C2C2C', '#3A3A3A']}
        style={styles.header}
      >
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Analytics</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>₡{profile?.coins || 0}</Text>
          <Coins color="#F48FB1" size={isSmallScreen ? 18 : 20} />
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Primary Metrics */}
        <View style={styles.metricsSection}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#FF4757' }]}>
              <Video color="white" size={24} />
            </View>
            <Text style={styles.metricValue}>{analytics.totalVideosPromoted}</Text>
            <Text style={styles.metricLabel}>Videos Promoted</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#2ECC71' }]}>
              <TrendingUp color="white" size={24} />
            </View>
            <Text style={styles.metricValue}>₡{analytics.totalCoinsEarned}</Text>
            <Text style={styles.metricLabel}>Coins Earned</Text>
          </View>
        </View>

        {/* Promoted Videos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promoted Videos</Text>
          <View style={styles.videosList}>
            {displayedVideos.map((video, index) => (
              <View key={video.id} style={styles.videoItem}>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.videoStats}>
                    {video.views_count}/{video.target_views} views • ₡{video.coin_reward}/view
                  </Text>
                  <View style={styles.videoMeta}>
                    <Text style={styles.videoDate}>
                      {formatDate(video.created_at)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(video.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEditVideo(video)}
                >
                  <Edit3 color="#F48FB1" size={20} />
                </TouchableOpacity>
              </View>
            ))}
            
            {analytics.promotedVideos.length > 4 && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={toggleVideosExpansion}
              >
                <Text style={styles.viewMoreText}>
                  {showMoreVideos ? 'View Less' : 'View More'}
                </Text>
                {showMoreVideos ? (
                  <ChevronUp color="#F48FB1" size={20} />
                ) : (
                  <ChevronDown color="#F48FB1" size={20} />
                )}
              </TouchableOpacity>
            )}
            
            {analytics.promotedVideos.length === 0 && (
              <View style={styles.emptyState}>
                <Video color="#999" size={48} />
                <Text style={styles.emptyStateText}>No promoted videos</Text>
                <Text style={styles.emptyStateSubtext}>
                  Go to the Promote tab to start promoting your videos
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activitiesList}>
            {displayedActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Activity color="#F48FB1" size={16} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription} numberOfLines={2}>
                    {activity.description}
                  </Text>
                  <Text style={styles.activityDate}>
                    {formatDate(activity.created_at)}
                  </Text>
                </View>
                <Text style={[
                  styles.activityAmount,
                  activity.amount > 0 ? styles.positiveAmount : styles.negativeAmount
                ]}>
                  {activity.amount > 0 ? '+' : ''}₡{Math.abs(activity.amount)}
                </Text>
              </View>
            ))}
            
            {analytics.recentActivities.length > 3 && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={toggleActivitiesExpansion}
              >
                <Text style={styles.viewMoreText}>
                  {showMoreActivities ? 'View Less' : 'View More'}
                </Text>
                {showMoreActivities ? (
                  <ChevronUp color="#F48FB1" size={20} />
                ) : (
                  <ChevronDown color="#F48FB1" size={20} />
                )}
              </TouchableOpacity>
            )}
            
            {analytics.recentActivities.length === 0 && (
              <View style={styles.emptyState}>
                <Activity color="#999" size={48} />
                <Text style={styles.emptyStateText}>No recent activity</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start watching or promoting videos to see your activity
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Video Details Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Video Analytics</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowVideoModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {selectedVideo && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.videoTitleModal} numberOfLines={3}>
                {selectedVideo.title}
              </Text>
              
              {/* Analytics Cards */}
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Eye color="#3498DB" size={24} />
                  <Text style={styles.analyticsValue}>
                    {videoAnalytics?.totalViews || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>Total Views</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Clock color="#F39C12" size={24} />
                  <Text style={styles.analyticsValue}>
                    {formatDuration(videoAnalytics?.totalWatchTime || 0)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Watch Time</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <TrendingUp color="#2ECC71" size={24} />
                  <Text style={styles.analyticsValue}>
                    {(videoAnalytics?.engagementRate || 0).toFixed(1)}%
                  </Text>
                  <Text style={styles.analyticsLabel}>Engagement</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Activity color="#E74C3C" size={24} />
                  <Text style={styles.analyticsValue}>
                    {formatDuration(videoAnalytics?.averageWatchTime || 0)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Avg. Watch</Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {selectedVideo.status === 'completed' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.extendButton]}
                    onPress={() => handleExtendVideo(selectedVideo)}
                  >
                    <RotateCcw color="white" size={20} />
                    <Text style={styles.actionButtonText}>Extend Promotion</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteVideo(selectedVideo)}
                >
                  <Trash2 color="white" size={20} />
                  <Text style={styles.actionButtonText}>Delete Video</Text>
                </TouchableOpacity>
              </View>
              
              {/* Status Info */}
              <View style={styles.statusInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedVideo.status) }]} />
                <Text style={styles.statusInfoText}>
                  Status: {getStatusText(selectedVideo.status)}
                </Text>
              </View>
              
              {selectedVideo.status === 'on_hold' && (
                <View style={styles.holdInfo}>
                  <AlertTriangle color="#F39C12" size={20} />
                  <Text style={styles.holdInfoText}>
                    Video is on hold for 10 minutes before entering the view queue
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
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
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  metricsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
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
  metricIcon: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  videosList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
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
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoDate: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#F48FB1',
    fontWeight: '500',
    marginRight: 8,
  },
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#2ECC71',
  },
  negativeAmount: {
    color: '#E74C3C',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#F48FB1',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  videoTitleModal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  analyticsCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  extendButton: {
    backgroundColor: '#2ECC71',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  holdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    gap: 12,
  },
  holdInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
  },
});