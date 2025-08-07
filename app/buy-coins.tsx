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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

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
    },
  ];

  // Animation values
  const headerScale = useSharedValue(0.8);
  const headerOpacity = useSharedValue(0);
  const cardAnimations = useRef<{ [key: string]: RNAnimated.Value }>(
    coinPackages.reduce((acc, pkg) => {
      acc[pkg.id] = new RNAnimated.Value(0);
      return acc;
    }, {} as { [key: string]: RNAnimated.Value })
  );
  const pulseAnimation = useSharedValue(1);
  const shimmerAnimation = useSharedValue(0);
  const floatingCoins = useSharedValue(0);

  useEffect(() => {
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
              {packageItem.popular && <Crown size={isVerySmallScreen ? 10 : 12} color="white" />}
              {packageItem.bestValue && <Star size={isVerySmallScreen ? 10 : 12} color="white" />}
              <Text style={[styles.badgeText, { fontSize: isVerySmallScreen ? 9 : 10 }]}>
                {packageItem.badge}
              </Text>
            </View>
          )}

          {/* Limited time indicator */}
          {packageItem.limitedTime && (
            <View style={[styles.limitedTimeBadge, { backgroundColor: colors.error }]}>
              <Clock size={10} color="white" />
              <Text style={[styles.limitedTimeText, { fontSize: isVerySmallScreen ? 8 : 9 }]}>
                24H LEFT
              </Text>
            </View>
          )}

          {/* Main content */}
          <View style={styles.packageContent}>
            {/* Coin amount with floating animation */}
            <Animated.View style={floatingAnimatedStyle}>
              <Text style={[
                styles.coinAmount, 
                { 
                  color: colors.text,
                  fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32
                }
              ]}>
                {packageItem.coins.toLocaleString()}
              </Text>
              <Text style={[
                styles.coinLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                COINS
              </Text>
            </Animated.View>

            {/* Bonus section */}
            {packageItem.bonus > 0 && (
              <View style={[styles.bonusContainer, { backgroundColor: colors.success + '20' }]}>
                <Sparkles size={isVerySmallScreen ? 12 : 14} color={colors.success} />
                <Text style={[
                  styles.bonusText, 
                  { 
                    color: colors.success,
                    fontSize: isVerySmallScreen ? 10 : 11
                  }
                ]}>
                  +{packageItem.bonus.toLocaleString()} BONUS
                </Text>
              </View>
            )}

            {/* Total coins */}
            <View style={styles.totalContainer}>
              <Text style={[
                styles.totalLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                Total Coins
              </Text>
              <Text style={[
                styles.totalValue, 
                { 
                  color: colors.accent,
                  fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 22
                }
              ]}>
                {(packageItem.coins + packageItem.bonus).toLocaleString()}
              </Text>
            </View>

            {/* Value proposition */}
            <View style={styles.valueContainer}>
              <Text style={[
                styles.costPerThousand, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                ₹{costPerThousand}/1K coins
              </Text>
              {packageItem.originalPrice && (
                <View style={styles.savingsContainer}>
                  <Text style={[
                    styles.originalPrice, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 10 : 11
                    }
                  ]}>
                    ₹{packageItem.originalPrice}
                  </Text>
                  <Text style={[
                    styles.savings, 
                    { 
                      color: colors.success,
                      fontSize: isVerySmallScreen ? 10 : 11
                    }
                  ]}>
                    Save ₹{packageItem.savings}
                  </Text>
                </View>
              )}
            </View>

            {/* Price section */}
            <View style={styles.priceSection}>
              <Text style={[
                styles.currency, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 14 : 16
                }
              ]}>
                ₹
              </Text>
              <Text style={[
                styles.price, 
                { 
                  color: colors.text,
                  fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32
                }
              ]}>
                {packageItem.price}
              </Text>
              <Text style={[
                styles.priceLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                one-time
              </Text>
            </View>

            {/* Value props - Compact for mobile */}
            <View style={styles.valueProps}>
              {packageItem.valueProps.slice(0, isVerySmallScreen ? 2 : 3).map((prop, propIndex) => (
                <View key={propIndex} style={styles.valueProp}>
                  <CheckCircle size={isVerySmallScreen ? 10 : 12} color={colors.success} />
                  <Text style={[
                    styles.valuePropText, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 10 : 11
                    }
                  ]}>
                    {prop}
                  </Text>
                </View>
              ))}
            </View>

            {/* Social proof - Compact */}
            <View style={[styles.socialProof, { backgroundColor: colors.primary + '15' }]}>
              <Users size={isVerySmallScreen ? 10 : 12} color={colors.primary} />
              <Text style={[
                styles.socialProofText, 
                { 
                  color: colors.primary,
                  fontSize: isVerySmallScreen ? 9 : 10
                }
              ]}>
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
                      <Coins size={isVerySmallScreen ? 16 : 18} color="white" />
                    </RNAnimated.View>
                    <Text style={[
                      styles.purchaseButtonText,
                      { fontSize: isVerySmallScreen ? 13 : 14 }
                    ]}>
                      Processing...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.purchaseButtonContent}>
                    <Zap size={isVerySmallScreen ? 14 : 16} color="white" />
                    <Text style={[
                      styles.purchaseButtonText,
                      { fontSize: isVerySmallScreen ? 13 : 14 }
                    ]}>
                      Get Coins Now
                    </Text>
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
      {/* Compact Header for Mobile */}
      <LinearGradient
        colors={isDark 
          ? ['#1E293B', '#334155', '#475569'] 
          : ['#800080', '#9D4EDD', '#C77DFF']
        }
        style={[styles.header, { paddingBottom: isVerySmallScreen ? 12 : 16 }]}
      >
        <Animated.View style={[styles.headerContent, headerAnimatedStyle]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={isVerySmallScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Animated.View style={pulseAnimatedStyle}>
              <Coins size={isVerySmallScreen ? 24 : 28} color="#FFD700" />
            </Animated.View>
            <Text style={[
              styles.headerTitle,
              { fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24 }
            ]}>
              Premium Coins
            </Text>
            <Text style={[
              styles.headerSubtitle,
              { fontSize: isVerySmallScreen ? 11 : 12 }
            ]}>
              Unlock Your Potential
            </Text>
          </View>
          
          <View style={styles.currentBalance}>
            <Animated.View style={floatingAnimatedStyle}>
              <Text style={[
                styles.balanceLabel,
                { fontSize: isVerySmallScreen ? 8 : 9 }
              ]}>
                Balance
              </Text>
              <Text style={[
                styles.balanceAmount,
                { fontSize: isVerySmallScreen ? 11 : 12 }
              ]}>
                🪙{profile?.coins?.toLocaleString() || '0'}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Compact Hero section for mobile */}
        <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(74, 144, 226, 0.1)', 'rgba(0, 212, 255, 0.1)']
              : ['rgba(157, 78, 221, 0.1)', 'rgba(255, 215, 0, 0.1)']
            }
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={[
                styles.heroTitle, 
                { 
                  color: colors.text,
                  fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24
                }
              ]}>
                🚀 Supercharge Your Growth
              </Text>
              <Text style={[
                styles.heroSubtitle, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 12 : 13
                }
              ]}>
                Join 50,000+ creators who've unlocked viral success
              </Text>
              
              {/* Compact live stats */}
              <View style={styles.liveStats}>
                <View style={[styles.liveStat, { backgroundColor: colors.success + '20' }]}>
                  <TrendingUp size={isVerySmallScreen ? 12 : 14} color={colors.success} />
                  <Text style={[
                    styles.liveStatText, 
                    { 
                      color: colors.success,
                      fontSize: isVerySmallScreen ? 9 : 10
                    }
                  ]}>
                    +2.3M views today
                  </Text>
                </View>
                <View style={[styles.liveStat, { backgroundColor: colors.primary + '20' }]}>
                  <Users size={isVerySmallScreen ? 12 : 14} color={colors.primary} />
                  <Text style={[
                    styles.liveStatText, 
                    { 
                      color: colors.primary,
                      fontSize: isVerySmallScreen ? 9 : 10
                    }
                  ]}>
                    1,247 online
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Package grid - Optimized for mobile */}
        <View style={styles.packagesContainer}>
          <Text style={[
            styles.packagesTitle, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 22
            }
          ]}>
            💎 Choose Your Power Level
          </Text>
          
          <View style={styles.packagesGrid}>
            {coinPackages.map((packageItem, index) => renderPackageCard(packageItem, index))}
          </View>
        </View>

        {/* Compact Trust signals */}
        <View style={[styles.trustSection, { backgroundColor: colors.surface }]}>
          <Text style={[
            styles.trustTitle, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            🛡️ Security & Guarantees
          </Text>
          
          <View style={styles.trustSignals}>
            <View style={[styles.trustSignal, { backgroundColor: colors.success + '15' }]}>
              <Shield size={isVerySmallScreen ? 18 : 20} color={colors.success} />
              <View style={styles.trustContent}>
                <Text style={[
                  styles.trustSignalTitle, 
                  { 
                    color: colors.text,
                    fontSize: isVerySmallScreen ? 12 : 13
                  }
                ]}>
                  Bank-Grade Security
                </Text>
                <Text style={[
                  styles.trustSignalText, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isVerySmallScreen ? 10 : 11
                  }
                ]}>
                  256-bit SSL encryption
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.primary + '15' }]}>
              <CheckCircle size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
              <View style={styles.trustContent}>
                <Text style={[
                  styles.trustSignalTitle, 
                  { 
                    color: colors.text,
                    fontSize: isVerySmallScreen ? 12 : 13
                  }
                ]}>
                  Instant Delivery
                </Text>
                <Text style={[
                  styles.trustSignalText, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isVerySmallScreen ? 10 : 11
                  }
                ]}>
                  Coins added immediately
                </Text>
              </View>
            </View>
            
            <View style={[styles.trustSignal, { backgroundColor: colors.warning + '15' }]}>
              <Star size={isVerySmallScreen ? 18 : 20} color={colors.warning} />
              <View style={styles.trustContent}>
                <Text style={[
                  styles.trustSignalTitle, 
                  { 
                    color: colors.text,
                    fontSize: isVerySmallScreen ? 12 : 13
                  }
                ]}>
                  30-Day Guarantee
                </Text>
                <Text style={[
                  styles.trustSignalText, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isVerySmallScreen ? 10 : 11
                  }
                ]}>
                  Full refund if not satisfied
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Compact Success stories */}
        <View style={[styles.successSection, { backgroundColor: colors.surface }]}>
          <Text style={[
            styles.successTitle, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            🌟 Creator Success Stories
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.successScroll}>
            {[
              { name: 'Sarah K.', growth: '2.3M views', quote: 'VidGro took my channel from 1K to 100K!' },
              { name: 'Mike R.', growth: '500K views', quote: 'Best investment for my content!' },
              { name: 'Lisa M.', growth: '1.8M views', quote: 'Went viral in just 2 weeks!' },
            ].map((story, index) => (
              <View key={index} style={[
                styles.successCard, 
                { 
                  backgroundColor: colors.card,
                  width: isVerySmallScreen ? 160 : 180
                }
              ]}>
                <View style={[styles.successAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[
                    styles.successAvatarText, 
                    { 
                      color: colors.primary,
                      fontSize: isVerySmallScreen ? 16 : 18
                    }
                  ]}>
                    {story.name.charAt(0)}
                  </Text>
                </View>
                <Text style={[
                  styles.successName, 
                  { 
                    color: colors.text,
                    fontSize: isVerySmallScreen ? 12 : 13
                  }
                ]}>
                  {story.name}
                </Text>
                <Text style={[
                  styles.successGrowth, 
                  { 
                    color: colors.success,
                    fontSize: isVerySmallScreen ? 10 : 11
                  }
                ]}>
                  {story.growth}
                </Text>
                <Text style={[
                  styles.successQuote, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isVerySmallScreen ? 9 : 10
                  }
                ]} numberOfLines={2}>
                  "{story.quote}"
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Compact ROI Calculator */}
        <View style={[styles.roiSection, { backgroundColor: colors.surface }]}>
          <Text style={[
            styles.roiTitle, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            📊 Your ROI Potential
          </Text>
          <Text style={[
            styles.roiSubtitle, 
            { 
              color: colors.textSecondary,
              fontSize: isVerySmallScreen ? 11 : 12
            }
          ]}>
            See what other creators achieved
          </Text>
          
          <View style={styles.roiCards}>
            <View style={[styles.roiCard, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[
                styles.roiNumber, 
                { 
                  color: colors.primary,
                  fontSize: isVerySmallScreen ? 18 : 20
                }
              ]}>
                847%
              </Text>
              <Text style={[
                styles.roiLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                Avg ROI
              </Text>
            </View>
            <View style={[styles.roiCard, { backgroundColor: colors.success + '15' }]}>
              <Text style={[
                styles.roiNumber, 
                { 
                  color: colors.success,
                  fontSize: isVerySmallScreen ? 18 : 20
                }
              ]}>
                12.5K
              </Text>
              <Text style={[
                styles.roiLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                Avg Views
              </Text>
            </View>
            <View style={[styles.roiCard, { backgroundColor: colors.warning + '15' }]}>
              <Text style={[
                styles.roiNumber, 
                { 
                  color: colors.warning,
                  fontSize: isVerySmallScreen ? 18 : 20
                }
              ]}>
                3.2x
              </Text>
              <Text style={[
                styles.roiLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isVerySmallScreen ? 10 : 11
                }
              ]}>
                Growth
              </Text>
            </View>
          </View>
        </View>

        {/* Compact Final CTA */}
        <View style={[styles.finalCTA, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(157, 78, 221, 0.2)', 'rgba(255, 215, 0, 0.2)']
              : ['rgba(128, 0, 128, 0.1)', 'rgba(255, 215, 0, 0.1)']
            }
            style={styles.ctaGradient}
          >
            <Text style={[
              styles.ctaTitle, 
              { 
                color: colors.text,
                fontSize: isVerySmallScreen ? 18 : 20
              }
            ]}>
              🎯 Ready to Go Viral?
            </Text>
            <Text style={[
              styles.ctaSubtitle, 
              { 
                color: colors.textSecondary,
                fontSize: isVerySmallScreen ? 12 : 13
              }
            ]}>
              Don't let your amazing content go unnoticed.
            </Text>
            
            <View style={styles.urgencyContainer}>
              <Clock size={isVerySmallScreen ? 12 : 14} color={colors.warning} />
              <Text style={[
                styles.urgencyText, 
                { 
                  color: colors.warning,
                  fontSize: isVerySmallScreen ? 11 : 12
                }
              ]}>
                Limited time: Extra bonus coins!
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Compact Security footer */}
        <View style={[styles.securityFooter, { backgroundColor: colors.success + '10' }]}>
          <Shield size={isVerySmallScreen ? 16 : 18} color={colors.success} />
          <Text style={[
            styles.securityText, 
            { 
              color: colors.success,
              fontSize: isVerySmallScreen ? 10 : 11
            }
          ]}>
            🔒 Secured by encryption • Trusted by 50,000+ creators
          </Text>
        </View>
      </ScrollView>

      {/* Confetti overlay */}
      {showConfetti && (
        <View style={styles.confettiOverlay}>
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
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
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
    padding: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: isVerySmallScreen ? 8 : 12,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  currentBalance: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: isVerySmallScreen ? 60 : 70,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  balanceAmount: {
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
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  heroGradient: {
    padding: isVerySmallScreen ? 16 : 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 18 : 20,
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  liveStats: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 8 : 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  liveStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 12,
    gap: 4,
  },
  liveStatText: {
    fontWeight: '600',
  },
  packagesContainer: {
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 20 : 24,
  },
  packagesTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isVerySmallScreen ? 16 : 20,
    letterSpacing: 0.5,
  },
  packagesGrid: {
    gap: isVerySmallScreen ? 12 : 16,
  },
  packageCard: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
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
  popularPackage: {
    borderColor: '#FFD700',
    borderWidth: isVerySmallScreen ? 2 : 3,
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
    borderWidth: isVerySmallScreen ? 2 : 3,
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
    top: isVerySmallScreen ? -6 : -8,
    right: isVerySmallScreen ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 4 : 6,
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
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  limitedTimeBadge: {
    position: 'absolute',
    top: isVerySmallScreen ? 12 : 16,
    left: isVerySmallScreen ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 6 : 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    zIndex: 2,
  },
  limitedTimeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  packageContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  coinAmount: {
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  coinLabel: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: isVerySmallScreen ? 8 : 10,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 12,
    marginBottom: isVerySmallScreen ? 8 : 10,
    gap: 4,
  },
  bonusText: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 10 : 12,
  },
  totalLabel: {
    marginBottom: 3,
    fontWeight: '500',
  },
  totalValue: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 10 : 12,
  },
  costPerThousand: {
    marginBottom: 3,
    fontWeight: '500',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
  },
  savings: {
    fontWeight: 'bold',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: isVerySmallScreen ? 10 : 12,
  },
  currency: {
    marginRight: 2,
  },
  price: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceLabel: {
    marginLeft: 3,
  },
  valueProps: {
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 8 : 10,
    gap: isVerySmallScreen ? 4 : 6,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valuePropText: {
    fontWeight: '500',
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 8 : 10,
    paddingVertical: isVerySmallScreen ? 4 : 6,
    borderRadius: 10,
    marginBottom: isVerySmallScreen ? 12 : 16,
    gap: 4,
  },
  socialProofText: {
    fontWeight: '600',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
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
    paddingVertical: isVerySmallScreen ? 12 : 14,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    alignItems: 'center',
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingSpinner: {
    // Add rotation animation here if needed
  },
  trustSection: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
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
  trustTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  trustSignals: {
    gap: isVerySmallScreen ? 10 : 12,
  },
  trustSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 12 : 14,
    borderRadius: 10,
    gap: isVerySmallScreen ? 8 : 10,
  },
  trustContent: {
    flex: 1,
  },
  trustSignalTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  trustSignalText: {
    lineHeight: isVerySmallScreen ? 14 : 16,
  },
  successSection: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
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
  successTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  successScroll: {
    marginHorizontal: isVerySmallScreen ? -16 : -20,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
  },
  successCard: {
    padding: isVerySmallScreen ? 12 : 14,
    borderRadius: 12,
    marginRight: isVerySmallScreen ? 10 : 12,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  successAvatar: {
    width: isVerySmallScreen ? 36 : 40,
    height: isVerySmallScreen ? 36 : 40,
    borderRadius: isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 8 : 10,
  },
  successAvatarText: {
    fontWeight: 'bold',
  },
  successName: {
    fontWeight: '600',
    marginBottom: 3,
  },
  successGrowth: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  successQuote: {
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 12 : 14,
    fontStyle: 'italic',
  },
  roiSection: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
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
  roiTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  roiSubtitle: {
    textAlign: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
    lineHeight: isVerySmallScreen ? 16 : 18,
  },
  roiCards: {
    flexDirection: 'row',
    gap: isVerySmallScreen ? 8 : 10,
  },
  roiCard: {
    flex: 1,
    padding: isVerySmallScreen ? 12 : 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  roiNumber: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  roiLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  finalCTA: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  ctaGradient: {
    padding: isVerySmallScreen ? 16 : 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  ctaSubtitle: {
    textAlign: 'center',
    lineHeight: isVerySmallScreen ? 16 : 18,
    marginBottom: isVerySmallScreen ? 10 : 12,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 12 : 14,
    borderRadius: 10,
    gap: 6,
  },
  securityText: {
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    lineHeight: isVerySmallScreen ? 14 : 16,
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