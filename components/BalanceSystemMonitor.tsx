import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChartBar as BarChart3, Database, Zap, TrendingUp, RefreshCw } from 'lucide-react-native';

interface SystemMetrics {
  total_users: number;
  total_transactions: number;
  avg_transactions_per_user: number;
  total_videos: number;
  active_videos: number;
  completed_videos: number;
}

export default function BalanceSystemMonitor() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Get basic system metrics from database
      const { data: userCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      
      const { data: transactionCount } = await supabase
        .from('coin_transactions')
        .select('id', { count: 'exact', head: true });
      
      const { data: videoCount } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true });
      
      const { data: activeVideoCount } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      
      const { data: completedVideoCount } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true);
      
      const totalUsers = userCount?.length || 0;
      const totalTransactions = transactionCount?.length || 0;
      const totalVideos = videoCount?.length || 0;
      const activeVideos = activeVideoCount?.length || 0;
      const completedVideos = completedVideoCount?.length || 0;
      
      const avgTransactionsPerUser = totalUsers > 0 ? totalTransactions / totalUsers : 0;
      
      setMetrics({
        total_users: totalUsers,
        total_transactions: totalTransactions,
        avg_transactions_per_user: Math.round(avgTransactionsPerUser * 100) / 100,
        total_videos: totalVideos,
        active_videos: activeVideos,
        completed_videos: completedVideos
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      Alert.alert('Error', 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Database size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>System Monitor</Text>
          <TouchableOpacity onPress={fetchMetrics} disabled={loading}>
            <RefreshCw size={20} color={loading ? colors.textSecondary : colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {loading ? 'Loading metrics...' : 'Tap refresh to load metrics'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : colors.surface }]}>
        <Database size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>System Monitor</Text>
        <TouchableOpacity onPress={fetchMetrics} disabled={loading}>
          <RefreshCw size={20} color={loading ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* System Overview */}
      <View style={[styles.section, { backgroundColor: isDark ? colors.surface : colors.surface }]}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>System Overview</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: isDark ? colors.card : colors.card }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Users</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {metrics.total_users.toLocaleString()}
            </Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: isDark ? colors.card : colors.card }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Transactions</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {metrics.total_transactions.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.performanceCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
          <Text style={[styles.performanceLabel, { color: colors.warning }]}>Avg Transactions/User</Text>
          <Text style={[styles.performanceValue, { color: colors.warning }]}>
            {metrics.avg_transactions_per_user.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Video Statistics */}
      <View style={[styles.section, { backgroundColor: isDark ? colors.surface : colors.surface }]}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={colors.success} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Statistics</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: isDark ? colors.card : colors.card }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Videos</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {metrics.total_videos.toLocaleString()}
            </Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: isDark ? colors.card : colors.card }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active Videos</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {metrics.active_videos.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.reductionCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
          <Text style={[styles.reductionLabel, { color: colors.success }]}>Completed Videos</Text>
          <Text style={[styles.reductionValue, { color: colors.success }]}>
            {metrics.completed_videos.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* System Features */}
      <View style={[styles.section, { backgroundColor: isDark ? colors.surface : colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Zap size={20} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>System Features</Text>
        </View>
        
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🎬</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Video promotion and monetization platform</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🪙</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Coin-based reward system for video watching</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>👑</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>VIP membership with exclusive benefits</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>📊</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Real-time analytics and progress tracking</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Looping video queue for continuous engagement</Text>
          </View>
        </View>
      </View>

      {lastUpdated && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Text style={[styles.lastUpdatedText, { color: colors.textSecondary }]}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
    padding: 16,
    borderRadius: 12,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  reductionCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  reductionLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  reductionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reductionSavings: {
    fontSize: 12,
  },
  performanceCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  performanceBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
  },
});