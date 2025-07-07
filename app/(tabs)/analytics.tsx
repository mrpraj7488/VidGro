import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Eye, DollarSign, Video, Calendar, ChartBar as BarChart3, ChartPie as PieChart, Activity } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsData {
  totalVideosPromoted: number;
  totalCoinsSpent: number;
  totalCoinsEarned: number;
  totalViewsReceived: number;
  totalVideosWatched: number;
  averageWatchTime: number;
  recentTransactions: any[];
  promotedVideos: any[];
  watchHistory: any[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, delay }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.statCard, animatedStyle]}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </Animated.View>
  );
};

export default function AnalyticsTab() {
  const { user, profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVideosPromoted: 0,
    totalCoinsSpent: 0,
    totalCoinsEarned: 0,
    totalViewsReceived: 0,
    totalVideosWatched: 0,
    averageWatchTime: 0,
    recentTransactions: [],
    promotedVideos: [],
    watchHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, selectedPeriod]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (selectedPeriod === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === '30d') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate = new Date('2020-01-01'); // All time
      }

      // Fetch promoted videos
      const { data: promotedVideos } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Fetch video views for promoted videos
      const { data: videoViews } = await supabase
        .from('video_views')
        .select('*, videos!inner(*)')
        .eq('videos.user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Fetch user's watch history
      const { data: watchHistory } = await supabase
        .from('video_views')
        .select('*, videos(*)')
        .eq('viewer_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Fetch coin transactions
      const { data: transactions } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate analytics
      const totalVideosPromoted = promotedVideos?.length || 0;
      const totalViewsReceived = videoViews?.length || 0;
      const totalVideosWatched = watchHistory?.filter(w => w.completed).length || 0;
      
      const coinsSpent = transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      const coinsEarned = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0;
      
      const averageWatchTime = watchHistory?.length > 0 
        ? Math.round(watchHistory.reduce((sum, w) => sum + w.watched_duration, 0) / watchHistory.length)
        : 0;

      setAnalytics({
        totalVideosPromoted,
        totalCoinsSpent: coinsSpent,
        totalCoinsEarned: coinsEarned,
        totalViewsReceived,
        totalVideosWatched,
        averageWatchTime,
        recentTransactions: transactions || [],
        promotedVideos: promotedVideos || [],
        watchHistory: watchHistory || [],
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat().format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'video_watch':
        return <Eye color="#4ECDC4" size={16} />;
      case 'video_promotion':
        return <Video color="#FF4757" size={16} />;
      case 'purchase':
        return <DollarSign color="#FFA726" size={16} />;
      default:
        return <Activity color="#666" size={16} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with adjusted padding */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.coinDisplay}>
          <DollarSign color="white" size={20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Videos Promoted"
            value={analytics.totalVideosPromoted}
            icon={<Video color="white" size={24} />}
            color="#FF4757"
            delay={0}
          />
          <StatCard
            title="Total Views"
            value={formatCurrency(analytics.totalViewsReceived)}
            icon={<Eye color="white" size={24} />}
            color="#4ECDC4"
            delay={100}
          />
          <StatCard
            title="Coins Earned"
            value={formatCurrency(analytics.totalCoinsEarned)}
            icon={<TrendingUp color="white" size={24} />}
            color="#2ECC71"
            delay={200}
          />
          <StatCard
            title="Coins Spent"
            value={formatCurrency(analytics.totalCoinsSpent)}
            icon={<DollarSign color="white" size={24} />}
            color="#E74C3C"
            delay={300}
          />
        </View>

        {/* Performance Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{analytics.totalVideosWatched}</Text>
                <Text style={styles.performanceLabel}>Videos Watched</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{analytics.averageWatchTime}s</Text>
                <Text style={styles.performanceLabel}>Avg. Watch Time</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {analytics.totalVideosPromoted > 0 
                    ? Math.round((analytics.totalViewsReceived / analytics.totalVideosPromoted) * 100) / 100
                    : 0}
                </Text>
                <Text style={styles.performanceLabel}>Views per Video</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsList}>
            {analytics.recentTransactions.length > 0 ? (
              analytics.recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    {getTransactionIcon(transaction.transaction_type)}
                  </View>
                  <View style={styles.transactionContent}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.amount > 0 ? styles.positiveAmount : styles.negativeAmount
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Activity color="#999" size={48} />
                <Text style={styles.emptyStateText}>No transactions yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start watching or promoting videos to see your activity
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Promoted Videos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Promoted Videos</Text>
          <View style={styles.videosList}>
            {analytics.promotedVideos.length > 0 ? (
              analytics.promotedVideos.map((video) => (
                <View key={video.id} style={styles.videoItem}>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text style={styles.videoStats}>
                      {video.views_count}/{video.target_views} views • {video.coin_reward} coins/view
                    </Text>
                    <Text style={styles.videoDate}>
                      {formatDate(video.created_at)}
                    </Text>
                  </View>
                  <View style={styles.videoStatus}>
                    <View style={[
                      styles.statusBadge,
                      video.status === 'active' ? styles.activeBadge :
                      video.status === 'completed' ? styles.completedBadge : styles.pausedBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        video.status === 'active' ? styles.activeText :
                        video.status === 'completed' ? styles.completedText : styles.pausedText
                      ]}>
                        {video.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
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
      </ScrollView>
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
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FF4757',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: 4,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  performanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  transactionsList: {
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
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#2ECC71',
  },
  negativeAmount: {
    color: '#E74C3C',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  videoDate: {
    fontSize: 11,
    color: '#999',
  },
  videoStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E8',
  },
  completedBadge: {
    backgroundColor: '#E3F2FD',
  },
  pausedBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: '#2ECC71',
  },
  completedText: {
    color: '#2196F3',
  },
  pausedText: {
    color: '#FF9800',
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