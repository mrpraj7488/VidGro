import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 375;

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  originalPrice?: number;
  bonus?: number;
  popular?: boolean;
  savings?: string;
  productId: string;
}

export default function BuyCoinsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const coinBounce = useSharedValue(1);

  const coinPackages: CoinPackage[] = [
    { 
      id: 'starter', 
      coins: 3000, 
      price: 74.00,
      originalPrice: 89.00,
      savings: '17% OFF',
      productId: 'com.vidgro.coins.3000'
    },
    { 
      id: 'basic', 
      coins: 10000, 
      price: 215.00,
      originalPrice: 299.00,
      bonus: 500,
      popular: true,
      savings: '28% OFF',
      productId: 'com.vidgro.coins.10000'
    },
    { 
      id: 'premium', 
      coins: 17000, 
      price: 370.00,
      originalPrice: 499.00,
      bonus: 1000,
      savings: '26% OFF',
      productId: 'com.vidgro.coins.17000'
    },
    { 
      id: 'mega', 
      coins: 40000, 
      price: 800.00,
      originalPrice: 1199.00,
      bonus: 2000,
      savings: '33% OFF',
      productId: 'com.vidgro.coins.40000'
    },
    { 
      id: 'ultimate', 
      coins: 90000, 
      price: 1600.00,
      originalPrice: 2499.00,
      bonus: 5000,
      savings: '36% OFF',
      productId: 'com.vidgro.coins.90000'
    },
    { 
      id: 'supreme', 
      coins: 200000, 
      price: 3550.00,
      originalPrice: 5999.00,
      bonus: 15000,
      savings: '41% OFF',
      productId: 'com.vidgro.coins.200000'
    },
  ];

  useEffect(() => {
    initializeInAppPurchases();
  }, []);

  const initializeInAppPurchases = async () => {
    try {
      // Initialize Google Play Billing or App Store Connect
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // In a real implementation, you would initialize the in-app purchase library here
        // For now, we'll simulate the connection
        setIsConnected(true);
        console.log('In-app purchases initialized');
      }
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      Alert.alert('Error', 'Failed to initialize payment system');
    }
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) return;

    // Handle web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'In-app purchases are only available on mobile devices (iOS/Android). Please use the mobile app to purchase coins.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Payment system not ready. Please try again.');
      return;
    }

    setLoading(pkg.id);
    
    // Animate button
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    try {
      // Simulate Google Play Billing purchase flow
      const purchaseResult = await simulateInAppPurchase(pkg);
      
      if (purchaseResult.success) {
        // Validate purchase with backend
        const validationResult = await validatePurchaseWithBackend(
          purchaseResult.purchaseToken,
          pkg.productId,
          user.id
        );
        
        if (validationResult.success) {
          // Award coins to user
          const totalCoins = pkg.coins + (pkg.bonus || 0);
          await awardCoinsToUser(user.id, totalCoins, pkg);
          
          // Animate coin update
          coinBounce.value = withSequence(
            withSpring(1.3, { damping: 15, stiffness: 150 }),
            withSpring(1, { damping: 15, stiffness: 150 })
          );
          
          Alert.alert(
            'Purchase Successful! 🎉',
            `🪙${totalCoins.toLocaleString()} coins have been added to your balance!`,
            [{ text: 'Awesome!', onPress: () => router.back() }]
          );
        } else {
          throw new Error('Purchase validation failed');
        }
      } else {
        throw new Error(purchaseResult.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', error.message || 'Please try again later.');
    } finally {
      setLoading(null);
    }
  };

  const simulateInAppPurchase = async (pkg: CoinPackage): Promise<{success: boolean, purchaseToken?: string, error?: string}> => {
    // Simulate Google Play Billing purchase flow
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful purchase
        resolve({
          success: true,
          purchaseToken: `mock_token_${pkg.id}_${Date.now()}`
        });
      }, 2000);
    });
  };

  const validatePurchaseWithBackend = async (
    purchaseToken: string,
    productId: string,
    userId: string
  ): Promise<{success: boolean, error?: string}> => {
    try {
      // In a real implementation, you would call your backend to validate the purchase
      // with Google Play Developer API or App Store Server API
      
      // For now, we'll simulate validation
      console.log('Validating purchase:', { purchaseToken, productId, userId });
      
      // Simulate backend validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      console.error('Purchase validation error:', error);
      return { success: false, error: 'Validation failed' };
    }
  };

  const awardCoinsToUser = async (userId: string, coinAmount: number, pkg: CoinPackage) => {
    try {
      // Update user coins in database using the existing function
      const { error } = await supabase
        .rpc('update_user_coins', {
          user_uuid: userId,
          coin_amount: coinAmount,
          transaction_type_param: 'purchase',
          description_param: `Purchased ${pkg.coins} coins${pkg.bonus ? ` + ${pkg.bonus} bonus` : ''} for ₹${pkg.price}`,
          reference_uuid: null
        });

      if (error) throw error;

      // Refresh user profile to update coin balance
      await refreshProfile();
      
    } catch (error) {
      console.error('Error awarding coins:', error);
      throw new Error('Failed to update coin balance');
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const renderCoinPackage = (pkg: CoinPackage) => (
    <View key={pkg.id} style={[
      styles.packageCard,
      pkg.popular && styles.popularCard
    ]}>
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.packageHeader}>
        <Animated.View style={[styles.coinIcon, coinAnimatedStyle]}>
          <Text style={styles.coinEmoji}>🪙</Text>
        </Animated.View>
        
        <View style={styles.packageInfo}>
          <Text style={styles.coinAmount}>
            {pkg.coins.toLocaleString()} Coins
          </Text>
          {pkg.bonus && (
            <View style={styles.bonusContainer}>
              <Text style={styles.bonusText}>+{pkg.bonus.toLocaleString()} Bonus</Text>
            </View>
          )}
          {pkg.savings && (
            <View style={styles.savingsContainer}>
              <Text style={styles.savingsText}>{pkg.savings}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          {pkg.originalPrice && (
            <Text style={styles.originalPrice}>₹{pkg.originalPrice}</Text>
          )}
          <Text style={styles.price}>₹{pkg.price}</Text>
        </View>
        
        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.buyButton,
              pkg.popular && styles.popularBuyButton,
              loading === pkg.id && styles.loadingButton
            ]}
            onPress={() => handlePurchase(pkg)}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === pkg.id ? (
              <Text style={styles.buyButtonText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.buyButtonText}>Buy Now</Text>
                <CheckCircle color="white" size={16} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#800080" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Coins</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>🪙{profile?.coins?.toLocaleString() || '0'}</Text>
        </View>

        {/* Coin Packages */}
        <View style={styles.packagesSection}>
          <Text style={styles.sectionTitle}>Choose Your Package</Text>
          <View style={styles.packagesGrid}>
            {coinPackages.map(renderCoinPackage)}
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityText}>
            🔒 All transactions are secure and processed through Google Play Store. Your payment information is never stored.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#800080',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: isVerySmallScreen ? 16 : 20,
    borderRadius: 16,
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
  balanceLabel: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: isVerySmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#800080',
  },
  packagesSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  packagesGrid: {
    gap: isVerySmallScreen ? 12 : 16,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    position: 'relative',
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
  popularCard: {
    borderWidth: 2,
    borderColor: '#800080',
    backgroundColor: '#FFF8F8',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#800080',
    paddingHorizontal: isVerySmallScreen ? 8 : 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 9 : 10,
    fontWeight: 'bold',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coinIcon: {
    width: isVerySmallScreen ? 48 : 56,
    height: isVerySmallScreen ? 48 : 56,
    borderRadius: isVerySmallScreen ? 24 : 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  coinEmoji: {
    fontSize: isVerySmallScreen ? 24 : 28,
  },
  packageInfo: {
    flex: 1,
  },
  coinAmount: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bonusContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  bonusText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#E74C3C',
    fontWeight: '600',
  },
  savingsContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#800080',
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderRadius: 25,
    gap: 6,
  },
  popularBuyButton: {
    backgroundColor: '#800080',
  },
  loadingButton: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  securityNotice: {
    margin: 16,
    padding: isVerySmallScreen ? 12 : 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  securityText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#1565C0',
    textAlign: 'center',
    lineHeight: 18,
  },
});