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
import { ArrowLeft, Crown, Check, Star, Shield, Zap, Play } from 'lucide-react-native';
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

interface VIPBenefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function BecomeVIPScreen() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const crownRotation = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const fadeIn = useSharedValue(0);
  const badgeAnimations = Array.from({ length: 4 }, () => useSharedValue(0));
  const vipBadgeShimmer = useSharedValue(0);
  const crownPulse = useSharedValue(1);

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize In-App Purchases only on native platforms
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      initializeInAppPurchases();
    }

    // Crown rotation animation
    crownRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
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

    // Crown pulse animation
    crownPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
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

  const vipBenefits: VIPBenefit[] = [
    {
      icon: <Shield color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Ad-Free Browsing',
      description: 'Enjoy uninterrupted video watching without any advertisements',
    },
    {
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Exclusive Content',
      description: 'Access premium videos and special content reserved for VIP members',
    },
    {
      icon: <Zap color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Priority Support',
      description: 'Get faster response times and priority customer support',
    },
    {
      icon: <Crown color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Special Offers',
      description: 'Receive exclusive discounts and early access to new features',
    },
  ];

  const handleSubscribe = async () => {
    // Handle web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'In-app purchases are only available on mobile devices. Please use the mobile app to subscribe to VIP.',
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

    setIsSubscribing(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      // Get available products
      const { results } = await InAppPurchases.getProductsAsync(['vip_monthly', 'vip_yearly']);
      
      if (results.length === 0) {
        throw new Error('No VIP products available');
      }

      // Purchase the monthly VIP subscription
      const { results: purchaseResults } = await InAppPurchases.purchaseItemAsync('vip_monthly');
      
      if (purchaseResults && purchaseResults.length > 0 && isMounted) {
        const purchase = purchaseResults[0];
        
        if (purchase.acknowledged) {
          Alert.alert(
            'Welcome to VIP! 👑',
            'Your VIP subscription is now active. Enjoy all the premium benefits!',
            [{ text: 'Awesome!', onPress: () => router.back() }]
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
        setIsSubscribing(false);
      }
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const crownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${crownRotation.value}deg` }],
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

  const crownPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownPulse.value }],
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

      {/* VIP Badge */}
      <Animated.View style={[styles.vipBadge, vipBadgeAnimatedStyle]}>
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.vipBadgeGradient}
        >
          <Crown color="#800080" size={16} />
          <Text style={styles.vipBadgeText}>VIP</Text>
        </LinearGradient>
      </Animated.View>

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
                <Animated.View style={crownAnimatedStyle}>
                  <Crown color="#FFD700" size={isVerySmallScreen ? 48 : 64} />
                </Animated.View>
              </Animated.View>
              
              <LinearGradient
                colors={['#800080', '#FFFFFF']}
                style={styles.titleGradient}
              >
                <Text style={styles.heroTitle}>Become VIP</Text>
              </LinearGradient>
              
              <Text style={styles.heroSubtitle}>
                Unlock the ultimate experience with VIP status!
              </Text>
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsSection}>
              {vipBenefits.map((benefit, index) => (
                <Animated.View key={index} style={getBadgeAnimatedStyle(index)}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
                    style={styles.benefitCard}
                  >
                    <View style={styles.benefitHeader}>
                      <View style={styles.benefitIcon}>
                        {benefit.icon}
                      </View>
                      <Check color="#800080" size={20} />
                    </View>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  </LinearGradient>
                </Animated.View>
              ))}
            </View>

            {/* Subscribe Button */}
            <View style={styles.subscribeSection}>
              <Animated.View style={buttonAnimatedStyle}>
                <LinearGradient
                  colors={['#800080', '#9B59B6']}
                  style={[styles.subscribeButton, isSubscribing && styles.subscribingButton]}
                >
                  <TouchableOpacity
                    style={styles.subscribeButtonInner}
                    onPress={handleSubscribe}
                    disabled={isSubscribing}
                  >
                    <Animated.View style={crownPulseStyle}>
                      <Crown color="#FFD700" size={20} />
                    </Animated.View>
                    <Text style={styles.subscribeButtonText}>
                      {isSubscribing ? 'Processing...' : 'Subscribe Now'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.subscribeNote}>
                Premium features • Cancel anytime • Secure payment
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
  vipBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 16,
    zIndex: 1000,
  },
  vipBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)',
      },
    }),
  },
  vipBadgeText: {
    color: '#800080',
    fontSize: 12,
    fontWeight: 'bold',
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
  titleGradient: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: 'transparent',
    textAlign: 'center',
    // Gradient text effect would need a different approach in React Native
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  benefitsSection: {
    paddingVertical: 20,
    gap: 16,
  },
  benefitCard: {
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
      },
    }),
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  benefitIcon: {
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  benefitTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  benefitDescription: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  subscribeSection: {
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  subscribeButton: {
    borderRadius: 25,
    marginBottom: 16,
    minWidth: '80%',
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  subscribingButton: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  subscribeNote: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 18,
  },
});