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
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { Video, ChevronDown, ChevronUp, CreditCard as Edit3, RotateCcw, Eye, Clock, Timer, Activity, DollarSign, Play } from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
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

export default function AnalyticsTab() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const [menuVisible, setMenuVisible] = useState(false);
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
        let holdUntilTime: Date;
        
        if (video.hold_until) {
          // Use the exact hold_until timestamp from database
          holdUntilTime = new Date(video.hold_until);
        } else {
          // Fallback: calculate exactly 10 minutes from creation
          holdUntilTime = new Date(video.created_at);
          holdUntilTime.setMinutes(holdUntilTime.getMinutes() + 10);
        }
        
        const remainingMs = holdUntilTime.getTime() - new Date().getTime();
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
        // Log status changes
        analytics.promotedVideos
          .filter(v => v.status === 'on_hold')
          .slice(0, data)
          .forEach(video => {
            console.log(`Video ${video.youtube_url} released to Active after 10 minutes`);
          });
        
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
          updated[videoId] = Math.max(0, updated[videoId] - 30); // Decrease by 30 seconds, don't go below 0
          hasChanges = true;
        } else if (updated[videoId] === 0) {
          // Remove completed timers
          delete updated[videoId];
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  };

  const handleEditVideo = (video: PromotedVideo) => {
    // Navigate to edit video screen with video data
    router.push({
      pathname: '/edit-video',
      params: {
        videoId: video.id,
        videoData: JSON.stringify(video)
      }
    });
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

  const formatHoldTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      case 'repromoted': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'PENDING';
      case 'repromoted': return 'REPROMOTED';
      default: return status.toUpperCase();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'video_watch': return <Eye color="#4ECDC4" size={16} />;
      case 'video_promotion': return <Video color="#FF4757" size={16} />;
      case 'purchase': return <DollarSign color="#FFA726" size={16} />;
      case 'admin_adjustment': return <Activity color="#9B59B6" size={16} />;
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
      <GlobalHeader title="Analytics" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnalytics(true)}
            tintColor="#800080"
            colors={['#800080']}
          />
        }
      >
        {/* Primary Metrics */}
        <View style={styles.metricsSection}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: '#FF4757' }]}>
              <Video color="white" size={24} />
            </View>
            <Text style={styles.metricValue}>{String(analytics.totalVideosPromoted)}</Text>
            <Text style={styles.metricLabel}>Videos Promoted</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Animated.View style={[styles.metricIcon, { backgroundColor: '#2ECC71' }, coinAnimatedStyle]}>
              <Text style={styles.coinIcon}>🪙</Text>
            </Animated.View>
            <Text style={styles.metricValue}>{`🪙${String(analytics.totalCoinsEarned)}`}</Text>
            <Text style={styles.metricLabel}>Coins Earned</Text>
          </View>
        </View>

        {/* Promoted Videos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promoted Videos</Text>
            <TouchableOpacity onPress={() => fetchAnalytics(true)}>
              <Animated.View style={refreshAnimatedStyle}>
                <RotateCcw color="#800080" size={20} />
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
                    {video.views_count}/{video.target_views} views
                  </Text>
                  <View style={styles.videoMeta}>
                    <Text style={styles.videoDate}>
                      {formatDate(video.created_at)}
                    </Text>
                    <View style={styles.videoStatusContainer}>
                      {video.status === 'on_hold' && holdTimers[video.id] && (
                        <View style={styles.holdTimer}>
                          <Timer color="#F39C12" size={12} />
                          <Text style={styles.holdTimerText}>
                            {formatHoldTimer(holdTimers[video.id])}
                          </Text>
                        </View>
                      )}
                      {video.status === 'repromoted' && (
                        <View style={styles.repromoteIndicator}>
                          <Play color="#9B59B6" size={12} />
                          <Text style={styles.repromoteText}>REPROMOTED</Text>
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
                  <Edit3 color="#800080" size={20} />
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
                  <ChevronUp color="#800080" size={20} />
                ) : (
                  <ChevronDown color="#800080" size={20} />
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
                  {activity.amount > 0 ? '+' : ''}🪙{Math.abs(activity.amount)}
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
                  <ChevronUp color="#800080" size={20} />
                ) : (
                  <ChevronDown color="#800080" size={20} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  coinIcon: {
    fontSize: 24,
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
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  holdTimerText: {
    fontSize: 10,
    color: '#F39C12',
    fontWeight: '600',
  },
  repromoteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  repromoteText: {
    fontSize: 9,
    color: '#9B59B6',
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
    color: '#800080',
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
});