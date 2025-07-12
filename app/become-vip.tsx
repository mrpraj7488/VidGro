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
import { ArrowLeft, Crown, Check, Shield, Zap, Headphones } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

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
  const [InAppPurchases, setInAppPurchases] = useState<any>(null);
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
  const fadeIn = useSharedValue(0);
  const cardScale1 = useSharedValue(1);
  const cardScale2 = useSharedValue(1);
  const badgeOpacity = useSharedValue(0);

  const vipPlans: VIPPlan[] = [
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
    {
      id: 'weekly',
      title: 'Become VIP for ₹79/week',
      price: '₹79',
      period: 'week',
      duration: '7 days',
      productId: 'vip_weekly',
      benefits: ['No ads', '10% off every promotion/campaign', '24/7 VIP support'],
    },
  ];

  const vipBenefits: VIPBenefit[] = [
    {
      icon: <Shield color="#800080" size={isVerySmallScreen ? 18 : 20} />,
      title: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted video watching without any advertisements',
    },
    {
      icon: <Zap color="#800080" size={isVerySmallScreen ? 18 : 20} />,
      title: '10% Off Promotions',
      description: 'Save 10% on every video promotion and campaign you create',
    },
    {
      icon: <Headphones color="#800080" size={isVerySmallScreen ? 18 : 20} />,
      title: '24/7 VIP Support',
      description: 'Get priority customer support available round the clock',
    },
  ];

  useEffect(() => {
    setIsMounted(true);
    
    // Note: In-app purchases would be initialized here for production
    // For now, we'll use mock implementations

    // Check VIP status
    checkVIPStatus();

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Badge animation if VIP is active
    if (vipStatus.isActive) {
      badgeOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    }

    return () => {
      setIsMounted(false);
    };
  }, []);

  const initializeInAppPurchases = async () => {
    // Mock implementation for development
    console.log('In-app purchases would be initialized here');
    setIsConnected(true);
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

        if (daysRemaining > 0) {
          badgeOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
        }
      }
    } catch (error) {
      console.error('Error checking VIP status:', error);
    }
  };

  const handleSubscribe = async (plan: VIPPlan) => {
    // Handle web platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Alert.alert(
        'Feature Not Available',
        'VIP subscriptions are only available on mobile devices (iOS/Android). Please use the mobile app to subscribe.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isMounted) {
      return;
    }

    setIsSubscribing(plan.id);
    
    // Animate the correct button
    if (plan.id === 'monthly') {
      cardScale1.value = withSequence(
        withSpring(0.98, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
    } else {
      cardScale2.value = withSequence(
        withSpring(0.98, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
    }

    try {
      // Simulate purchase process for development
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

  const getCardAnimatedStyle = (cardNumber: number) => {
    const scaleValue = cardNumber === 1 ? cardScale1 : cardScale2;
    return useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));
  };

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [
      {
        translateY: interpolate(badgeOpacity.value, [0, 1], [-10, 0])
      }
    ]
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become VIP</Text>
        <View style={styles.placeholder} />
      </View>

      {/* VIP Active Badge */}
      {vipStatus.isActive && (
        <Animated.View style={[styles.vipActiveBadge, badgeAnimatedStyle]}>
          <View style={styles.vipBadgeContent}>
            <Crown color="#FFD700" size={16} />
            <Text style={styles.vipActiveText}>VIP Active</Text>
          </View>
          <Text style={styles.vipDurationText}>
            VIP active for {vipStatus.daysRemaining} day{vipStatus.daysRemaining !== 1 ? 's' : ''}
          </Text>
        </Animated.View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeInStyle}>
          {/* VIP Plans */}
          <View style={styles.plansSection}>
            {vipPlans.map((plan, index) => (
              <Animated.View key={plan.id} style={[styles.planCardContainer, getCardAnimatedStyle(index + 1)]}>
                <View style={[styles.planCard, plan.popular && styles.popularCard]}>
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}

                  {/* Crown Icon */}
                  <View style={styles.planHeader}>
                    <Crown color="#800080" size={isVerySmallScreen ? 20 : 24} />
                  </View>

                  {/* Plan Title */}
                  <Text style={styles.planTitle}>
                    Become VIP for{' '}
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    /{plan.period}
                  </Text>

                  {/* Benefits */}
                  <View style={styles.benefitsContainer}>
                    {plan.benefits.map((benefit, benefitIndex) => (
                      <View key={benefitIndex} style={styles.benefitItem}>
                        <Check color="#800080" size={14} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Subscribe Button */}
                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      isSubscribing === plan.id && styles.subscribingButton
                    ]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={isSubscribing !== null || vipStatus.isActive}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {vipStatus.isActive 
                        ? 'Already VIP' 
                        : isSubscribing === plan.id 
                          ? 'Processing...' 
                          : 'Subscribe Now'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsSectionTitle}>What you get with VIP:</Text>
            
            {vipBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  {benefit.icon}
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#800080',
    height: 20,
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
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  vipActiveBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#800080',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  vipBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vipDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  plansSection: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 24,
    gap: isSmallScreen ? 8 : 10,
  },
  planCardContainer: {
    width: '100%',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: isSmallScreen ? 16 : 20,
    position: 'relative',
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
  popularCard: {
    borderColor: '#800080',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#800080',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 12,
  },
  planTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  planPrice: {
    color: '#800080',
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: isVerySmallScreen ? 10 : 12,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#800080',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
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
  subscribingButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  benefitsSection: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingVertical: 24,
  },
  benefitsSectionTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: isSmallScreen ? 12 : 16,
    marginBottom: 12,
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
  benefitIcon: {
    width: isVerySmallScreen ? 32 : 36,
    height: isVerySmallScreen ? 32 : 36,
    borderRadius: isVerySmallScreen ? 16 : 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#666666',
    lineHeight: 16,
  },
  termsSection: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  termsText: {
    fontSize: isVerySmallScreen ? 10 : 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: '90%',
  },
});