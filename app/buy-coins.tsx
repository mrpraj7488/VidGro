import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Coins,
  Crown,
  Shield,
  CheckCircle,
  Star,
  Sparkles,
  Gift,
  Zap,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Google Play Billing (mock interface - replace with actual implementation)
interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Backend API interface
interface CoinPurchaseRequest {
  userId: string;
  packageId: string;
  transactionId: string;
  platform: 'android' | 'ios';
  amount: number;
  coins: number;
}

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isVerySmallDevice = width < 350;

export default function BuyCoinsScreen() {
  const { profile, refreshProfile, token } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchaseAnimation] = useState(new Animated.Value(0));
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Premium coin packages with enhanced structure
  const coinPackages = [
    {
      id: 'starter_pack',
      coins: 1000,
      price: 29,
      bonus: 0,
      popular: false,
      badge: '🚀 Starter',
      description: 'Perfect for beginners',
      features: ['Basic promotion', '24/7 support'],
      savings: 0,
      googlePlayId: 'coins_1000',
    },
    {
      id: 'growth_pack',
      coins: 2500,
      price: 69,
      bonus: 500,
      popular: false,
      badge: '📈 Growth',
      description: 'Accelerate your channel',
      features: ['Enhanced promotion', 'Analytics dashboard'],
      savings: 10,
      googlePlayId: 'coins_2500_bonus',
    },
    {
      id: 'premium_pack',
      coins: 5000,
      price: 129,
      bonus: 1500,
      popular: true,
      badge: '👑 Premium',
      description: 'Most popular choice',
      features: ['Priority promotion', 'Advanced targeting', 'Weekly reports'],
      savings: 25,
      googlePlayId: 'coins_5000_premium',
    },
    {
      id: 'pro_pack',
      coins: 10000,
      price: 249,
      bonus: 3500,
      popular: false,
      badge: '💎 Professional',
      description: 'For serious creators',
      features: ['Premium promotion', 'Custom campaigns', 'Dedicated support'],
      savings: 35,
      googlePlayId: 'coins_10000_pro',
    },
    {
      id: 'creator_pack',
      coins: 25000,
      price: 499,
      bonus: 10000,
      popular: false,
      badge: '🌟 Creator',
      description: 'Maximum growth potential',
      features: ['Elite promotion', 'Personal account manager', 'Custom strategies'],
      savings: 45,
      googlePlayId: 'coins_25000_creator',
    },
    {
      id: 'enterprise_pack',
      coins: 50000,
      price: 899,
      bonus: 25000,
      popular: false,
      badge: '🏆 Enterprise',
      description: 'Ultimate creator package',
      features: ['Exclusive promotion', 'White-glove service', 'Marketing consultation'],
      savings: 55,
      googlePlayId: 'coins_50000_enterprise',
    },
  ];

  useEffect(() => {
    initializeBilling();
    checkConnection();
  }, []);

  const initializeBilling = async () => {
    try {
      // Initialize Google Play Billing
      // await RNIap.initConnection();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Billing initialization failed:', error);
      setConnectionStatus('error');
    }
  };

  const checkConnection = () => {
    // Simulate connection check
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1500);
  };

  const handlePurchase = useCallback(async (packageItem: any) => {
    if (!token || !profile?.id) {
      Alert.alert('Error', 'Please log in to make a purchase');
      return;
    }

    setSelectedPackage(packageItem.id);
    setLoading(true);
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Initiate Google Play purchase
      const purchaseResult = await initiateGooglePlayPurchase(packageItem);
      
      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      // Step 2: Verify purchase with backend
      const verificationResult = await verifyPurchaseWithBackend({
        userId: profile.id,
        packageId: packageItem.id,
        transactionId: purchaseResult.transactionId!,
        platform: Platform.OS as 'android' | 'ios',
        amount: packageItem.price,
        coins: packageItem.coins + packageItem.bonus,
      });

      if (verificationResult.success) {
        // Step 3: Animate success
        animatePurchaseSuccess();
        
        // Step 4: Show success message
        setTimeout(() => {
          Alert.alert(
            '🎉 Purchase Successful!',
            `${(packageItem.coins + packageItem.bonus).toLocaleString()} coins have been added to your account.`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  refreshProfile();
                  router.back();
                },
              },
            ]
          );
        }, 1000);
      } else {
        throw new Error('Purchase verification failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  }, [profile, token]);

  const initiateGooglePlayPurchase = async (packageItem: any): Promise<PurchaseResult> => {
    try {
      // Mock Google Play Billing implementation
      // In real implementation, use react-native-iap:
      // const purchase = await RNIap.requestPurchase(packageItem.googlePlayId);
      
      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful purchase
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const verifyPurchaseWithBackend = async (purchaseData: CoinPurchaseRequest) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/coins/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(purchaseData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Backend verification error:', error);
      return { success: false, error: error.message };
    }
  };

  const animatePurchaseSuccess = () => {
    Animated.sequence([
      Animated.timing(purchaseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(purchaseAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderPackageCard = (packageItem: any, index: number) => {
    const isSelected = selectedPackage === packageItem.id;
    const isLoading = loading && isSelected;

    return (
      <TouchableOpacity
        key={packageItem.id}
        style={[
          styles.packageCard,
          { backgroundColor: colors.surface },
          packageItem.popular && styles.popularPackage,
          isSelected && styles.selectedPackage,
        ]}
        onPress={() => handlePurchase(packageItem)}
        disabled={loading}
        activeOpacity={0.8}
      >
        {packageItem.popular && (
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.popularBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Crown size={14} color="white" />
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </LinearGradient>
        )}

        {packageItem.savings > 0 && (
          <View style={[styles.savingsBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.savingsText}>Save {packageItem.savings}%</Text>
          </View>
        )}

        <View style={styles.packageContent}>
          <View style={styles.packageHeader}>
            <Text style={styles.badgeText}>{packageItem.badge}</Text>
            <Text style={[styles.coinAmount, { color: colors.text }]}>
              {packageItem.coins.toLocaleString()}
            </Text>
            <Text style={styles.coinsLabel}>Coins</Text>
            
            {packageItem.bonus > 0 && (
              <View style={styles.bonusContainer}>
                <Gift size={16} color={colors.success} />
                <Text style={[styles.bonusText, { color: colors.success }]}>
                  +{packageItem.bonus.toLocaleString()} Bonus
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {packageItem.description}
          </Text>

          <View style={styles.featuresContainer}>
            {packageItem.features.map((feature: string, idx: number) => (
              <View key={idx} style={styles.featureRow}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.priceSection}>
            <View>
              <Text style={[styles.totalCoins, { color: colors.textSecondary }]}>
                Total: {(packageItem.coins + packageItem.bonus).toLocaleString()} coins
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                ₹{packageItem.price}
              </Text>
            </View>
            <View style={styles.valueIndicator}>
              <Star size={16} color={colors.warning} />
              <Text style={[styles.valueText, { color: colors.warning }]}>
                Best Value
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={packageItem.popular ? ['#8B5CF6', '#A855F7'] : [colors.primary, colors.primary + '80']}
            style={[styles.purchaseButton, isLoading && styles.purchaseButtonLoading]}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.purchaseButtonText}>Processing...</Text>
              </View>
            ) : (
              <>
                <Sparkles size={18} color="white" />
                <Text style={styles.purchaseButtonText}>Purchase Now</Text>
              </>
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  if (connectionStatus === 'connecting') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Connecting to payment services...
          </Text>
        </View>
      </View>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorScreen}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Unable to connect to payment services
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={checkConnection}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={isVerySmallDevice ? 20 : 24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Premium Coins</Text>
            <Text style={styles.headerSubtitle}>Boost your channel growth</Text>
          </View>
          
          <View style={styles.currentBalance}>
            <View style={styles.coinIcon}>
              <Coins size={16} color="#FFD700" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceText}>
                {profile?.coins?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              Average 300% growth
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Zap size={20} color={colors.warning} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              Instant activation
            </Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose your growth package and watch your channel soar
        </Text>

        <View style={styles.packagesContainer}>
          {coinPackages.map(renderPackageCard)}
        </View>

        <View style={[styles.securityContainer, { backgroundColor: colors.surface }]}>
          <Shield size={24} color={colors.success} />
          <View style={styles.securityContent}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>
              🔒 Secure & Protected
            </Text>
            <Text style={[styles.securityText, { color: colors.textSecondary }]}>
              Bank-level encryption • Google Play protected • Instant delivery • 24/7 support
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? (isVerySmallDevice ? 45 : 50) : (isVerySmallDevice ? 35 : 40),
    paddingBottom: isVerySmallDevice ? 20 : 25,
    paddingHorizontal: isVerySmallDevice ? 16 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: isVerySmallDevice ? 40 : 50,
  },
  backButton: {
    width: isVerySmallDevice ? 36 : 40,
    height: isVerySmallDevice ? 36 : 40,
    borderRadius: isVerySmallDevice ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: isVerySmallDevice ? 8 : 12,
  },
  headerTitle: {
    fontSize: isVerySmallDevice ? 18 : isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: isVerySmallDevice ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  currentBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: isVerySmallDevice ? 8 : 12,
    paddingVertical: isVerySmallDevice ? 6 : 8,
    borderRadius: isVerySmallDevice ? 16 : 20,
    gap: isVerySmallDevice ? 6 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  coinIcon: {
    width: isVerySmallDevice ? 24 : 28,
    height: isVerySmallDevice ? 24 : 28,
    borderRadius: isVerySmallDevice ? 12 : 14,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  balanceInfo: {
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: isVerySmallDevice ? 9 : 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    lineHeight: isVerySmallDevice ? 12 : 14,
    marginBottom: -2,
  },
  balanceText: {
    fontSize: isVerySmallDevice ? 13 : 15,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: isVerySmallDevice ? 12 : isSmallDevice ? 16 : 20,
    paddingTop: isVerySmallDevice ? 8 : 10,
  },
  statsContainer: {
    flexDirection: isVerySmallDevice ? 'column' : 'row',
    marginBottom: isVerySmallDevice ? 16 : 20,
    gap: isVerySmallDevice ? 8 : 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallDevice ? 12 : 16,
    paddingVertical: isVerySmallDevice ? 10 : 12,
    borderRadius: 12,
    gap: 8,
  },
  statText: {
    fontSize: isVerySmallDevice ? 12 : 13,
    fontWeight: '500',
    flex: 1,
  },
  subtitle: {
    fontSize: isVerySmallDevice ? 14 : 16,
    textAlign: 'center',
    marginBottom: isVerySmallDevice ? 20 : 24,
    lineHeight: isVerySmallDevice ? 20 : 24,
    paddingHorizontal: isVerySmallDevice ? 5 : 10,
  },
  packagesContainer: {
    gap: isVerySmallDevice ? 12 : 16,
    marginBottom: isVerySmallDevice ? 24 : 32,
  },
  packageCard: {
    borderRadius: isVerySmallDevice ? 16 : 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  popularPackage: {
    borderWidth: isVerySmallDevice ? 1.5 : 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    transform: [{ scale: isVerySmallDevice ? 1.01 : 1.02 }],
  },
  selectedPackage: {
    borderWidth: isVerySmallDevice ? 1.5 : 2,
    borderColor: '#8B5CF6',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallDevice ? 6 : 8,
    gap: 4,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: isVerySmallDevice ? 10 : 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: isVerySmallDevice ? 8 : 12,
    right: isVerySmallDevice ? 8 : 12,
    paddingHorizontal: isVerySmallDevice ? 8 : 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  savingsText: {
    color: 'white',
    fontSize: isVerySmallDevice ? 10 : 11,
    fontWeight: 'bold',
  },
  packageContent: {
    padding: isVerySmallDevice ? 14 : isSmallDevice ? 16 : 20,
    paddingTop: isVerySmallDevice ? 18 : 24,
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: isVerySmallDevice ? 12 : 16,
  },
  badgeText: {
    fontSize: isVerySmallDevice ? 14 : 16,
    marginBottom: isVerySmallDevice ? 6 : 8,
  },
  coinAmount: {
    fontSize: isVerySmallDevice ? 24 : isSmallDevice ? 28 : 32,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coinsLabel: {
    fontSize: isVerySmallDevice ? 14 : 16,
    color: '#888',
    marginBottom: isVerySmallDevice ? 6 : 8,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: isVerySmallDevice ? 10 : 12,
    paddingVertical: isVerySmallDevice ? 4 : 6,
    borderRadius: 16,
    gap: 4,
  },
  bonusText: {
    fontSize: isVerySmallDevice ? 12 : 14,
    fontWeight: '600',
  },
  description: {
    fontSize: isVerySmallDevice ? 13 : 15,
    textAlign: 'center',
    marginBottom: isVerySmallDevice ? 12 : 16,
    lineHeight: isVerySmallDevice ? 18 : 20,
  },
  featuresContainer: {
    marginBottom: isVerySmallDevice ? 16 : 20,
    gap: isVerySmallDevice ? 6 : 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: isVerySmallDevice ? 12 : 14,
    flex: 1,
  },
  priceSection: {
    flexDirection: isVerySmallDevice ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isVerySmallDevice ? 'center' : 'center',
    marginBottom: isVerySmallDevice ? 16 : 20,
    gap: isVerySmallDevice ? 8 : 0,
  },
  totalCoins: {
    fontSize: isVerySmallDevice ? 12 : 14,
    marginBottom: 4,
    textAlign: isVerySmallDevice ? 'center' : 'left',
  },
  price: {
    fontSize: isVerySmallDevice ? 20 : isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    textAlign: isVerySmallDevice ? 'center' : 'left',
  },
  valueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: isVerySmallDevice ? 11 : 12,
    fontWeight: '600',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallDevice ? 12 : 16,
    borderRadius: 14,
    gap: 8,
  },
  purchaseButtonLoading: {
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: isVerySmallDevice ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  securityContainer: {
    flexDirection: isVerySmallDevice ? 'column' : 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: isVerySmallDevice ? 16 : 20,
    gap: isVerySmallDevice ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  securityContent: {
    flex: 1,
    alignItems: isVerySmallDevice ? 'center' : 'flex-start',
  },
  securityTitle: {
    fontSize: isVerySmallDevice ? 14 : 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: isVerySmallDevice ? 'center' : 'left',
  },
  securityText: {
    fontSize: isVerySmallDevice ? 11 : 13,
    lineHeight: isVerySmallDevice ? 16 : 18,
    textAlign: isVerySmallDevice ? 'center' : 'left',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});