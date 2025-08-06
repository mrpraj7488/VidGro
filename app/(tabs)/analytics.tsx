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
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { ChartBar as BarChart3, Eye, Coins, Play, Pause, CircleCheck as CheckCircle, Timer, CreditCard as Edit3, Activity, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getUserComprehensiveAnalytics, getUserVideosWithAnalytics, getUserRecentActivity } from '@/lib/supabase';

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
}

export default function Analytics() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [videos, setVideos] = useState<VideoAnalytics[]>([]);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      fetchAnalytics();
      
      // Set up periodic status checking for hold videos and real-time updates
      const statusCheckInterval = setInterval(async () => {
        try {
          // Check for expired holds and update video metrics every 5 seconds
          const { data: updatedCount, error: holdsError } = await supabase.rpc('check_and_update_expired_holds');
          if (holdsError) {
            console.error('Error checking expired holds:', holdsError);
          } else if (updatedCount && updatedCount > 0) {
            console.log(`${updatedCount} videos automatically activated from hold`);
            fetchAnalytics();
          }
        } catch (error) {
          console.error('Error checking expired holds:', error);
        }
      }, 5000);
      
      return () => clearInterval(statusCheckInterval);
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);

      // Fetch user analytics using the current schema function
      const { data: analyticsData, error: analyticsError } = await getUserComprehensiveAnalytics(user.id);

      if (analyticsError) {
        console.error('Analytics error:', analyticsError);
        // If the function doesn't exist, create a basic analytics object
        if (typeof analyticsError === 'object' && analyticsError !== null && 'message' in analyticsError && typeof analyticsError.message === 'string' && (analyticsError.message.includes('function') || analyticsError.message.includes('not found'))) {
          console.log('Analytics function not found, using fallback data');
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
            total_coins_earned: 0
          });
        } else {
          Alert.alert('Error', 'Failed to load analytics data');
        }
        return;
      }

      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      // Fetch recent activity using the new function
      const { data: activityData, error: activityError } = await getUserRecentActivity(user.id);
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

      // Fetch user's videos with enhanced analytics including completion status
      const { data: videosData, error: videosError } = await getUserVideosWithAnalytics(user.id);

      if (videosError) {
        console.error('Videos error:', videosError);
        // If the function doesn't exist, fetch directly from videos table
        if (typeof videosError === 'object' && videosError !== null && 'message' in videosError && typeof videosError.message === 'string' && (videosError.message.includes('function') || videosError.message.includes('not found'))) {
          console.log('User videos function not found, fetching directly from videos table');
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
              coins_earned_total
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (directVideosError) {
            console.error('Direct videos error:', directVideosError);
          } else if (directVideosData) {
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
              coins_earned_total: video.coins_earned_total || 0
            }));
            console.log('Direct videos data:', directVideosData);
            console.log('Videos with completion:', videosWithCompletion);
            console.log('Sample direct video coin_cost:', videosWithCompletion[0]?.coin_cost);
            setVideos(videosWithCompletion);
          }
        }
      } else if (videosData) {
        // Transform the data to match the expected interface
        const transformedVideos = videosData.map(video => {
          console.log('Processing video:', video); // Debug log
          return {
            video_id: video.video_id,
            title: video.title,
            views_count: video.views_count,
            target_views: video.target_views,
            status: video.status,
            created_at: video.created_at,
            coin_cost: video.coin_cost || 0, // Use coin_cost from the function
            completion_rate: video.completion_rate,
            completed: video.completed,
            total_watch_time: video.total_watch_time || 0,
            coins_earned_total: video.coins_earned_total
          };
        });
        console.log('Videos data from function:', videosData);
        console.log('Transformed videos:', transformedVideos);
        console.log('Sample video coin_cost:', transformedVideos[0]?.coin_cost);
        setVideos(transformedVideos);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Something went wrong while loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Play;
      case 'completed': return CheckCircle;
      case 'paused': return Pause;
      case 'on_hold': return Timer;
      case 'repromoted': return TrendingUp;
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

  if (loading) {
    return (
      <View style={styles.container}>
        <GlobalHeader 
          title="Analytics" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#800080" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Play size={20} color="#3498DB" />
                <Text style={styles.statLabel}>Videos Promoted</Text>
              </View>
              <Text style={styles.statValue}>
                {analytics?.total_videos_promoted || 0}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Coins size={20} color="#FFD700" />
                <Text style={styles.statLabel}>Coins Earned</Text>
              </View>
              <Text style={styles.statValue}>
                {analytics?.total_coins_earned || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Video Status Summary */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Video Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, { borderLeftColor: '#2ECC71' }]}>
              <Text style={styles.statusNumber}>{analytics?.active_videos || 0}</Text>
              <Text style={styles.statusLabel}>Active</Text>
            </View>
            
            <View style={[styles.statusCard, { borderLeftColor: '#3498DB' }]}>
              <Text style={styles.statusNumber}>{analytics?.completed_videos || 0}</Text>
              <Text style={styles.statusLabel}>Completed</Text>
            </View>
            
            <View style={[styles.statusCard, { borderLeftColor: '#F39C12' }]}>
              <Text style={styles.statusNumber}>{analytics?.on_hold_videos || 0}</Text>
              <Text style={styles.statusLabel}>On Hold</Text>
            </View>
          </View>
        </View>

        {/* Promoted Videos */}
        <View style={styles.videosSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promoted Videos</Text>
            <BarChart3 size={20} color="#800080" />
          </View>
          
          {videos.length === 0 ? (
            <View style={styles.emptyState}>
              <Play size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No Videos Yet</Text>
              <Text style={styles.emptyText}>
                Start promoting your videos to see analytics here
              </Text>
            </View>
          ) : (
            <>
              {getDisplayedVideos().map((video) => {
                const StatusIcon = getStatusIcon(video.status);
                return (
                  <TouchableOpacity
                    key={video.video_id}
                    style={styles.videoCard}
                    onPress={() => handleVideoPress(video)}
                  >
                    <View style={styles.videoHeader}>
                      <View style={styles.videoTitleContainer}>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                          {video.title}
                        </Text>
                        <Text style={styles.videoDate}>
                          {formatDate(video.created_at)}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.editButton}>
                        <Edit3 size={16} color="#666" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.videoStats}>
                      <View style={styles.videoStat}>
                        <Eye size={16} color="#666" />
                        <Text style={styles.videoStatText}>
                          {video.views_count}/{video.target_views}
                        </Text>
                      </View>
                      
                      <View style={styles.videoStat}>
                        <StatusIcon size={16} color={getStatusColor(video.status)} />
                        <Text style={[styles.videoStatText, { color: getStatusColor(video.status) }]}>
                          {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${Math.min(video.completion_rate, 100)}%`,
                              backgroundColor: getStatusColor(video.status)
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{video.completion_rate}%</Text>
                    </View>

                    <View style={styles.videoCosts}>
                      <Text style={styles.costText}>
                        Spent: 🪙{video.coin_cost}
                      </Text>
                      {video.completed && (
                        <Text style={styles.completedText}>
                          ✅ Target Reached!
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {videos.length > 1 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setShowAllVideos(!showAllVideos)}
                >
                  <Text style={styles.viewMoreText}>
                    {showAllVideos 
                      ? 'Show Less' 
                      : `View More (${getRemainingCount(videos.length, 1)} more)`
                    }
                  </Text>
                  {showAllVideos ? (
                    <ChevronUp size={16} color="#800080" />
                  ) : (
                    <ChevronDown size={16} color="#800080" />
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Activity size={20} color="#800080" />
          </View>
          
          {recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No Recent Activity</Text>
              <Text style={styles.emptyText}>
                Your coin transactions will appear here
              </Text>
            </View>
          ) : (
            <>
              {getDisplayedActivity().map((activity, index) => (
                <View key={`${activity.activity_type}-${activity.created_at}-${index}`} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>
                        {formatTransactionType(activity.activity_type)}
                      </Text>
                      <Text style={styles.activityDate}>
                        {formatDate(activity.created_at)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.activityAmount,
                      { color: activity.amount > 0 ? '#2ECC71' : '#E74C3C' }
                    ]}>
                      {activity.amount > 0 ? '+' : ''}{activity.amount} 🪙
                    </Text>
                  </View>
                  <Text style={styles.activityDescription} numberOfLines={2}>
                    {activity.description}
                  </Text>
                </View>
              ))}
              
              {recentActivity.length > 1 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setShowAllActivity(!showAllActivity)}
                >
                  <Text style={styles.viewMoreText}>
                    {showAllActivity 
                      ? 'Show Less' 
                      : `View More (${getRemainingCount(recentActivity.length, 1)} more)`
                    }
                  </Text>
                  {showAllActivity ? (
                    <ChevronUp size={16} color="#800080" />
                  ) : (
                    <ChevronDown size={16} color="#800080" />
                  )}
                </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
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
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: 'white',
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
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'white',
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
    color: '#333',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: 'white',
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
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  videosSection: {
    marginBottom: 24,
  },
  emptyState: {
    backgroundColor: 'white',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  videoCard: {
    backgroundColor: 'white',
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
    color: '#333',
    lineHeight: 22,
    marginBottom: 4,
  },
  videoDate: {
    fontSize: 12,
    color: '#999',
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
    color: '#666',
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
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    minWidth: 35,
  },
  videoCosts: {
    alignItems: 'flex-end',
  },
  costText: {
    fontSize: 12,
    color: '#999',
  },
  engagementText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  completedText: {
    fontSize: 11,
    color: '#2ECC71',
    fontWeight: '600',
    marginTop: 2,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#800080',
  },
});
