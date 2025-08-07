import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, History, Coins, TrendingUp, TrendingDown, Filter, Calendar } from 'lucide-react-native';
import { getUserTransactionHistory } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  reference_id?: string;
  metadata?: any;
  created_at: string;
}

export default function TransactionHistoryScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent' | 'purchased'>('all');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await getUserTransactionHistory(user.id, 100);
      
      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      if (data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error:', error);
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
    switch (filter) {
      case 'earned':
        return transactions.filter(t => t.amount > 0 && t.transaction_type !== 'purchase');
      case 'spent':
        return transactions.filter(t => t.amount < 0);
      case 'purchased':
        return transactions.filter(t => t.transaction_type === 'purchase');
      default:
        return transactions;
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'video_promotion': return 'Video Promotion';
      case 'purchase': return 'Coin Purchase';
      case 'video_watch': return 'Video Watch Reward';
      case 'referral_bonus': return 'Referral Bonus';
      case 'admin_adjustment': return 'Admin Adjustment';
      case 'vip_purchase': return 'VIP Purchase';
      case 'video_deletion_refund': return 'Video Deletion Refund';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp size={16} color={colors.success} />;
    } else {
      return <TrendingDown size={16} color={colors.error} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getTotalsByType = () => {
    const earned = transactions
      .filter(t => t.amount > 0 && t.transaction_type !== 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const spent = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const purchased = transactions
      .filter(t => t.transaction_type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    return { earned, spent, purchased };
  };

  const filteredTransactions = getFilteredTransactions();
  const totals = getTotalsByType();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transaction History</Text>
            <History size={24} color="white" />
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
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <History size={24} color="white" />
        </View>
      </View>

      {/* Summary Cards */}
      <View style={[styles.summarySection, isTablet && styles.summarySectionTablet]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <TrendingUp size={20} color={colors.success} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Earned</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            +{totals.earned.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <TrendingDown size={20} color={colors.error} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            -{totals.spent.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Coins size={20} color={colors.primary} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Purchased</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            +{totals.purchased.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={[styles.filterSection, isTablet && styles.filterSectionTablet]}>
        {[
          { key: 'all', label: 'All', count: transactions.length },
          { key: 'earned', label: 'Earned', count: transactions.filter(t => t.amount > 0 && t.transaction_type !== 'purchase').length },
          { key: 'spent', label: 'Spent', count: transactions.filter(t => t.amount < 0).length },
          { key: 'purchased', label: 'Purchased', count: transactions.filter(t => t.transaction_type === 'purchase').length },
        ].map((filterOption) => (
          <TouchableOpacity
            key={filterOption.key}
            style={[
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              filter === filterOption.key && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setFilter(filterOption.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              { color: filter === filterOption.key ? 'white' : colors.text }
            ]}>
              {filterOption.label}
            </Text>
            <Text style={[
              styles.filterCount,
              { color: filter === filterOption.key ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
            ]}>
              {filterOption.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <History size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'all' 
                ? 'Your transaction history will appear here'
                : `No ${filter} transactions found`
              }
            </Text>
          </View>
        ) : (
          <View style={[styles.transactionsList, isTablet && styles.transactionsListTablet]}>
            {filteredTransactions.map((transaction, index) => (
              <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: colors.surface }]}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionInfo}>
                    <View style={styles.transactionTitleRow}>
                      {getTransactionIcon(transaction.transaction_type, transaction.amount)}
                      <Text style={[styles.transactionType, { color: colors.text }]}>
                        {formatTransactionType(transaction.transaction_type)}
                      </Text>
                    </View>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText,
                      { color: transaction.amount > 0 ? colors.success : colors.error }
                    ]}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} 🪙
                    </Text>
                    {transaction.metadata?.price_paid && (
                      <Text style={[styles.priceText, { color: colors.textSecondary }]}>
                        ₹{transaction.metadata.price_paid}
                      </Text>
                    )}
                  </View>
                </View>
                
                <Text style={[styles.transactionDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {transaction.description}
                </Text>

                {/* Additional metadata for purchases */}
                {transaction.transaction_type === 'purchase' && transaction.metadata && (
                  <View style={[styles.purchaseDetails, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.purchaseDetailsText, { color: colors.primary }]}>
                      Package: {transaction.metadata.package_id} • Platform: {transaction.metadata.platform}
                    </Text>
                    {transaction.metadata.bonus_coins > 0 && (
                      <Text style={[styles.bonusDetailsText, { color: colors.success }]}>
                        Includes {transaction.metadata.bonus_coins.toLocaleString()} bonus coins
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
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
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summarySectionTablet: {
    paddingHorizontal: 40,
    gap: 20,
  },
  summaryCard: {
    flex: 1,
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
  summaryLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: 'bold',
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterSectionTablet: {
    paddingHorizontal: 40,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  filterCount: {
    fontSize: 10,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
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
  transactionsList: {
    gap: 12,
  },
  transactionsListTablet: {
    gap: 16,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceText: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  purchaseDetails: {
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  purchaseDetailsText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  bonusDetailsText: {
    fontSize: 11,
    fontWeight: '600',
  },
});