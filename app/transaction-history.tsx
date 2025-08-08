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
  Dimensions,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Coins, TrendingUp, TrendingDown, Calendar, Filter, Search, Eye, EyeOff } from 'lucide-react-native';
import { getUserTransactionHistory } from '../lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  reference_id?: string;
  metadata?: any;
  created_at: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function TransactionHistoryScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});

  // Animation values
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await getUserTransactionHistory(user.id, 100);

      if (error) {
        console.error('Error fetching transactions:', error);
        Alert.alert('Error', 'Failed to load transaction history');
        return;
      }

      if (data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Transaction fetch error:', error);
      Alert.alert('Error', 'Something went wrong while loading transactions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions;
    
    return transactions.filter(transaction => {
      switch (filter) {
        case 'earned':
          return transaction.amount > 0;
        case 'spent':
          return transaction.amount < 0;
        case 'purchases':
          return transaction.transaction_type === 'purchase';
        case 'promotions':
          return transaction.transaction_type === 'video_promotion';
        default:
          return true;
      }
    });
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'video_promotion': return 'Video Promotion';
      case 'purchase': return 'Coin Purchase';
      case 'referral_bonus': return 'Referral Bonus';
      case 'admin_adjustment': return 'Admin Adjustment';
      case 'vip_purchase': return 'VIP Purchase';
      case 'video_deletion_refund': return 'Video Deletion Refund';
      case 'ad_reward': return 'Ad Reward';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return TrendingUp;
    } else {
      return TrendingDown;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? colors.success : colors.error;
  };

  const toggleDetails = (transactionId: string) => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setShowDetails(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const filterOptions = [
    { id: 'all', title: 'All', icon: Coins },
    { id: 'earned', title: 'Earned', icon: TrendingUp },
    { id: 'spent', title: 'Spent', icon: TrendingDown },
    { id: 'purchases', title: 'Purchases', icon: Coins },
    { id: 'promotions', title: 'Promotions', icon: Eye },
  ];

  const filteredTransactions = getFilteredTransactions();
  const totalEarned = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transaction History</Text>
            <Coins size={24} color="white" />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <Coins size={24} color="white" />
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)'] : ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
              style={styles.summaryGradient}
            >
              <TrendingUp size={isVerySmallScreen ? 20 : 24} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Earned</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>🪙{totalEarned.toLocaleString()}</Text>
            </LinearGradient>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
              style={styles.summaryGradient}
            >
              <TrendingDown size={isVerySmallScreen ? 20 : 24} color={colors.error} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>🪙{totalSpent.toLocaleString()}</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                filter === option.id && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setFilter(option.id)}
            >
              <option.icon 
                size={isVerySmallScreen ? 14 : 16} 
                color={filter === option.id ? 'white' : colors.primary} 
              />
              <Text style={[
                styles.filterText,
                { color: filter === option.id ? 'white' : colors.primary }
              ]}>
                {option.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Coins size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your coin transactions will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => {
              const TransactionIcon = getTransactionIcon(transaction.transaction_type, transaction.amount);
              const isDetailsVisible = showDetails[transaction.id];
              
              return (
                <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={styles.transactionHeader}
                    onPress={() => toggleDetails(transaction.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionMain}>
                      <View style={[
                        styles.transactionIcon,
                        { backgroundColor: getTransactionColor(transaction.amount) + '20' }
                      ]}>
                        <TransactionIcon 
                          size={isVerySmallScreen ? 18 : 20} 
                          color={getTransactionColor(transaction.amount)} 
                        />
                      </View>
                      
                      <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionType, { color: colors.text }]}>
                          {formatTransactionType(transaction.transaction_type)}
                        </Text>
                        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                          {formatDate(transaction.created_at)}
                        </Text>
                      </View>
                      
                      <View style={styles.transactionAmount}>
                        <Text style={[
                          styles.amountText,
                          { color: getTransactionColor(transaction.amount) }
                        ]}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} 🪙
                        </Text>
                        <AnimatedTouchableOpacity style={buttonAnimatedStyle}>
                          {isDetailsVisible ? (
                            <EyeOff size={14} color={colors.textSecondary} />
                          ) : (
                            <Eye size={14} color={colors.textSecondary} />
                          )}
                        </AnimatedTouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isDetailsVisible && (
                    <View style={[styles.transactionDetails, { borderTopColor: colors.border }]}>
                      <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                        {transaction.description}
                      </Text>
                      
                      {transaction.reference_id && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference ID:</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.reference_id}</Text>
                        </View>
                      )}
                      
                      {transaction.metadata && (
                        <View style={styles.metadataSection}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Details:</Text>
                          {Object.entries(transaction.metadata).map(([key, value]) => (
                            <Text key={key} style={[styles.metadataText, { color: colors.textSecondary }]}>
                              • {key}: {String(value)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 18 : 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
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
  summarySection: {
    padding: isVerySmallScreen ? 12 : 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 10 : 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  summaryGradient: {
    alignItems: 'center',
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    gap: isVerySmallScreen ? 6 : 8,
  },
  summaryLabel: {
    fontSize: isVerySmallScreen ? 11 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: isVerySmallScreen ? 16 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  filterScroll: {
    gap: isVerySmallScreen ? 8 : 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: isVerySmallScreen ? 4 : 6,
  },
  filterText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: isVerySmallScreen ? 32 : 40,
    borderRadius: 16,
    marginTop: 20,
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
  emptyTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: isVerySmallScreen ? 13 : 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  transactionsList: {
    gap: isVerySmallScreen ? 8 : 12,
    paddingBottom: 20,
  },
  transactionCard: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
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
  transactionHeader: {
    padding: isVerySmallScreen ? 14 : 16,
  },
  transactionMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: isVerySmallScreen ? 36 : 40,
    height: isVerySmallScreen ? 36 : 40,
    borderRadius: isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 10 : 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: isVerySmallScreen ? 11 : 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    paddingHorizontal: isVerySmallScreen ? 14 : 16,
    paddingBottom: isVerySmallScreen ? 14 : 16,
    borderTopWidth: 1,
    paddingTop: isVerySmallScreen ? 12 : 16,
  },
  descriptionText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    lineHeight: 20,
    marginBottom: isVerySmallScreen ? 8 : 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isVerySmallScreen ? 4 : 6,
  },
  detailLabel: {
    fontSize: isVerySmallScreen ? 11 : 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: isVerySmallScreen ? 11 : 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metadataSection: {
    marginTop: isVerySmallScreen ? 6 : 8,
  },
  metadataText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    marginLeft: 8,
    marginBottom: 2,
  },
});