import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Coins, Crown, Gift, Clock, Smartphone, CreditCard, Zap, Star, CircleCheck as CheckCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isVerySmallScreen = screenWidth < 360;

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  originalPrice?: number;
  bonus?: number;
  popular?: boolean;
  limitedOffer?: boolean;
  savings?: string;
}

const coinPackages: CoinPackage[] = [
  { 
    id: 'starter', 
    coins: 3000, 
    price: 74.00,
    originalPrice: 89.00,
    savings: '17% OFF'
  },
  { 
    id: 'basic', 
    coins: 10000, 
    price: 215.00,
    originalPrice: 299.00,
    bonus: 500,
    popular: true,
    limitedOffer: true,
    savings: '28% OFF'
  },
  { 
    id: 'premium', 
    coins: 17000, 
    price: 370.00,
    originalPrice: 499.00,
    bonus: 1000,
    limitedOffer: true,
    savings: '26% OFF'
  },
  { 
    id: 'mega', 
    coins: 40000, 
    price: 800.00,
    originalPrice: 1199.00,
    bonus: 2000,
    savings: '33% OFF'
  },
  { 
    id: 'ultimate', 
    coins: 90000, 
    price: 1600.00,
    originalPrice: 2499.00,
    bonus: 5000,
    savings: '36% OFF'
  },
  { 
    id: 'supreme', 
    coins: 200000, 
    price: 3550.00,
    originalPrice: 5999.00,
    bonus: 15000,
    savings: '41% OFF'
  },
];

type PaymentMethod = 'inapp' | 'upi' | 'paytm';

export default function BuyCoinsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('inapp');
  const [loading, setLoading] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 23, seconds: 45 });

  // Animation values
  const coinBounce = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Coin bounce animation
    coinBounce.value = withRepeat(
      withSpring(1.1, { damping: 15, stiffness: 150 }),
      -1,
      true
    );

    // Shimmer effect for limited offers
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    // Pulse animation for popular badge
    pulseScale.value = withRepeat(
      withTiming(1.05, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) return;

    setLoading(pkg.id);
    
    try {
      let success = false;
      const totalCoins = pkg.coins + (pkg.bonus || 0);

      switch (selectedPayment) {
        case 'inapp':
          success = await handleInAppPurchase(pkg);
          break;
        case 'upi':
          success = await handleUPIPurchase(pkg);
          break;
        case 'paytm':
          success = await handlePaytmPurchase(pkg);
          break;
      }

      if (success) {
        // Update user coins in database
        const { error } = await supabase
          .rpc('update_user_coins', {
            user_uuid: user.id,
            coin_amount: totalCoins,
            transaction_type_param: 'purchase',
            description_param: `Purchased ${pkg.coins} coins${pkg.bonus ? ` + ${pkg.bonus} bonus` : ''} for ₹${pkg.price}`,
            reference_uuid: null
          });

        if (error) throw error;

        await refreshProfile();
        
        Alert.alert(
          'Purchase Successful! 🎉',
          `🪙${totalCoins.toLocaleString()} coins have been added to your balance!`,
          [{ text: 'Awesome!', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'Please try again later.');
    } finally {
      setLoading(null);
    }
  };

  const handleInAppPurchase = async (pkg: CoinPackage): Promise<boolean> => {
    // Simulate in-app purchase
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  };

  const handleUPIPurchase = async (pkg: CoinPackage): Promise<boolean> => {
    try {
      const upiUrl = `upi://pay?pa=merchant@upi&pn=VidGro&am=${pkg.price}&cu=INR&tn=VidGro Coins Purchase`;
      const canOpen = await Linking.canOpenURL(upiUrl);
      
      if (canOpen) {
        await Linking.openURL(upiUrl);
        return true;
      } else {
        Alert.alert('UPI Not Available', 'Please install a UPI app like Google Pay or PhonePe');
        return false;
      }
    } catch (error) {
      console.error('UPI error:', error);
      return false;
    }
  };

  const handlePaytmPurchase = async (pkg: CoinPackage): Promise<boolean> => {
    try {
      const paytmUrl = `paytmmp://pay?pa=merchant@paytm&pn=VidGro&am=${pkg.price}&cu=INR&tn=VidGro Coins Purchase`;
      const canOpen = await Linking.canOpenURL(paytmUrl);
      
      if (canOpen) {
        await Linking.openURL(paytmUrl);
        return true;
      } else {
        Alert.alert('Paytm Not Available', 'Please install the Paytm app');
        return false;
      }
    } catch (error) {
      console.error('Paytm error:', error);
      return false;
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmer.value * 0.7),
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const renderCoinPackage = (pkg: CoinPackage) => (
    <View key={pkg.id} style={[
      styles.packageCard,
      pkg.popular && styles.popularCard,
      pkg.limitedOffer && styles.limitedOfferCard
    ]}>
      {pkg.popular && (
        <Animated.View style={[styles.popularBadge, pulseAnimatedStyle]}>
          <Crown color="white" size={isVerySmallScreen ? 12 : 14} />
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </Animated.View>
      )}
      
      {pkg.limitedOffer && (
        <Animated.View style={[styles.limitedBadge, shimmerAnimatedStyle]}>
          <Zap color="white" size={isVerySmallScreen ? 10 : 12} />
          <Text style={styles.limitedText}>LIMITED</Text>
        </Animated.View>
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
              <Gift color="#FF4757" size={isVerySmallScreen ? 12 : 14} />
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
        
        <TouchableOpacity
          style={[
            styles.buyButton,
            pkg.popular && styles.popularBuyButton,
            loading === pkg.id && styles.loadingButton
          ]}
          onPress={() => handlePurchase(pkg)}
          disabled={loading !== null}
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
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C2C2C" />
      
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Coins</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Coins color="#F48FB1" size={isVerySmallScreen ? 18 : 20} />
          <Text style={styles.coinCount}>{profile?.coins?.toLocaleString() || '0'}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>🪙{profile?.coins?.toLocaleString() || '0'}</Text>
        </View>

        {/* Limited Offers Banner */}
        <LinearGradient
          colors={['#FF4757', '#FF6B8A']}
          style={styles.offerBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.offerContent}>
            <View style={styles.offerHeader}>
              <Star color="white" size={isVerySmallScreen ? 16 : 18} />
              <Text style={styles.offerTitle}>Limited Time Offer!</Text>
            </View>
            <Text style={styles.offerDescription}>
              Extra bonus coins on 10,000+ packages!
            </Text>
            <View style={styles.countdown}>
              <Clock color="white" size={isVerySmallScreen ? 12 : 14} />
              <Text style={styles.countdownText}>
                Ends in {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPayment === 'inapp' && styles.selectedPayment
              ]}
              onPress={() => setSelectedPayment('inapp')}
            >
              <Smartphone color={selectedPayment === 'inapp' ? '#FF4757' : '#666'} size={20} />
              <Text style={[
                styles.paymentText,
                selectedPayment === 'inapp' && styles.selectedPaymentText
              ]}>
                In-App Purchase
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPayment === 'upi' && styles.selectedPayment
              ]}
              onPress={() => setSelectedPayment('upi')}
            >
              <CreditCard color={selectedPayment === 'upi' ? '#FF4757' : '#666'} size={20} />
              <Text style={[
                styles.paymentText,
                selectedPayment === 'upi' && styles.selectedPaymentText
              ]}>
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPayment === 'paytm' && styles.selectedPayment
              ]}
              onPress={() => setSelectedPayment('paytm')}
            >
              <CreditCard color={selectedPayment === 'paytm' ? '#FF4757' : '#666'} size={20} />
              <Text style={[
                styles.paymentText,
                selectedPayment === 'paytm' && styles.selectedPaymentText
              ]}>
                Paytm
              </Text>
            </TouchableOpacity>
          </View>
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
            🔒 All transactions are secure and encrypted. Your payment information is never stored.
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
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 143, 177, 0.2)',
    paddingHorizontal: isVerySmallScreen ? 8 : 12,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 20,
  },
  coinCount: {
    color: '#F48FB1',
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: 'bold',
    marginLeft: 4,
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
    color: '#FF4757',
  },
  offerBanner: {
    margin: 16,
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  offerContent: {
    alignItems: 'center',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  offerDescription: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 12,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countdownText: {
    fontSize: isVerySmallScreen ? 10 : 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  paymentSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 8 : 12,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: isVerySmallScreen ? 12 : 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  selectedPayment: {
    borderColor: '#FF4757',
    backgroundColor: '#FFF5F5',
  },
  paymentText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  selectedPaymentText: {
    color: '#FF4757',
    fontWeight: '600',
  },
  packagesSection: {
    margin: 16,
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
    borderColor: '#FF4757',
    backgroundColor: '#FFF8F8',
  },
  limitedOfferCard: {
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#FF4757',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 9 : 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  limitedBadge: {
    position: 'absolute',
    top: -6,
    right: 16,
    backgroundColor: '#FFA726',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 6 : 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  limitedText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 8 : 9,
    fontWeight: 'bold',
    marginLeft: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bonusText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#FF4757',
    fontWeight: '600',
    marginLeft: 4,
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