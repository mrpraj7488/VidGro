import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Video, Coins, ChevronDown, ChevronUp, CreditCard as Edit3, Trash2, RotateCcw, Eye, Clock, TrendingUp, Activity, Menu, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Play, Pause, Timer, ChartBar as BarChart3, DollarSign } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing,
  withSequence
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface AnalyticsData {
  totalVideosPromoted: number;
  totalCoinsEarned: number;
  recentActivities: any[];
  promotedVideos: PromotedVideo[];
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
  hold_until?: string;
  total_watch_time: number;
  engagement_rate: number;
  completion_rate: number;
  average_watch_time: number;
  video_views?: any[];
}

interface VideoAnalytics {
  totalViews: number;
  totalWatchTime: number;
  engagementRate: number;
  averageWatchTime: number;
  completionRate: number;
  coinsEarned: number;
  viewsRemaining: number;
  estimatedCompletion: string;
  minutesSinceCreation: number;
  canDelete: boolean;
  refundPercentage: number;
  refundAmount: number;
}

export default function AnalyticsTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVideosPromoted: 0,
    totalCoinsEarned: 0,
    recentActivities: [],
    promotedVideos: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMoreVideos, setShowMoreVideos] = useState(false);
  const [showMoreActivities, setShowMoreActivities] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PromotedVideo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoAnalytics, setVideoAnalytics] = useState<VideoAnalytics | null>(null);
  const [holdTimers, setHoldTimers] = useState<{[key: string]: number}>({});

  // Animation values
  const videosHeight = useSharedValue(0);
  const activitiesHeight = useSharedValue(0);
  const coinBounce = useSharedValue(1);
  const refreshRotation = useSharedValue(0);

  // Auto-refresh and real-time updates
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchAnalytics();
        const interval = setInterval(() => {
          checkVideoHoldStatus();
          updateHoldTimers();
        }, 30000); // Check every 30 seconds
        
        return () => clearInterval(interval);
      }
    }, [user])
  );

  const fetchAnalytics = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
        refreshRotation.value = withTiming(360, { duration: 1000 });
      } else {
        setLoading(true);
      }

      // Fetch promoted videos with detailed analytics
      const { data: promotedVideos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          video_views(
            id,
            watched_duration,
            completed,
            coins_earned,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Calculate comprehensive analytics for each video
      const videosWithAnalytics = promotedVideos?.map(video => {
        const views = video.video_views || [];
        const totalWatchTime = views.reduce((sum: number, view: any) => sum + view.watched_duration, 0);
        const completedViews = views.filter((view: any) => view.completed).length;
        const totalViews = views.length;
        const engagementRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;
        const coinsEarned = views.reduce((sum: number, view: any) => sum + view.coins_earned, 0);
        const completionRate = video.target_views > 0 ? (video.views_count / video.target_views) * 100 : 0;
        const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

        return {
          ...video,
          total_watch_time: totalWatchTime,
          engagement_rate: engagementRate,
          completion_rate: completionRate,
          average_watch_time: averageWatchTime,
          video_views: views,
        };
      }) || [];

      // Fetch all coin transactions for comprehensive activity tracking
      const { data: transactions, error: transactionsError } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;

      // Calculate comprehensive totals
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

      // Update hold timers for videos on hold
      const holdVideos = videosWithAnalytics.filter(v => v.status === 'on_hold');
      const newHoldTimers: {[key: string]: number} = {};
      holdVideos.forEach(video => {
        const holdUntil = new Date(video.hold_until || video.created_at);
        holdUntil.setMinutes(holdUntil.getMinutes() + 10);
        const remainingMs = holdUntil.getTime() - new Date().getTime();
        newHoldTimers[video.id] = Math.max(0, Math.floor(remainingMs / 1000));
      });
      setHoldTimers(newHoldTimers);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshRotation.value = 0;
    }
  };

  const checkVideoHoldStatus = async () => {
    if (!user) return;

    try {
      // Call the database function to release videos from hold
      const { data, error } = await supabase.rpc('release_videos_from_hold');
      
      if (error) throw error;
      
      if (data > 0) {
        console.log(`Released ${data} videos from hold to queue`);
        // Refresh analytics to show updated status
        fetchAnalytics();
        // Clear video queue to force refresh with new videos
        clearQueue();
      }
    } catch (error) {
      console.error('Error checking video hold status:', error);
    }
  };

  const updateHoldTimers = () => {
    setHoldTimers(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      Object.keys(updated).forEach(videoId => {
        if (updated[videoId] > 0) {
          updated[videoId] -= 30; // Decrease by 30 seconds
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  };

  const calculateVideoAnalytics = (video: PromotedVideo): VideoAnalytics => {
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
    
    // Estimate completion time based on current rate
    let estimatedCompletion = 'Unknown';
    if (video.views_count > 0 && viewsRemaining > 0) {
      const daysSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
      const viewsPerDay = video.views_count / Math.max(daysSinceCreated, 1);
      const daysToComplete = viewsRemaining / Math.max(viewsPerDay, 1);
      
      if (daysToComplete < 1) {
        estimatedCompletion = `${Math.ceil(daysToComplete * 24)} hours`;
      } else if (daysToComplete < 7) {
        estimatedCompletion = `${Math.ceil(daysToComplete)} days`;
      } else {
        estimatedCompletion = `${Math.ceil(daysToComplete / 7)} weeks`;
      }
    }

    return {
      totalViews,
      totalWatchTime,
      engagementRate,
      averageWatchTime,
      completionRate,
      coinsEarned,
      viewsRemaining,
      estimatedCompletion,
      minutesSinceCreation,
      canDelete: true,
      refundPercentage,
      refundAmount,
    };
  };

  const handleEditVideo = async (video: PromotedVideo) => {
    setSelectedVideo(video);
    const analytics = calculateVideoAnalytics(video);
    setVideoAnalytics(analytics);
    setShowVideoModal(true);
  };

  const handleDeleteVideo = async (video: PromotedVideo) => {
    if (!videoAnalytics) return;

    const { refundPercentage, refundAmount, minutesSinceCreation } = videoAnalytics;
    const isWithin10Minutes = minutesSinceCreation <= 10;
    
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
              // Use the enhanced deletion function
              const { data: success, error: deleteError } = await supabase
                .rpc('delete_video_with_refund', {
                  video_uuid: video.id,
                  user_uuid: user.id
                });

              if (deleteError) throw deleteError;

              if (success) {
                // Refresh data
                await refreshProfile();
                await fetchAnalytics();
                setShowVideoModal(false);

                // Clear video queue to remove deleted video
                clearQueue();

                // Animate coin update
                coinBounce.value = withSequence(
                  withSpring(1.3, { damping: 15, stiffness: 150 }),
                  withSpring(1, { damping: 15, stiffness: 150 })
                );

                Alert.alert('Success', `Video deleted and ₡${refundAmount} coins restored!`);
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

  const handleExtendVideo = async (video: PromotedVideo) => {
    Alert.alert(
      'Extend Video Promotion',
      'Reset views and extend promotion for this video? This will clear all existing views and restart the promotion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: async () => {
            try {
              // Use the enhanced extension function
              const { data: success, error } = await supabase
                .rpc('extend_video_promotion', {
                  video_uuid: video.id,
                  user_uuid: user.id
                });

              if (error) throw error;

              if (success) {
                await fetchAnalytics();
                setShowVideoModal(false);
                
                // Clear video queue to refresh with extended video
                clearQueue();
                
                Alert.alert('Success', 'Video promotion extended successfully!');
              } else {
                throw new Error('Failed to extend video promotion');
              }
            } catch (error) {
              console.error('Error extending video:', error);
              Alert.alert('Error', 'Failed to extend video promotion.');
            }
          }
        }
      ]
    );
  };

  const handlePauseResumeVideo = async (video: PromotedVideo) => {
    const newStatus = video.status === 'active' ? 'paused' : 'active';
    const action = newStatus === 'active' ? 'Resume' : 'Pause';
    
    Alert.alert(
      `${action} Video`,
      `${action} promotion for this video?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('videos')
                .update({ 
                  status: newStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', video.id)
                .eq('user_id', user.id);

              if (error) throw error;

              await fetchAnalytics();
              setShowVideoModal(false);
              
              // Clear video queue to refresh status
              clearQueue();
              
              Alert.alert('Success', `Video ${action.toLowerCase()}d successfully!`);
            } catch (error) {
              console.error(`Error ${action.toLowerCase()}ing video:`, error);
              Alert.alert('Error', `Failed to ${action.toLowerCase()} video.`);
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

  const formatHoldTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
      case 'on_hold': return 'PENDING';
      default: return status.toUpperCase();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'video_watch': return <Eye color="#4ECDC4" size={16} />;
      case 'video_promotion': return <Video color="#FF4757" size={16} />;
      case 'purchase': return <DollarSign color="#FFA726" size={16} />;
      case 'admin_adjustment': return <BarChart3 color="#9B59B6" size={16} />;
      default: return <Activity color="#666" size={16} />;
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

  const refreshAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
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

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnalytics(true)}
            tintColor="#F48FB1"
            colors={['#F48FB1']}
          />
        }
      >
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promoted Videos</Text>
            <TouchableOpacity onPress={() => fetchAnalytics(true)}>
              <Animated.View style={refreshAnimatedStyle}>
                <RotateCcw color="#F48FB1" size={20} />
              </Animated.View>
            </TouchableOpacity>
          </View>
          
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
                    <View style={styles.videoStatusContainer}>
                      {video.status === 'on_hold' && holdTimers[video.id] && (
                        <View style={styles.holdTimer}>
                          <Timer color="#E74C3C" size={12} />
                          <Text style={styles.holdTimerText}>
                            {formatHoldTimer(holdTimers[video.id])}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
                        <Text style={styles.statusText}>
                          {getStatusText(video.status)}
                        </Text>
                      </View>
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
                  {showMoreVideos ? 'View Less' : `View More (${analytics.promotedVideos.length - 4})`}
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
                  {getActivityIcon(activity.transaction_type)}
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
                  {showMoreActivities ? 'View Less' : `View More (${analytics.recentActivities.length - 3})`}
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

      {/* Enhanced Video Details Modal */}
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
          
          {selectedVideo && videoAnalytics && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.videoTitleModal} numberOfLines={3}>
                {selectedVideo.title}
              </Text>
              
              {/* Comprehensive Analytics Grid */}
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Eye color="#3498DB" size={24} />
                  <Text style={styles.analyticsValue}>
                    {videoAnalytics.totalViews}
                  </Text>
                  <Text style={styles.analyticsLabel}>Total Views</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Clock color="#F39C12" size={24} />
                  <Text style={styles.analyticsValue}>
                    {formatDuration(videoAnalytics.totalWatchTime)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Watch Time</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <TrendingUp color="#2ECC71" size={24} />
                  <Text style={styles.analyticsValue}>
                    {videoAnalytics.engagementRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.analyticsLabel}>Engagement</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Activity color="#E74C3C" size={24} />
                  <Text style={styles.analyticsValue}>
                    {formatDuration(videoAnalytics.averageWatchTime)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Avg. Watch</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <BarChart3 color="#9B59B6" size={24} />
                  <Text style={styles.analyticsValue}>
                    {videoAnalytics.completionRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.analyticsLabel}>Completion</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Coins color="#FFA726" size={24} />
                  <Text style={styles.analyticsValue}>
                    ₡{videoAnalytics.coinsEarned}
                  </Text>
                  <Text style={styles.analyticsLabel}>Earned</Text>
                </View>
              </View>

              {/* Progress Information */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Progress Information</Text>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Views Remaining:</Text>
                  <Text style={styles.progressValue}>{videoAnalytics.viewsRemaining}</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Estimated Completion:</Text>
                  <Text style={styles.progressValue}>{videoAnalytics.estimatedCompletion}</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Time Since Creation:</Text>
                  <Text style={styles.progressValue}>{videoAnalytics.minutesSinceCreation} minutes</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Deletion Refund:</Text>
                  <Text style={styles.progressValue}>₡{videoAnalytics.refundAmount} ({videoAnalytics.refundPercentage}%)</Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {selectedVideo.status === 'active' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.pauseButton]}
                    onPress={() => handlePauseResumeVideo(selectedVideo)}
                  >
                    <Pause color="white" size={20} />
                    <Text style={styles.actionButtonText}>Pause Promotion</Text>
                  </TouchableOpacity>
                )}

                {selectedVideo.status === 'paused' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.resumeButton]}
                    onPress={() => handlePauseResumeVideo(selectedVideo)}
                  >
                    <Play color="white" size={20} />
                    <Text style={styles.actionButtonText}>Resume Promotion</Text>
                  </TouchableOpacity>
                )}
                
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
              
              {/* Enhanced Status Info */}
              <View style={styles.statusInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedVideo.status) }]} />
                <Text style={styles.statusInfoText}>
                  Status: {getStatusText(selectedVideo.status)}
                </Text>
              </View>
              
              {selectedVideo.status === 'on_hold' && holdTimers[selectedVideo.id] && (
                <View style={styles.holdInfo}>
                  <AlertTriangle color="#F39C12" size={20} />
                  <Text style={styles.holdInfoText}>
                    Video is pending for {formatHoldTimer(holdTimers[selectedVideo.id])} before entering the view queue
                  </Text>
                </View>
              )}

              {selectedVideo.status === 'completed' && (
                <View style={styles.completedInfo}>
                  <CheckCircle color="#2ECC71" size={20} />
                  <Text style={styles.completedInfoText}>
                    Video has reached its target views and is no longer in the queue
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
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
  videoStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  holdTimerText: {
    fontSize: 10,
    color: '#E74C3C',
    fontWeight: '600',
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
  progressSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  pauseButton: {
    backgroundColor: '#F39C12',
  },
  resumeButton: {
    backgroundColor: '#2ECC71',
  },
  extendButton: {
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
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    gap: 12,
  },
  completedInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});