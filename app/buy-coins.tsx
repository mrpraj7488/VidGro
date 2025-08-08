import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Dimensions,
  Platform,
  Animated as RNAnimated,
  Easing
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Coins, Crown, Star, Shield, Zap, TrendingUp, Clock, Users, CircleCheck as CheckCircle, Sparkles } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getSupabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useFeatureFlag } from '../hooks/useFeatureFlags';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTablet = screenWidth >= 768;

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  originalPrice?: number;
  bonus: number;
  popular: boolean;
  bestValue: boolean;
  limitedTime: boolean;
  socialProof: string;
  valueProps: string[];
  badge?: string;
  savings: number;
  productId: string; // For in-app purchases
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function BuyCoinsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { config } = useConfig();
  const coinsEnabled = useFeatureFlag('coinsEnabled');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const coinPackages: CoinPackage[] = [
    {
      id: 'starter',
      coins: 1000,
      price: 29,
      originalPrice: 39,
      bonus: 100,
      popular: false,
      bestValue: false,
      limitedTime: true,
      socialProof: '2.3K creators started',
      valueProps: ['Perfect for testing', 'Quick boost'],
      savings: 10,
      productId: 'com.vidgro.coins.starter',
    },
    {
      id: 'creator',
      coins: 2500,
      price: 69,
      originalPrice: 89,
      bonus: 500,
      popular: true,
      bestValue: false,
      limitedTime: false,
      socialProof: '15K+ creators love this',
      valueProps: ['Most popular', '20% bonus', 'Best for growth'],
      badge: 'RECOMMENDED',
      savings: 20,
      productId: 'com.vidgro.coins.creator',
    },
    {
      id: 'pro',
      coins: 5000,
      price: 129,
      originalPrice: 179,
      bonus: 1500,
      popular: false,
      bestValue: true,
      limitedTime: false,
      socialProof: '8K+ pros upgraded',
      valueProps: ['Maximum value', '30% bonus', 'Serious creators'],
      badge: 'BEST VALUE',
      savings: 50,
      productId: 'com.vidgro.coins.pro',
    },
    {
      id: 'enterprise',
      coins: 10000,
      price: 249,
      originalPrice: 349,
      bonus: 3000,
      popular: false,
      bestValue: false,
      limitedTime: false,
      socialProof: '1.2K+ agencies',
      valueProps: ['Agency level', '30% bonus', 'Bulk promotion'],
      badge: 'ENTERPRISE',
      savings: 100,
      productId: 'com.vidgro.coins.enterprise',
    },
    {
      id: 'ultimate',
      coins: 25000,
      price: 499,
      originalPrice: 699,
      bonus: 8000,
      popular: false,
      bestValue: false,
      limitedTime: false,
      socialProof: '500+ top creators',
      valueProps: ['Ultimate package', '32% bonus', 'Viral potential'],
      badge: 'ULTIMATE',
      savings: 200,
      productId: 'com.vidgro.coins.ultimate',
    },
    {
      id: 'legendary',
      coins: 50000,
      price: 899,
      originalPrice: 1299,
      bonus: 20000,
      popular: false,
      bestValue: false,
      limitedTime: false,
      socialProof: '100+ legendary',
      valueProps: ['Legendary status', '40% bonus', 'Unlimited potential'],
      badge: 'LEGENDARY',
      savings: 400,
      productId: 'com.vidgro.coins.legendary',
    },
  ];

  // Animation values
  const cardAnimations = useRef<{ [key: string]: RNAnimated.Value }>(
    coinPackages.reduce((acc, pkg) => {
      acc[pkg.id] = new RNAnimated.Value(0);
      return acc;
    }, {} as { [key: string]: RNAnimated.Value })
  );
  const buttonAnimations = useRef<{ [key: string]: Animated.SharedValue<number> }>(
    coinPackages.reduce((acc, pkg) => {
      acc[pkg.id] = useSharedValue(1);
      return acc;
    }, {} as { [key: string]: Animated.SharedValue<number> })
  );
  const shimmerAnimation = useSharedValue(0);

  useEffect(() => {
    initializeIAP();
    
    // Staggered card entrance
    coinPackages.forEach((pkg, index) => {
      RNAnimated.timing(cardAnimations.current[pkg.id], {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    });

    // Continuous shimmer animation
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );

    return () => {
      // Only end connection if IAP was available
      if (iapAvailable && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        import('react-native-iap').then(InAppPurchases => {
          InAppPurchases.endConnection();
        }).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []);

  const initializeIAP = async () => {
    try {
      // Only initialize IAP on iOS and Android platforms
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('IAP not available on web platform - using web fallback');
        setIapAvailable(false);
        return;
      }

      // Dynamically import IAP only on supported platforms
      const InAppPurchases = await import('react-native-iap');
      
      const result = await InAppPurchases.initConnection();
      console.log('IAP connection result:', result);
      setIapAvailable(true);

      if (Platform.OS === 'android') {
        await InAppPurchases.flushFailedPurchasesCachedAsPendingAndroid();
      }

      // Get available products
      const productIds = coinPackages.map(pkg => pkg.productId);
      const availableProducts = await InAppPurchases.getProducts({ skus: productIds });
      setProducts(availableProducts);
      console.log('Available products:', availableProducts);
    } catch (error) {
      console.log('IAP not available - using web fallback:', error);
      setIapAvailable(false);
    }
  };

  const recordPurchaseTransaction = async (packageItem: CoinPackage, transactionId: string) => {
    if (!user) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: packageItem.coins + packageItem.bonus,
          transaction_type: 'purchase',
          description: `Purchased ${packageItem.coins.toLocaleString()} + ${packageItem.bonus.toLocaleString()} bonus coins`,
          reference_id: transactionId,
          metadata: {
            package_id: packageItem.id,
            original_coins: packageItem.coins,
            bonus_coins: packageItem.bonus,
            price_paid: packageItem.price,
            platform: Platform.OS
          }
        });

      if (error) {
        console.error('Error recording transaction:', error);
      }

      // Update user's coin balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          coins: (profile?.coins || 0) + packageItem.coins + packageItem.bonus 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating coin balance:', updateError);
      }
    } catch (error) {
      console.error('Error in recordPurchaseTransaction:', error);
    }
  };

  const handlePurchase = async (packageItem: CoinPackage) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Animate button
    buttonAnimations.current[packageItem.id].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1.05, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedPackage(packageItem.id);
    setLoading(true);

    try {
      if (!iapAvailable) {
        // Web fallback - simulate purchase
        Alert.alert(
          '💎 Confirm Premium Purchase',
          `🪙 ${packageItem.coins.toLocaleString()} + ${packageItem.bonus.toLocaleString()} bonus coins\n💰 Total: ${(packageItem.coins + packageItem.bonus).toLocaleString()} coins\n💳 Price: ₹${packageItem.price}\n\n✨ ${packageItem.socialProof}`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              setSelectedPackage(null);
              setLoading(false);
            }},
            { 
              text: '🚀 Purchase Now', 
              onPress: async () => {
                // Simulate purchase process
                setTimeout(async () => {
                  await recordPurchaseTransaction(packageItem, `web_${Date.now()}`);
                  
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  
                  Alert.alert(
                    '🎉 Purchase Successful!',
                    `🪙 ${(packageItem.coins + packageItem.bonus).toLocaleString()} coins added to your account!\n\n🎯 You're now ready to promote your videos and reach viral status!\n\n💎 Thank you for choosing VidGro Premium!`,
                    [{ text: '🚀 Start Promoting', onPress: () => {
                      refreshProfile();
                      router.replace('/(tabs)/promote');
                    }}]
                  );
                  setLoading(false);
                  setSelectedPackage(null);
                }, 2000);
              }
            }
          ]
        );
      } else {
        // Native in-app purchase
        try {
          // Dynamically import IAP for native platforms
          const InAppPurchases = await import('react-native-iap');
          
          const purchase = await InAppPurchases.requestPurchase({
            sku: packageItem.productId,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
          });

          console.log('Purchase result:', purchase);

          if (purchase) {
            // Record the transaction
            await recordPurchaseTransaction(packageItem, purchase.transactionId || `iap_${Date.now()}`);

            // Finish the transaction
            await InAppPurchases.finishTransaction({ purchase, isConsumable: true });

            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
              '🎉 Purchase Successful!',
              `🪙 ${(packageItem.coins + packageItem.bonus).toLocaleString()} coins added to your account!\n\n🎯 You're now ready to promote your videos and reach viral status!\n\n💎 Thank you for choosing VidGro Premium!`,
              [{ text: '🚀 Start Promoting', onPress: () => {
                refreshProfile();
                router.replace('/(tabs)/promote');
              }}]
            );
          }
        } catch (error: any) {
          console.error('Purchase error:', error);
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-screenWidth, screenWidth]
    );
    return {
      transform: [{ translateX }],
    };
  });

  const renderPackageCard = (packageItem: CoinPackage, index: number) => {
    const cardAnimation = cardAnimations.current[packageItem.id];
    const buttonAnimation = buttonAnimations.current[packageItem.id];
    
    const animatedStyle = {
      opacity: cardAnimation,
      transform: [
        {
          translateY: cardAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          }),
        },
        {
          scale: cardAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    };

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: buttonAnimation.value }],
    }));

    const isSelected = selectedPackage === packageItem.id;
    const costPerThousand = (packageItem.price / (packageItem.coins + packageItem.bonus) * 1000).toFixed(1);

    return (
      <RNAnimated.View key={packageItem.id} style={[animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.packageCard,
            { backgroundColor: colors.surface },
            packageItem.popular && styles.popularPackage,
            packageItem.bestValue && styles.bestValuePackage,
            isSelected && styles.selectedPackage,
            isTablet && styles.packageCardTablet
          ]}
          onPress={() => handlePurchase(packageItem)}
          disabled={loading}
          activeOpacity={0.9}
        >
          {/* Shimmer effect for popular packages */}
          {packageItem.popular && (
            <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255, 215, 0, 0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}

          {/* Badge */}
          {packageItem.badge && (
            <View style={[
              styles.packageBadge,
              packageItem.popular && styles.popularBadge,
              packageItem.bestValue && styles.bestValueBadge
            ]}>
              {packageItem.popular && <Crown size={10} color="white" />}
              {packageItem.bestValue && <Star size={10} color="white" />}
              <Text style={styles.badgeText}>
                {packageItem.badge}
              </Text>
            </View>
          )}

          {/* Limited time indicator */}
          {packageItem.limitedTime && (
            <View style={[styles.limitedTimeBadge, { backgroundColor: colors.error }]}>
              <Clock size={8} color="white" />
              <Text style={styles.limitedTimeText}>
                24H LEFT
              </Text>
            </View>
          )}

          {/* Responsive Layout Content */}
          <View style={[styles.horizontalContent, isTablet && styles.horizontalContentTablet]}>
            {/* Left side - Coin info */}
            <View style={styles.leftSection}>
              <Text style={[styles.coinAmount, { color: colors.text }, isTablet && styles.coinAmountTablet]}>
                {packageItem.coins.toLocaleString()}
              </Text>
              <Text style={[styles.coinLabel, { color: colors.textSecondary }]}>
                COINS
              </Text>

              {/* Bonus section */}
              {packageItem.bonus > 0 && (
                <View style={[styles.bonusContainer, { backgroundColor: colors.success + '20' }]}>
                  <Sparkles size={10} color={colors.success} />
                  <Text style={[styles.bonusText, { color: colors.success }]}>
                    +{packageItem.bonus.toLocaleString()} BONUS
                  </Text>
                </View>
              )}

              {/* Total coins */}
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: colors.accent }, isTablet && styles.totalValueTablet]}>
                  {(packageItem.coins + packageItem.bonus).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Right side - Price and purchase */}
            <View style={styles.rightSection}>
              {/* Price section */}
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text style={[styles.currency, { color: colors.textSecondary }]}>₹</Text>
                  <Text style={[styles.price, { color: colors.text }, isTablet && styles.priceTablet]}>
                    {packageItem.price}
                  </Text>
                </View>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  one-time
                </Text>
              </View>

              {/* Value info */}
              <View style={styles.valueInfo}>
                <Text style={[styles.costPerThousand, { color: colors.textSecondary }]}>
                  ₹{costPerThousand}/1K coins
                </Text>
                {packageItem.originalPrice && (
                  <View style={styles.savingsRow}>
                    <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                      ₹{packageItem.originalPrice}
                    </Text>
                    <Text style={[styles.savings, { color: colors.success }]}>
                      Save ₹{packageItem.savings}
                    </Text>
                  </View>
                )}
              </View>

              {/* Animated Purchase button */}
              <AnimatedTouchableOpacity
                style={[
                  styles.purchaseButton,
                  packageItem.popular && styles.popularPurchaseButton,
                  packageItem.bestValue && styles.bestValuePurchaseButton,
                  isSelected && styles.selectedPurchaseButton,
                  buttonAnimatedStyle
                ]}
                onPress={() => handlePurchase(packageItem)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    packageItem.popular 
                      ? ['#FFD700', '#FFA500']
                      : packageItem.bestValue
                      ? ['#9D4EDD', '#7B2CBF']
                      : [colors.primary, colors.secondary]
                  }
                  style={styles.purchaseButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isSelected && loading ? (
                    <View style={styles.loadingContainer}>
                      <RNAnimated.View style={styles.loadingSpinner}>
                        <Coins size={14} color="white" />
                      </RNAnimated.View>
                      <Text style={styles.purchaseButtonText}>
                        Processing...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.purchaseButtonContent}>
                      <Zap size={12} color="white" />
                      <Text style={styles.purchaseButtonText}>
                        Get Now
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </AnimatedTouchableOpacity>
            </View>
          </View>

          {/* Bottom section - Value props and social proof */}
          <View style={styles.bottomSection}>
            {/* Value props - Responsive for different screen sizes */}
            <View style={[styles.valueProps, isTablet && styles.valuePropsTablet]}>
              {packageItem.valueProps.slice(0, isTablet ? 3 : 2).map((prop, propIndex) => (
                <View key={propIndex} style={styles.valueProp}>
                  <CheckCircle size={8} color={colors.success} />
                  <Text style={[styles.valuePropText, { color: colors.textSecondary }]}>
                    {prop}
                  </Text>
                </View>
              ))}
            </View>

            {/* Social proof - Responsive */}
            <View style={[styles.socialProof, { backgroundColor: colors.primary + '15' }]}>
              <Users size={10} color={colors.primary} />
              <Text style={[styles.socialProofText, { color: colors.primary }]}>
                {packageItem.socialProof}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Updated Header with coin balance */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy Coins</Text>
          
          {/* Coin balance in header */}
          <View style={styles.headerCoinDisplay}>
            <View style={[styles.headerCoinBadge, { 
              backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.15)',
              borderColor: isDark ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.2)'
            }]}>
              <Text style={styles.headerCoinIcon}>🪙</Text>
              <Text style={styles.headerCoinText}>{profile?.coins?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        {/* Package grid - Responsive layout */}
        <View style={styles.packagesContainer}>
          <Text style={[styles.packagesTitle, { color: colors.text }, isTablet && styles.packagesTitleTablet]}>
            💎 Choose Your Power Level
          </Text>
          
          <View style={[styles.packagesGrid, isTablet && styles.packagesGridTablet]}>
            {coinPackages.map((packageItem, index) => renderPackageCard(packageItem, index))}
          </View>
        </View>

        {/* Trust signals - Responsive */}
        <View style={[styles.trustSection, { backgroundColor: colors.surface }, isTablet && styles.trustSectionTablet]}>
          <Text style={[styles.trustTitle, { color: colors.text }]}>
            🛡️ Security & Guarantees
          </Text>
          
          <View style={[styles.trustSignals, isTablet && styles.trustSignalsTablet]}>
            <View style={[styles.trustSignal, { backgroundColor: colors.success + '15' }]}>
              <Shield size={16} color={colors.success} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  Bank-Grade Security
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  256-bit SSL encryption
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.primary + '15' }]}>
              <CheckCircle size={16} color={colors.primary} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  Instant Delivery
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  Coins added immediately
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.warning + '15' }]}>
              <Star size={16} color={colors.warning} />
              <View style={styles.trustContent}>
                <Text style={[styles.trustSignalTitle, { color: colors.text }]}>
                  30-Day Guarantee
                </Text>
                <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                  Full refund if not satisfied
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security footer - Responsive */}
        <View style={[styles.securityFooter, { backgroundColor: colors.success + '10' }]}>
          <Shield size={14} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.success }]}>
            🔒 Secured by encryption • Trusted by 50,000+ creators
          </Text>
        </View>
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerCoinDisplay: {
    flexShrink: 0,
  },
  headerCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: 'center',
  },
  headerCoinIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  headerCoinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  packagesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 20,
  },
  packagesTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  packagesTitleTablet: {
    fontSize: 28,
    marginBottom: 32,
  },
  packagesGrid: {
    gap: 12,
  },
  packagesGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  packageCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  packageCardTablet: {
    width: (screenWidth - 120) / 2, // 2 columns on tablet
    padding: 24,
  },
  popularPackage: {
    borderColor: '#FFD700',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOpacity: 0.2,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.2)',
      },
    }),
  },
  bestValuePackage: {
    borderColor: '#9D4EDD',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#9D4EDD',
        shadowOpacity: 0.2,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(157, 78, 221, 0.2)',
      },
    }),
  },
  selectedPackage: {
    transform: [{ scale: 1.02 }],
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: screenWidth,
  },
  packageBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    zIndex: 2,
  },
  popularBadge: {
    backgroundColor: '#FFD700',
  },
  bestValueBadge: {
    backgroundColor: '#9D4EDD',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  limitedTimeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    zIndex: 2,
  },
  limitedTimeText: {
    color: 'white',
    fontSize: 7,
    fontWeight: 'bold',
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 12,
  },
  horizontalContentTablet: {
    marginBottom: 16,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: isTablet ? 120 : 100,
  },
  coinAmount: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  coinAmountTablet: {
    fontSize: 32,
  },
  coinLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    gap: 3,
  },
  bonusText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  totalContainer: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 9,
    marginBottom: 2,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  totalValueTablet: {
    fontSize: 20,
  },
  priceSection: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 12,
    marginRight: 2,
  },
  price: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceTablet: {
    fontSize: 28,
  },
  priceLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  valueInfo: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  costPerThousand: {
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 2,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  originalPrice: {
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  purchaseButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: isTablet ? 100 : 80,
  },
  popularPurchaseButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 3px 12px rgba(255, 215, 0, 0.3)',
      },
    }),
  },
  bestValuePurchaseButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#9D4EDD',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 3px 12px rgba(157, 78, 221, 0.3)',
      },
    }),
  },
  selectedPurchaseButton: {
    transform: [{ scale: 1.02 }],
  },
  purchaseButtonGradient: {
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 16 : 12,
    alignItems: 'center',
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: isTablet ? 13 : 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingSpinner: {
    // Add rotation animation here if needed
  },
  bottomSection: {
    zIndex: 2,
  },
  valueProps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  valuePropsTablet: {
    gap: 12,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  valuePropText: {
    fontSize: isTablet ? 10 : 8,
    fontWeight: '500',
    flex: 1,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  socialProofText: {
    fontSize: isTablet ? 10 : 8,
    fontWeight: '600',
  },
  trustSection: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
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
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  trustSectionTablet: {
    margin: 24,
    padding: 32,
  },
  trustTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  trustSignals: {
    gap: 12,
  },
  trustSignalsTablet: {
    flexDirection: 'row',
    gap: 20,
  },
  trustSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    flex: isTablet ? 1 : undefined,
  },
  trustContent: {
    flex: 1,
  },
  trustSignalTitle: {
    fontSize: isVerySmallScreen ? 12 : 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  trustSignalText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    lineHeight: 16,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  securityText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },
});