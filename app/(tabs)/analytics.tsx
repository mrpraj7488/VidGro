import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartBar as BarChart3, TrendingUp, Eye, DollarSign, Clock, Calendar, Target, Activity } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';
import Header from '@/components/Header';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { coins, videosWatched, totalEarned } = useUserStore();
  const { getUserPromotions } = useVideoStore();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const userPromotions = getUserPromotions();
  const totalViews = userPromotions.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalSpent = userPromotions.reduce((sum, p) => sum + (p.duration * 1.2), 0);

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];

  const summaryCards = [
    {
      title: 'Active Promotions',
      value: userPromotions.length,
      icon: Target,
      color: '#1E90FF',
      gradient: ['#1E90FF', '#4169E1'],
    },
    {
      title: 'Coin Balance',
      value: coins,
      icon: DollarSign,
      color: '#FFA500',
      gradient: ['#FFA500', '#FF8C00'],
    },
    {
      title: 'Videos Watched',
      value: videosWatched,
      icon: Eye,
      color: '#00FF00',
      gradient: ['#00FF00', '#32CD32'],
    },
    {
      title: 'Total Earned',
      value: totalEarned,
      icon: TrendingUp,
      color: '#FF0000',
      gradient: ['#FF0000', '#DC143C'],
    },
  ];

  const chartData = [
    { day: 'Mon', views: 45, earnings: 120 },
    { day: 'Tue', views: 62, earnings: 180 },
    { day: 'Wed', views: 38, earnings: 95 },
    { day: 'Thu', views: 71, earnings: 220 },
    { day: 'Fri', views: 89, earnings: 280 },
    { day: 'Sat', views: 56, earnings: 150 },
    { day: 'Sun', views: 43, earnings: 110 },
  ];

  const maxViews = Math.max(...chartData.map(d => d.views));

  const renderSummaryCard = (card: any, index: number) => (
    <View key={index} style={styles.summaryCard}>
      <LinearGradient
        colors={card.gradient}
        style={styles.cardGradient}
      >
        <View style={styles.cardIcon}>
          <card.icon size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{card.value.toLocaleString()}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Views Over Time</Text>
      <View style={styles.chart}>
        {chartData.map((data, index) => (
          <View key={index} style={styles.chartBar}>
            <View style={styles.barContainer}>
              <LinearGradient
                colors={['#1E90FF', '#4169E1']}
                style={[
                  styles.bar,
                  { height: (data.views / maxViews) * 100 }
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{data.day}</Text>
            <Text style={styles.barValue}>{data.views}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderQuestHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Quest History</Text>
      {userPromotions.length > 0 ? (
        <View style={styles.historyList}>
          {userPromotions.map((promotion, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Activity size={20} color="#1E90FF" />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Video #{index + 1}</Text>
                <Text style={styles.historySubtitle} numberOfLines={1}>
                  {promotion.url}
                </Text>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Eye size={12} color="#6B7280" />
                    <Text style={styles.historyStatText}>{promotion.views || 0} views</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={styles.historyStatText}>{promotion.duration}s</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <DollarSign size={12} color="#6B7280" />
                    <Text style={styles.historyStatText}>{Math.ceil(promotion.duration * 1.2)} spent</Text>
                  </View>
                </View>
              </View>
              <View style={styles.historyDate}>
                <Text style={styles.historyDateText}>
                  {new Date(promotion.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noHistory}>
          <Text style={styles.noHistoryText}>No promotion history yet</Text>
          <Text style={styles.noHistorySubtext}>Start promoting videos to see analytics</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Analytics" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            {summaryCards.map(renderSummaryCard)}
          </View>
        </View>

        {/* Chart */}
        <View style={styles.section}>
          {renderChart()}
        </View>

        {/* Engagement Pie Chart Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement Overview</Text>
          <View style={styles.pieChartContainer}>
            <View style={styles.pieChart}>
              <LinearGradient
                colors={['#1E90FF', '#8A2BE2']}
                style={styles.pieSlice}
              >
                <Text style={styles.pieText}>75%</Text>
                <Text style={styles.pieLabel}>Completed</Text>
              </LinearGradient>
            </View>
            <View style={styles.pieStats}>
              <View style={styles.pieStat}>
                <View style={[styles.pieIndicator, { backgroundColor: '#1E90FF' }]} />
                <Text style={styles.pieStatText}>Completed Views: 75%</Text>
              </View>
              <View style={styles.pieStat}>
                <View style={[styles.pieIndicator, { backgroundColor: '#8A2BE2' }]} />
                <Text style={styles.pieStatText}>Skipped Views: 25%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quest History */}
        <View style={styles.section}>
          {renderQuestHistory()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#1E90FF',
  },
  periodButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summarySection: {
    margin: 20,
    marginTop: 0,
  },
  section: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  chartContainer: {
    gap: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 8,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 100,
    width: 24,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  barValue: {
    fontSize: 10,
    fontFamily: 'Roboto-Regular',
    color: '#9CA3AF',
  },
  pieChartContainer: {
    alignItems: 'center',
    gap: 20,
  },
  pieChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  pieSlice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieText: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  pieLabel: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  pieStats: {
    gap: 8,
  },
  pieStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pieStatText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  historyContainer: {
    gap: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
    gap: 4,
  },
  historySubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatText: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
  },
  historyDate: {
    alignItems: 'flex-end',
  },
  historyDateText: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#9CA3AF',
  },
  noHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noHistoryText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  noHistorySubtext: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});