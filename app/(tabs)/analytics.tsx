import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { useConfig } from '@/contexts/ConfigContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { ChartBar as BarChart3, Eye, Coins, Play, Pause, CircleCheck as CheckCircle, Timer, Pencil as Edit3, Activity, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getUserComprehensiveAnalytics, getUserVideosWithAnalytics, getUserRecentActivity } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

interface UserAnalytics {
  total_videos_promoted: number;
  total_coins_earned: number;
  active_videos: number;
  completed_videos: number;
  on_hold_videos: number;
  total_views_received: number;
  total_watch_time_received: number;
  total_coins_distributed: number;
  average_completion_rate: number;
  current_coins: number;
  repromoted_videos?: number;
  total_repromotes?: number;
}

interface RecentActivity {
  activity_type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface VideoAnalytics {
  video_id: string;
  title: string;
  views_count: number;
  target_views: number;
  status: string;
  created_at: string;
  coin_cost: number;
  completion_rate: number;
  completed: boolean;
  total_watch_time: number;
  coins_earned_total: number;
  repromote_count?: number;
  last_repromoted_at?: string;
  repromote_cost?: number;
  is_repromoted?: boolean;
  can_repromote?: boolean;
  estimated_repromote_cost?: number;
}

export default function Analytics() {
  const { user, profile, loading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { config } = useConfig();
  const analyticsEnabled = useFeatureFlag('analyticsEnabled');
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [videos, setVideos] = useState<VideoAnalytics[]>([]);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    analytics: true,
    videos: true,
    activity: true
  });
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    if (user?.id) {
      // Check if analytics are enabled
      if (!analyticsEnabled) {
        // Gracefully show empty analytics instead of an infinite loading skeleton
        const emptyAnalytics = {
          current_coins: profile?.coins || 0,
          total_videos_promoted: 0,
          completed_videos: 0,
          total_views_received: 0,
          total_watch_time_received: 0,
          total_coins_distributed: 0,
          average_completion_rate: 0,
          active_videos: 0,
          on_hold_videos: 0,
          total_coins_earned: 0,
        };
        setAnalytics(emptyAnalytics);
        setVideos([]);
        setRecentActivity([]);
        setLoadingStates({ analytics: false, videos: false, activity: false });
        setLoading(false);
        return;
      }
      
      // Initialize with timeout protection
      const initTimeout = setTimeout(() => {
        if (loading) {
          console.warn('Analytics loading timeout - showing fallback data');
          setHasError(true);
          setLoadingStates({ analytics: false, videos: false, activity: false });
          setLoading(false);
        }
      }, 10000); // 10 second timeout
      
      fetchAnalytics().finally(() => {
        clearTimeout(initTimeout);
      });
      
      // Reduced interval for better performance (30 seconds instead of 5)
      const statusCheckInterval = setInterval(async () => {
        if (!loading && !refreshing) {
          try {
            const supabase = getSupabase();
            if (supabase) {
              const { data: updatedCount, error: holdsError } = await supabase.rpc('check_and_update_expired_holds');
              if (!holdsError && updatedCount && updatedCount > 0) {
                console.log(`${updatedCount} videos automatically activated from hold`);
                // Only refresh if not currently loading
                fetchAnalytics();
              }
            }
          } catch (error) {
            console.error('Error checking expired holds:', error);
          }
        }
      }, 30000); // Reduced to 30 seconds
      
      return () => {
        clearTimeout(initTimeout);
        clearInterval(statusCheckInterval);
      };
    }
  }, [user, analyticsEnabled]);

  const fetchAnalytics = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      setHasError(false);
      setLoadingStates({ analytics: true, videos: true, activity: true });

      // Use Promise.allSettled for concurrent loading with individual error handling
      const [analyticsResult, videosResult, activityResult] = await Promise.allSettled([
        getUserComprehensiveAnalytics(user.id),
        getUserVideosWithAnalytics(user.id),
        getUserRecentActivity(user.id)
      ]);

      // Handle analytics data
      if (analyticsResult.status === 'fulfilled') {
        const { data: analyticsData, error: analyticsError } = analyticsResult.value;

        if (analyticsError) {
          console.error('Analytics error:', analyticsError);
          // Use fallback analytics
          setAnalytics({
            current_coins: profile?.coins || 0,
            total_videos_promoted: 0,
            completed_videos: 0,
            total_views_received: 0,
            total_watch_time_received: 0,
            total_coins_distributed: 0,
            average_completion_rate: 0,
            active_videos: 0,
            on_hold_videos: 0,
            total_coins_earned: 0,
            repromoted_videos: 0
          });
        } else if (analyticsData) {
          // Extract the summary data from the response
          const summary = analyticsData.summary || {};
          // Count active videos properly - exclude completed and repromoted
          const activeCount = analyticsData.videos?.filter((v: any) => 
            v.status === 'active' && !v.completed && !v.is_repromoted
          ).length || 0;
          const repromoteCount = analyticsData.videos?.filter((v: any) => v.is_repromoted).length || 0;
          const completedCount = analyticsData.videos?.filter((v: any) => v.completed).length || 0;
          
          setAnalytics({
            current_coins: analyticsData.user?.coins || profile?.coins || 0,
            total_videos_promoted: summary.total_videos || 0,
            completed_videos: completedCount || summary.completed_videos || 0,
            total_views_received: summary.total_views || 0,
            total_watch_time_received: summary.total_watch_time_generated || 0,
            total_coins_distributed: summary.total_coins_spent || 0,
            average_completion_rate: summary.average_completion_rate || 0,
            active_videos: activeCount,
            on_hold_videos: summary.on_hold_videos || 0,
            total_coins_earned: summary.total_coins_earned || 0,
            repromoted_videos: repromoteCount
          });
        }
      } else {
        console.error('Analytics request failed:', analyticsResult.reason);
        setAnalytics({
          current_coins: profile?.coins || 0,
          total_videos_promoted: 0,
          completed_videos: 0,
          total_views_received: 0,
          total_watch_time_received: 0,
          total_coins_distributed: 0,
          average_completion_rate: 0,
          active_videos: 0,
          on_hold_videos: 0,
          total_coins_earned: 0,
          repromoted_videos: 0
        });
      }
      setLoadingStates(prev => ({ ...prev, analytics: false }));

      // Handle activity data
      if (activityResult.status === 'fulfilled') {
        const { data: activityData, error: activityError } = activityResult.value;
        if (activityError) {
          console.error('Recent activity error:', activityError);
          setRecentActivity([]);
        } else if (activityData) {
          // Ensure all activity items have the required fields
          const validActivityData = activityData.filter((activity: any) => 
            activity && 
            typeof activity === 'object' && 
            activity.activity_type && 
            typeof activity.amount === 'number' &&
            activity.description &&
            activity.created_at
          );
          setRecentActivity(validActivityData);
        } else {
          setRecentActivity([]);
        }
      } else {
        console.error('Activity request failed:', activityResult.reason);
        setRecentActivity([]);
      }
      setLoadingStates(prev => ({ ...prev, activity: false }));

      // Handle videos data
      if (videosResult.status === 'fulfilled') {
        const { data: videosData, error: videosError } = videosResult.value;
        if (videosError) {
          console.error('Videos error:', videosError);
          // Fallback to direct query
          try {
            const supabase = getSupabase();
            if (supabase) {
              const { data: directVideosData, error: directVideosError } = await supabase
                .from('videos')
                .select(`
                  id,
                  title,
                  views_count,
                  target_views,
                  status,
                  created_at,
                  coin_cost,
                  completed,
                  total_watch_time,
                  completion_rate,
                  coins_earned_total,
                  repromoted_at
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

              if (!directVideosError && directVideosData) {
                const videosWithCompletion = directVideosData.map((video: any) => ({
                  video_id: video.id,
                  title: video.title,
                  views_count: video.views_count,
                  target_views: video.target_views,
                  status: video.status,
                  created_at: video.created_at,
                  coin_cost: video.coin_cost || 0,
                  completion_rate: video.completion_rate || (video.target_views > 0 
                    ? Math.round((video.views_count / video.target_views) * 100)
                    : 0),
                  completed: video.completed,
                  total_watch_time: video.total_watch_time || 0,
                  coins_earned_total: video.coins_earned_total || 0,
                  repromote_count: 0, // Not tracked in database
                  last_repromoted_at: video.repromoted_at,
                  repromote_cost: 0, // Not tracked in database
                  is_repromoted: video.repromoted_at ? true : false
                }));
                setVideos(videosWithCompletion);
              } else {
                setVideos([]);
              }
            } else {
              setVideos([]);
            }
          } catch (fallbackError) {
            console.error('Fallback videos query failed:', fallbackError);
            setVideos([]);
          }
        } else if (videosData) {
          const transformedVideos = videosData.map((video: any) => ({
            video_id: video.video_id,
            title: video.title,
            views_count: video.views_count,
            target_views: video.target_views,
            status: video.status,
            created_at: video.created_at,
            coin_cost: video.coin_cost || 0,
            completion_rate: video.completion_rate || 0,
            completed: video.completed,
            total_watch_time: video.total_watch_time || 0,
            coins_earned_total: video.coins_earned_total || 0,
            repromote_count: video.repromote_count || 0,
            last_repromoted_at: video.last_repromoted_at || video.repromoted_at,
            repromote_cost: video.repromote_cost || 0,
            is_repromoted: video.is_repromoted || (video.last_repromoted_at ? true : false) || (video.repromoted_at ? true : false)
          }));
          setVideos(transformedVideos);
        } else {
          setVideos([]);
        }
      } else {
        console.error('Videos request failed:', videosResult.reason);
        setVideos([]);
      }
      setLoadingStates(prev => ({ ...prev, videos: false }));

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setHasError(true);
      setRetryCount(prev => prev + 1);
      
      // Don't show alert on first few failures, just log
      if (retryCount >= 2) {
        Alert.alert('Error', 'Unable to load analytics. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setLoadingStates({ analytics: false, videos: false, activity: false });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const getStatusColor = (status: string, isRepromoted?: boolean) => {
    if (isRepromoted) return '#9B59B6'; // Purple for repromoted videos
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getStatusIcon = (status: string, isRepromoted?: boolean) => {
    if (isRepromoted) return TrendingUp; // Trending up icon for repromoted
    switch (status) {
      case 'active': return Play;
      case 'completed': return CheckCircle;
      case 'paused': return Pause;
      case 'on_hold': return Timer;
      default: return Play;
    }
  };

  const formatTransactionType = (type: string) => {
    if (!type) return 'Unknown Transaction';
    
    switch (type) {
      case 'video_promotion': return 'Video Promotion';
      case 'purchase': return 'Coin Purchase';
      case 'referral_bonus': return 'Referral Bonus';
      case 'admin_adjustment': return 'Admin Adjustment';
      case 'vip_purchase': return 'VIP Purchase';
      case 'video_deletion_refund': return 'Video Deletion Refund';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleVideoPress = (video: VideoAnalytics) => {
    router.push({
      pathname: '/edit-video',
      params: { videoData: JSON.stringify(video) }
    });
  };

  const getDisplayedVideos = () => {
    return showAllVideos ? videos : videos.slice(0, 1);
  };

  const getDisplayedActivity = () => {
    return showAllActivity ? recentActivity : recentActivity.slice(0, 1);
  };

  const getRemainingCount = (total: number, displayed: number) => {
    return Math.max(0, total - displayed);
  };

  // Helper function to safely render strings
  const safeString = (value: any, fallback: string = '') => {
    if (value == null) return fallback;
    try {
      return String(value);
    } catch (e) {
      return fallback;
    }
  };
  
  // Helper function to safely render numbers
  const safeNumber = (value: any, fallback: number = 0) => {
    if (value == null) return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Show loading only on initial load, not on refresh
  if (authLoading || (loading && !refreshing)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          title="Analytics" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
          {hasError ? (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setHasError(false);
                fetchAnalytics();
              }}><Text style={[styles.retryButtonText, { color: 'white' }]}>Retry</Text></TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="Analytics" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Cards - Only 2 columns */}
        <View style={styles.overviewSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statHeader}>
                <Play size={20} color="#3498DB" />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Videos Promoted</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {safeNumber(analytics?.total_videos_promoted)}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statHeader}>
                <Coins size={20} color="#FFD700" />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coins Earned</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {safeNumber(analytics?.total_coins_earned)}
              </Text>
            </View>
          </View>
        </View>

        {/* Video Status Summary */}
        <View style={styles.statusSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#2ECC71' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.active_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#3498DB' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.completed_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Completed</Text>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#F39C12' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.on_hold_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>On Hold</Text>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#9B59B6' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.repromoted_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Repromoted</Text>
            </View>
          </View>
        </View>

        {/* Promoted Videos */}
        <View style={styles.videosSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Promoted Videos</Text>
            <BarChart3 size={20} color={colors.primary} />
          </View>
          
          {videos.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Play size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Videos Yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Start promoting your videos to see analytics here
              </Text>
            </View>
          ) : (<>{getDisplayedVideos().map((video) => {
                const StatusIcon = getStatusIcon(video.status, video.is_repromoted);
                const statusColor = getStatusColor(video.status, video.is_repromoted);
                const displayStatus = video.is_repromoted ? 'Repromoted' : video.status.charAt(0).toUpperCase() + video.status.slice(1);
                return (
                  <TouchableOpacity
                    key={video.video_id}
                    style={[styles.videoCard, { backgroundColor: colors.surface }]}
                    onPress={() => handleVideoPress(video)}>
                    <View style={styles.videoHeader}>
                      <View style={styles.videoTitleContainer}>
                        <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                          {safeString(video.title, 'Untitled Video')}
                        </Text>
                        <Text style={[styles.videoDate, { color: colors.textSecondary }]}>
                          {formatDate(video.created_at)}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.editButton}><View style={{ padding: 4 }}><Edit3 size={16} color={colors.textSecondary} /></View></TouchableOpacity>
                    </View>
                    <View style={styles.videoStats}>
                      <View style={styles.videoStat}>
                        <View style={{ marginRight: 4 }}>
                          <Eye size={16} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.videoStatText, { color: colors.textSecondary }]}>
                          {`${safeNumber(video.views_count)}/${safeNumber(video.target_views)}`}
                        </Text>
                      </View>
                      <View style={styles.videoStat}>
                        <View style={{ marginRight: 4 }}>
                          {React.createElement(StatusIcon, { size: 16, color: statusColor })}
                        </View>
                        <Text style={[styles.videoStatText, { color: statusColor }]}>
                          {displayStatus}
                        </Text>
                      </View>
                      {video.is_repromoted && video.repromote_count && video.repromote_count > 0 && (
                        <View style={styles.videoStat}>
                          <View style={{ marginRight: 4 }}>
                            <TrendingUp size={14} color="#9B59B6" />
                          </View>
                          <Text style={[styles.videoStatText, { color: '#9B59B6' }]}>
                            {`x${safeNumber(video.repromote_count)}`}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: isDark ? colors.border : colors.border }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${Math.min(safeNumber(video.completion_rate), 100)}%`,
                              backgroundColor: statusColor
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {`${safeNumber(video.completion_rate)}%`}
                      </Text>
                    </View>
                    <View style={styles.videoCosts}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={[styles.costText, { color: colors.textSecondary }]}>
                          {`Spent: 🪙${safeNumber(video.coin_cost)}`}
                        </Text>
                        {video.repromote_cost && video.repromote_cost > 0 && (
                          <Text style={[styles.repromoteText, { color: '#9B59B6', marginLeft: 4 }]}>
                            {`(+🪙${safeNumber(video.repromote_cost)} repromote)`}
                          </Text>
                        )}
                      </View>
                      {video.completed && (
                        <Text style={[styles.completedText, { color: colors.success }]}>
                          ✅ Target Reached!
                        </Text>
                      )}
                      {video.is_repromoted && video.last_repromoted_at && (
                        <Text style={[styles.repromoteDate, { color: '#9B59B6' }]}>
                          {`🔄 Repromoted ${formatDate(video.last_repromoted_at)}`}
                        </Text>
                      )}</View></TouchableOpacity>
                );
              })}
              {videos.length > 1 && (
                <View style={styles.viewMoreButtonContainer}>
                  <TouchableOpacity
                    style={[styles.viewMoreButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowAllVideos(!showAllVideos)}><View style={styles.viewMoreContent}>
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                        {showAllVideos 
                          ? 'Show Less' 
                          : `View More (${getRemainingCount(videos.length, 1)} more)`
                        }
                      </Text>
                      <View style={{ marginLeft: 8 }}>
                        {showAllVideos ? (
                          <ChevronUp size={16} color={colors.primary} />
                        ) : (
                          <ChevronDown size={16} color={colors.primary} />
                        )}
                      </View>
                    </View></TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <Activity size={20} color={colors.primary} />
          </View>
          
          {recentActivity.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Activity size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recent Activity</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Your coin transactions will appear here
              </Text>
            </View>
          ) : (<>{getDisplayedActivity().map((activity, index) => (
                <View key={`${activity.activity_type}-${activity.created_at}-${index}`} style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityType, { color: colors.text }]}>
                        {formatTransactionType(activity.activity_type)}
                      </Text>
                      <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                        {formatDate(activity.created_at)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.activityAmount,
                      { color: activity.amount > 0 ? colors.success : colors.error }
                    ]}>
                      {`${activity.amount > 0 ? '+' : ''}${safeNumber(activity.amount)} 🪙`}
                    </Text>
                  </View>
                  <Text style={[styles.activityDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {safeString(activity.description, 'No description available')}
                  </Text>
                </View>
              ))}{recentActivity.length > 1 && (
                <View style={styles.viewMoreButtonContainer}>
                  <TouchableOpacity
                    style={[styles.viewMoreButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowAllActivity(!showAllActivity)}><View style={styles.viewMoreContent}>
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                        {showAllActivity 
                          ? 'Show Less' 
                          : `View More Activity (${getRemainingCount(recentActivity.length, 1)} more)`
                        }
                      </Text>
                      <View style={{ marginLeft: 8 }}>
                        {showAllActivity ? (
                          <ChevronUp size={16} color={colors.primary} />
                        ) : (
                          <ChevronDown size={16} color={colors.primary} />
                        )}
                      </View>
                    </View></TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 24,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  videosSection: {
    marginBottom: 24,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  videoTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
  },
  videoDate: {
    fontSize: 12,
  },
  editButton: {
    padding: 4,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  videoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  videoCosts: {
    alignItems: 'flex-end',
  },
  costText: {
    fontSize: 12,
  },
  engagementText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewMoreButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  viewMoreButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  viewMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repromoteText: {
    fontSize: 11,
    fontWeight: '500',
  },
  repromoteDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});