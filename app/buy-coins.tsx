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
import { ArrowLeft, Coins, Crown, Star, Shield, Zap, TrendingUp, Clock, Users, CheckCircle, Sparkles } from 'lucide-react-native';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function BuyCoinsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation values
  const headerScale = useSharedValue(0.8);
  const headerOpacity = useSharedValue(0);
  const cardAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const pulseAnimation = useSharedValue(1);
  const shimmerAnimation = useSharedValue(0);
  const floatingCoins = useSharedValue(0);

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
      socialProof: '2.3K creators started here',
      valueProps: ['Perfect for testing', 'Quick video boost'],
      savings: 10,
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
      valueProps: ['Most popular choice', '20% bonus coins', 'Best for growth'],
      badge: 'RECOMMENDED',
      savings: 20,
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
      valueProps: ['Maximum value', '30% bonus coins', 'Serious creators only'],
      badge: 'BEST VALUE',
      savings: 50,
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
      socialProof: '1.2K+ agencies use this',
      valueProps: ['Agency level', '30% bonus coins', 'Bulk promotion'],
      badge: 'ENTERPRISE',
      savings: 100,
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
      valueProps: ['Ultimate package', '32% bonus coins', 'Viral potential'],
      badge: 'ULTIMATE',
      savings: 200,
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
      socialProof: '100+ legendary creators',
      valueProps: ['Legendary status', '40% bonus coins', 'Unlimited potential'],
      badge: 'LEGENDARY',
      savings: 400,
    },
  ];

  useEffect(() => {
    // Initialize card animations
    coinPackages.forEach(pkg => {
      cardAnimations.current[pkg.id] = new RNAnimated.Value(0);
    });

    // Entrance animations
    headerScale.value = withSpring(1, { damping: 20, stiffness: 100 });
    headerOpacity.value = withTiming(1, { duration: 800 });

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

    // Continuous animations
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) }),
        withTiming(1, { duration: 2000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) })
      ),
      -1,
      true
    );

    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: ReanimatedEasing.linear }),
      -1,
      false
    );

    floatingCoins.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) }),
        withTiming(0, { duration: 4000, easing: ReanimatedEasing.inOut(ReanimatedEasing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handlePurchase = async (packageItem: CoinPackage) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedPackage(packageItem.id);
    setLoading(true);
    
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
            // Simulate purchase process with premium feedback
            setTimeout(() => {
              setShowConfetti(true);
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
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

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

  const floatingAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      floatingCoins.value,
      [0, 1],
      [0, -20]
    );
    return {
      transform: [{ translateY }],
    };
  });

  const renderPackageCard = (packageItem: CoinPackage, index: number) => {
    const cardAnimation = cardAnimations.current[packageItem.id];
    
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
            isSelected && styles.selectedPackage
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
              {packageItem.popular && <Crown size={14} color="white" />}
              {packageItem.bestValue && <Star size={14} color="white" />}
              <Text style={styles.badgeText}>{packageItem.badge}</Text>
            </View>
          )}

          {/* Limited time indicator */}
          {packageItem.limitedTime && (
            <View style={[styles.limitedTimeBadge, { backgroundColor: colors.error }]}>
              <Clock size={12} color="white" />
              <Text style={styles.limitedTimeText}>24H LEFT</Text>
            </View>
          )}

          {/* Main content */}
          <View style={styles.packageContent}>
            {/* Coin amount with floating animation */}
            <Animated.View style={floatingAnimatedStyle}>
              <Text style={[styles.coinAmount, { color: colors.text }]}>
                {packageItem.coins.toLocaleString()}
              </Text>
              <Text style={[styles.coinLabel, { color: colors.textSecondary }]}>COINS</Text>
            </Animated.View>

            {/* Bonus section */}
            {packageItem.bonus > 0 && (
              <View style={[styles.bonusContainer, { backgroundColor: colors.success + '20' }]}>
                <Sparkles size={16} color={colors.success} />
                <Text style={[styles.bonusText, { color: colors.success }]}>
                  +{packageItem.bonus.toLocaleString()} BONUS
                </Text>
              </View>
            )}

            {/* Total coins */}
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Coins</Text>
              <Text style={[styles.totalValue, { color: colors.accent }]}>
                {(packageItem.coins + packageItem.bonus).toLocaleString()}
              </Text>
            </View>

            {/* Value proposition */}
            <View style={styles.valueContainer}>
              <Text style={[styles.costPerThousand, { color: colors.textSecondary }]}>
                ₹{costPerThousand}/1K coins
              </Text>
              {packageItem.originalPrice && (
                <View style={styles.savingsContainer}>
                  <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                    ₹{packageItem.originalPrice}
                  </Text>
                  <Text style={[styles.savings, { color: colors.success }]}>
                    Save ₹{packageItem.savings}
                  </Text>
                </View>
              )}
            </View>

            {/* Price section */}
            <View style={styles.priceSection}>
              <Text style={[styles.currency, { color: colors.textSecondary }]}>₹</Text>
              <Text style={[styles.price, { color: colors.text }]}>{packageItem.price}</Text>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>one-time</Text>
            </View>

            {/* Value props */}
            <View style={styles.valueProps}>
              {packageItem.valueProps.map((prop, propIndex) => (
                <View key={propIndex} style={styles.valueProp}>
                  <CheckCircle size={12} color={colors.success} />
                  <Text style={[styles.valuePropText, { color: colors.textSecondary }]}>{prop}</Text>
                </View>
              ))}
            </View>

            {/* Social proof */}
            <View style={[styles.socialProof, { backgroundColor: colors.primary + '15' }]}>
              <Users size={14} color={colors.primary} />
              <Text style={[styles.socialProofText, { color: colors.primary }]}>
                {packageItem.socialProof}
              </Text>
            </View>

            {/* Purchase button */}
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                packageItem.popular && styles.popularPurchaseButton,
                packageItem.bestValue && styles.bestValuePurchaseButton,
                isSelected && styles.selectedPurchaseButton
              ]}
              onPress={() => handlePurchase(packageItem)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  packageItem.popular 
                    ? ['#FFD700', '#FFA500', '#FF8C00']
                    : packageItem.bestValue
                    ? ['#9D4EDD', '#7B2CBF', '#5A189A']
                    : [colors.primary, colors.secondary]
                }
                style={styles.purchaseButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSelected && loading ? (
                  <View style={styles.loadingContainer}>
                    <RNAnimated.View style={styles.loadingSpinner}>
                      <Coins size={20} color="white" />
                    </RNAnimated.View>
                    <Text style={styles.purchaseButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles.purchaseButtonContent}>
                    <Zap size={18} color="white" />
                    <Text style={styles.purchaseButtonText}>Get Coins Now</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <LinearGradient
        colors={isDark 
          ? ['#1E293B', '#334155', '#475569'] 
          : ['#800080', '#9D4EDD', '#C77DFF']
        }
        style={styles.header}
      >
        <Animated.View style={[styles.headerContent, headerAnimatedStyle]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Animated.View style={pulseAnimatedStyle}>
              <Coins size={32} color="#FFD700" />
            </Animated.View>
            <Text style={styles.headerTitle}>Premium Coins</Text>
            <Text style={styles.headerSubtitle}>Unlock Your Potential</Text>
          </View>
          
          <View style={styles.currentBalance}>
            <Animated.View style={floatingAnimatedStyle}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceAmount}>🪙{profile?.coins?.toLocaleString() || '0'}</Text>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero section */}
        <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(74, 144, 226, 0.1)', 'rgba(0, 212, 255, 0.1)']
              : ['rgba(157, 78, 221, 0.1)', 'rgba(255, 215, 0, 0.1)']
            }
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                🚀 Supercharge Your Growth
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Join 50,000+ creators who've unlocked viral success with VidGro Premium
              </Text>
              
              {/* Live stats */}
              <View style={styles.liveStats}>
                <View style={[styles.liveStat, { backgroundColor: colors.success + '20' }]}>
                  <TrendingUp size={16} color={colors.success} />
                  <Text style={[styles.liveStatText, { color: colors.success }]}>
                    +2.3M views today
                  </Text>
                </View>
                <View style={[styles.liveStat, { backgroundColor: colors.primary + '20' }]}>
                  <Users size={16} color={colors.primary} />
                  <Text style={[styles.liveStatText, { color: colors.primary }]}>
                    1,247 online now
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Package grid */}
        <View style={styles.packagesContainer}>
          <Text style={[styles.packagesTitle, { color: colors.text }]}>
            💎 Choose Your Power Level
          </Text>
          
          <View style={styles.packagesGrid}>
            {coinPackages.map((packageItem, index) => renderPackageCard(packageItem, index))}
          </View>
        </View>

        {/* Trust signals */}
        <View style={[styles.trustSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.trustTitle, { color: colors.text }]}>
            🛡️ Premium Security & Guarantees
          </Text>
          
          <View style={styles.trustSignals}>
            <View style={[styles.trustSignal, { backgroundColor: colors.success + '15' }]}>
              <Shield size={24} color={colors.success} />
              <Text style={[styles.trustSignalTitle, { color: colors.text }]}>Bank-Grade Security</Text>
              <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                256-bit SSL encryption
              </Text>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.primary + '15' }]}>
              <CheckCircle size={24} color={colors.primary} />
              <Text style={[styles.trustSignalTitle, { color: colors.text }]}>Instant Delivery</Text>
              <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                Coins added immediately
              </Text>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.warning + '15' }]}>
              <Star size={24} color={colors.warning} />
              <Text style={[styles.trustSignalTitle, { color: colors.text }]}>30-Day Guarantee</Text>
              <Text style={[styles.trustSignalText, { color: colors.textSecondary }]}>
                Full refund if not satisfied
              </Text>
            </View>
          </View>
        </View>

        {/* Success stories */}
        <View style={[styles.successSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            🌟 Creator Success Stories
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.successScroll}>
            {[
              { name: 'Sarah K.', growth: '2.3M views', quote: 'VidGro took my channel from 1K to 100K subs!' },
              { name: 'Mike R.', growth: '500K views', quote: 'Best investment I made for my content!' },
              { name: 'Lisa M.', growth: '1.8M views', quote: 'Went viral in just 2 weeks with VidGro!' },
            ].map((story, index) => (
              <View key={index} style={[styles.successCard, { backgroundColor: colors.card }]}>
                <View style={[styles.successAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.successAvatarText, { color: colors.primary }]}>
                    {story.name.charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.successName, { color: colors.text }]}>{story.name}</Text>
                <Text style={[styles.successGrowth, { color: colors.success }]}>{story.growth}</Text>
                <Text style={[styles.successQuote, { color: colors.textSecondary }]}>
                  "{story.quote}"
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ROI Calculator */}
        <View style={[styles.roiSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.roiTitle, { color: colors.text }]}>
            📊 Your ROI Potential
          </Text>
          <Text style={[styles.roiSubtitle, { color: colors.textSecondary }]}>
            See what other creators achieved with their investment
          </Text>
          
          <View style={styles.roiCards}>
            <View style={[styles.roiCard, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.roiNumber, { color: colors.primary }]}>847%</Text>
              <Text style={[styles.roiLabel, { color: colors.textSecondary }]}>Avg ROI</Text>
            </View>
            <View style={[styles.roiCard, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.roiNumber, { color: colors.success }]}>12.5K</Text>
              <Text style={[styles.roiLabel, { color: colors.textSecondary }]}>Avg Views</Text>
            </View>
            <View style={[styles.roiCard, { backgroundColor: colors.warning + '15' }]}>
              <Text style={[styles.roiNumber, { color: colors.warning }]}>3.2x</Text>
              <Text style={[styles.roiLabel, { color: colors.textSecondary }]}>Growth Rate</Text>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={[styles.finalCTA, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(157, 78, 221, 0.2)', 'rgba(255, 215, 0, 0.2)']
              : ['rgba(128, 0, 128, 0.1)', 'rgba(255, 215, 0, 0.1)']
            }
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaTitle, { color: colors.text }]}>
              🎯 Ready to Go Viral?
            </Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>
              Don't let your amazing content go unnoticed. Join the creators who are already winning.
            </Text>
            
            <View style={styles.urgencyContainer}>
              <Clock size={16} color={colors.warning} />
              <Text style={[styles.urgencyText, { color: colors.warning }]}>
                Limited time: Extra bonus coins on all packages!
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Security footer */}
        <View style={[styles.securityFooter, { backgroundColor: colors.success + '10' }]}>
          <Shield size={20} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.success }]}>
            🔒 Secured by industry-leading encryption • Trusted by 50,000+ creators
          </Text>
        </View>
      </ScrollView>

      {/* Confetti overlay */}
      {showConfetti && (
        <View style={styles.confettiOverlay}>
          {/* Add confetti animation here */}
          <Text style={styles.confettiText}>🎉</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  currentBalance: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  liveStats: {
    flexDirection: 'row',
    gap: 16,
  },
  liveStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  packagesContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  packagesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  packagesGrid: {
    gap: 16,
  },
  packageCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  popularPackage: {
    borderColor: '#FFD700',
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
      },
    }),
  },
  bestValuePackage: {
    borderColor: '#9D4EDD',
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#9D4EDD',
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 32px rgba(157, 78, 221, 0.3)',
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
    top: -8,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
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
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  limitedTimeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 2,
  },
  limitedTimeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packageContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  coinAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  coinLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  costPerThousand: {
    fontSize: 12,
    marginBottom: 4,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currency: {
    fontSize: 18,
    marginRight: 2,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  valueProps: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valuePropText: {
    fontSize: 12,
    fontWeight: '500',
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  socialProofText: {
    fontSize: 11,
    fontWeight: '600',
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  popularPurchaseButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)',
      },
    }),
  },
  bestValuePurchaseButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#9D4EDD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(157, 78, 221, 0.4)',
      },
    }),
  },
  selectedPurchaseButton: {
    transform: [{ scale: 1.05 }],
  },
  purchaseButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingSpinner: {
    // Add rotation animation here if needed
  },
  trustSection: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  trustTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  trustSignals: {
    gap: 16,
  },
  trustSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  trustSignalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  trustSignalText: {
    fontSize: 12,
    flex: 1,
  },
  successSection: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  successScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  successCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
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
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  successAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  successName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  successGrowth: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successQuote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  roiSection: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  roiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  roiSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  roiCards: {
    flexDirection: 'row',
    gap: 12,
  },
  roiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  roiNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roiLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  finalCTA: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  ctaGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  confettiText: {
    fontSize: 100,
  },
});