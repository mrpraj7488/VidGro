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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Crown, Check, Shield, Zap, Headphones } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

// Conditionally import InAppPurchases only on native platforms
let InAppPurchases: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    InAppPurchases = require('expo-in-app-purchases');
  } catch (error) {
    console.warn('In-app purchases not available:', error);
  }
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 375;

interface VIPPlan {
  id: string;
  title: string;
  price: string;
  period: string;
  duration: string;
  productId: string;
  benefits: string[];
  popular?: boolean;
}

interface VIPBenefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function BecomeVIPScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [vipStatus, setVipStatus] = useState<{
    isActive: boolean;
    expiresAt: string | null;
    daysRemaining: number;
    planType: string | null;
  }>({
    isActive: false,
    expiresAt: null,
    daysRemaining: 0,
    planType: null,
  });
  
  // Animation values
  const buttonScales = {
    weekly: useSharedValue(1),
    monthly: useSharedValue(1),
  };
  const crownPulse = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const fadeIn = useSharedValue(0);
  const badgeAnimations = Array.from({ length: 2 }, () => useSharedValue(0));
  const vipBadgeShimmer = useSharedValue(0);

  const vipPlans: VIPPlan[] = [
    {
      id: 'weekly',
      title: 'Become VIP for ₹79/week',
      price: '₹79',
      period: 'week',
      duration: '7 days',
      productId: 'vip_weekly',
      benefits: ['No ads', '10% off every promotion/campaign', '24/7 VIP support'],
    },
    {
      id: 'monthly',
      title: 'Become VIP for ₹299/month',
      price: '₹299',
      period: 'month',
      duration: '30 days',
      productId: 'vip_monthly',
      popular: true,
      benefits: ['No ads', '10% off every promotion/campaign', '24/7 VIP support'],
    },
  ];

  const vipBenefits: VIPBenefit[] = [
    {
      icon: <Shield color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted video watching without any advertisements',
    },
    {
      icon: <Zap color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: '10% Off Promotions',
      description: 'Save 10% on every video promotion and campaign you create',
    },
    {
      icon: <Headphones color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: '24/7 VIP Support',
      description: 'Get priority customer support available round the clock',
    },
  ];

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize In-App Purchases only on native platforms
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      initializeInAppPurchases();
    }

    // Check VIP status
    checkVIPStatus();

    // Crown pulse animation
    crownPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    // Shimmer effect for background
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    // VIP badge shimmer
    vipBadgeShimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Sequential badge animations
    badgeAnimations.forEach((animation, index) => {
      animation.value = withDelay(
        index * 200,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) })
      );
    });

    return () => {
      setIsMounted(false);
    };
  }, []);

  const initializeInAppPurchases = async () => {
    if (!InAppPurchases || !isMounted) {
      return;
    }
    
    try {
      await InAppPurchases.connectAsync();
      if (isMounted) {
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect to in-app purchases:', error);
    }
  };

  const checkVIPStatus = async () => {
    if (!user) return;

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('is_vip, vip_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (userProfile?.is_vip && userProfile?.vip_expires_at) {
        const expiresAt = new Date(userProfile.vip_expires_at);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        setVipStatus({
          isActive: daysRemaining > 0,
          expiresAt: userProfile.vip_expires_at,
          daysRemaining: Math.max(0, daysRemaining),
          planType: daysRemaining <= 7 ? 'weekly' : 'monthly',
        });
      }
    } catch (error) {
      console.error('Error checking VIP status:', error);
    }
  };

  const handleSubscribe = async (plan: VIPPlan) => {
    // Handle web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'VIP subscriptions are only available on mobile devices. Please use the mobile app to subscribe.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!InAppPurchases || !isConnected) {
      Alert.alert('Error', 'In-app purchases not available. Please try again later.');
      return;
    }

    if (!isMounted) {
      return;
    }

    setIsSubscribing(plan.id);
    buttonScales[plan.id as keyof typeof buttonScales].value = withSpring(0.95, {}, () => {
      buttonScales[plan.id as keyof typeof buttonScales].value = withSpring(1);
    });

    try {
      // Get available products
      const { results } = await InAppPurchases.getProductsAsync([plan.productId]);
      
      if (results.length === 0) {
        throw new Error(`VIP product ${plan.productId} not available`);
      }

      // Purchase the VIP subscription
      const { results: purchaseResults } = await InAppPurchases.purchaseItemAsync(plan.productId);
      
      if (purchaseResults && purchaseResults.length > 0 && isMounted) {
        const purchase = purchaseResults[0];
        
        if (purchase.acknowledged) {
          // Update database with VIP subscription
          await updateVIPSubscription(plan);
          
          Alert.alert(
            'Welcome to VIP! 👑',
            `Your ${plan.period}ly VIP subscription is now active. Enjoy all the premium benefits!`,
            [{ text: 'Awesome!', onPress: () => {
              checkVIPStatus();
              refreshProfile();
            }}]
          );
        }
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      if (isMounted) {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete the VIP subscription. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      if (isMounted) {
        setIsSubscribing(null);
      }
    }
  };

  const updateVIPSubscription = async (plan: VIPPlan) => {
    if (!user) return;

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      
      // Add duration based on plan
      if (plan.id === 'weekly') {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      // Update user profile with VIP status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_vip: true,
          vip_expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Record the transaction
      const { error: transactionError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: 0, // No coins involved, just for record keeping
          transaction_type_param: 'vip_purchase',
          description_param: `VIP ${plan.period}ly subscription activated`,
          reference_uuid: null
        });

      if (transactionError) {
        console.warn('Failed to record VIP transaction:', transactionError);
      }

    } catch (error) {
      console.error('Error updating VIP subscription:', error);
      throw error;
    }
  };

  const getButtonAnimatedStyle = (planId: string) => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: buttonScales[planId as keyof typeof buttonScales].value }],
    }));
  };

  const crownPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownPulse.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmer.value * 0.4),
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [30, 0])
      }
    ]
  }));

  const vipBadgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + (vipBadgeShimmer.value * 0.2),
    transform: [{ scale: 1 + (vipBadgeShimmer.value * 0.05) }],
  }));

  const getBadgeAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      opacity: badgeAnimations[index].value,
      transform: [
        { scale: badgeAnimations[index].value },
        { translateY: interpolate(badgeAnimations[index].value, [0, 1], [20, 0]) }
      ],
    }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#4b004b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become VIP</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* VIP Active Badge */}
      {vipStatus.isActive && (
        <Animated.View style={[styles.vipActiveBadge, vipBadgeAnimatedStyle]}>
          <View style={styles.vipBadgeContent}>
            <Crown color="#FFD700" size={16} />
            <Text style={styles.vipActiveText}>VIP Active</Text>
          </View>
          <Text style={styles.vipDurationText}>
            VIP active for {vipStatus.daysRemaining} day{vipStatus.daysRemaining !== 1 ? 's' : ''}
          </Text>
        </Animated.View>
      )}

      {/* Velvet Curtain Background */}
      <LinearGradient
        colors={['#800080', '#4b004b', '#2d0033']}
        style={styles.backgroundGradient}
      >
        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]} />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={fadeInStyle}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Animated.View style={[styles.heroIcon, crownPulseStyle]}>
                <Crown color="#FFD700" size={isVerySmallScreen ? 48 : 64} />
              </Animated.View>
              
              <Text style={styles.heroTitle}>Become VIP</Text>
              <Text style={styles.heroSubtitle}>
                Unlock the ultimate experience with VIP status!
              </Text>
            </View>

            {/* VIP Plans */}
            <View style={styles.plansSection}>
              {vipPlans.map((plan, index) => (
                <Animated.View key={plan.id} style={getBadgeAnimatedStyle(index)}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={[styles.planCard, plan.popular && styles.popularCard]}
                  >
                    {plan.popular && (
                      <View style={styles.popularBadge}>
                        <Crown color="white" size={12} />
                        <Text style={styles.popularText}>MOST POPULAR</Text>
                      </View>
                    )}

                    {/* Crown Icon */}
                    <Animated.View style={[styles.planCrown, crownPulseStyle]}>
                      <Crown color="#FFD700" size={isVerySmallScreen ? 32 : 40} />
                    </Animated.View>

                    {/* Plan Title */}
                    <Text style={styles.planTitle}>{plan.title}</Text>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>{plan.price}</Text>
                      <Text style={styles.periodText}>/{plan.period}</Text>
                    </View>

                    {/* Benefits */}
                    <View style={styles.benefitsContainer}>
                      {plan.benefits.map((benefit, benefitIndex) => (
                        <View key={benefitIndex} style={styles.benefitItem}>
                          <Check color="#800080" size={16} />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Subscribe Button */}
                    <Animated.View style={getButtonAnimatedStyle(plan.id)}>
                      <LinearGradient
                        colors={['#800080', '#9B59B6']}
                        style={[styles.subscribeButton, isSubscribing === plan.id && styles.subscribingButton]}
                      >
                        <TouchableOpacity
                          style={styles.subscribeButtonInner}
                          onPress={() => handleSubscribe(plan)}
                          disabled={isSubscribing !== null || vipStatus.isActive}
                        >
                          <Crown color="#FFD700" size={20} />
                          <Text style={styles.subscribeButtonText}>
                            {vipStatus.isActive 
                              ? 'Already VIP' 
                              : isSubscribing === plan.id 
                                ? 'Processing...' 
                                : 'Subscribe Now'
                            }
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    </Animated.View>
                  </LinearGradient>
                </Animated.View>
              ))}
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>What you get with VIP:</Text>
              
              {vipBenefits.map((benefit, index) => (
                <Animated.View key={index} style={getBadgeAnimatedStyle(index)}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
                    style={styles.benefitCard}
                  >
                    <View style={styles.benefitIcon}>
                      {benefit.icon}
                    </View>
                    <View style={styles.benefitContent}>
                      <Text style={styles.benefitTitle}>{benefit.title}</Text>
                      <Text style={styles.benefitDescription}>{benefit.description}</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              ))}
            </View>

            {/* Terms */}
            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                • Subscriptions auto-renew unless cancelled{'\n'}
                • Cancel anytime in your device settings{'\n'}
                • Secure payment through Google Play Store{'\n'}
                • All prices are in Indian Rupees (₹)
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#800080',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  vipActiveBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#800080',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  vipBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipActiveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vipDurationText: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 2,
  },
  backgroundGradient: {
    flex: 1,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 12 : 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 32,
  },
  heroIcon: {
    width: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    height: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    borderRadius: isVerySmallScreen ? 40 : isSmallScreen ? 50 : 60,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(255, 215, 0, 0.4)',
      },
    }),
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  plansSection: {
    paddingVertical: 20,
    gap: 16,
  },
  planCard: {
    borderRadius: 12,
    padding: isVerySmallScreen ? 16 : 20,
    position: 'relative',
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
  popularCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularText: {
    color: '#800080',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planCrown: {
    marginBottom: 16,
  },
  planTitle: {
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#800080',
    textAlign: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceText: {
    fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#800080',
  },
  periodText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    color: '#666',
    marginLeft: 4,
  },
  benefitsContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  subscribeButton: {
    borderRadius: 25,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 16px rgba(128, 0, 128, 0.4)',
      },
    }),
  },
  subscribeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  subscribingButton: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  benefitsSection: {
    paddingVertical: 20,
  },
  benefitsTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: isVerySmallScreen ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  benefitIcon: {
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#CCCCCC',
    lineHeight: 16,
  },
  termsSection: {
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  termsText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: '90%',
  },
});