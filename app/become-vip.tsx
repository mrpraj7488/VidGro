import React, { useState } from 'react';
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
import { ArrowLeft, Crown, Check, Star, Shield, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

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
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const crownRotation = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const fadeIn = useSharedValue(0);

  React.useEffect(() => {
    // Crown rotation animation
    crownRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
  }, []);

  const vipBenefits: VIPBenefit[] = [
    {
      icon: <Shield color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted video watching without any advertisements',
    },
    {
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Exclusive Discounts',
      description: 'Get special discounts on coin purchases and premium features',
    },
    {
      icon: <Zap color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'Priority Support',
      description: 'Get faster response times and priority customer support',
    },
    {
      icon: <Crown color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      title: 'VIP Badge',
      description: 'Show off your VIP status with an exclusive badge',
    },
  ];

  const handleSubscribe = () => {
    setIsSubscribing(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    // Simulate subscription process
    setTimeout(() => {
      setIsSubscribing(false);
      Alert.alert(
        'VIP Subscription',
        'VIP subscription feature coming soon! You will be notified when it becomes available.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const crownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${crownRotation.value}deg` }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmer.value * 0.7),
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

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

      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(128, 0, 128, 0.05)', 'transparent']}
        style={styles.backgroundGradient}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeInStyle}>
          {/* Hero Section */}
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            <Animated.View style={[styles.heroIcon, shimmerAnimatedStyle]}>
              <Animated.View style={crownAnimatedStyle}>
                <Crown color="#FFD700" size={isVerySmallScreen ? 48 : 64} />
              </Animated.View>
            </Animated.View>
            <Text style={styles.heroTitle}>Upgrade to VIP</Text>
            <Text style={styles.heroSubtitle}>
              Unlock premium features and enjoy an enhanced VidGro experience
            </Text>
          </LinearGradient>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>VIP Benefits</Text>
            
            {vipBenefits.map((benefit, index) => (
              <LinearGradient
                key={index}
                colors={['rgba(128, 0, 128, 0.05)', 'rgba(255, 215, 0, 0.05)']}
                style={styles.benefitItem}
              >
                <View style={styles.benefitIcon}>
                  {benefit.icon}
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
                <Check color="#4CAF50" size={20} />
              </LinearGradient>
            ))}
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <LinearGradient
              colors={['rgba(128, 0, 128, 0.1)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.pricingCard}
            >
              <View style={styles.pricingHeader}>
                <Crown color="#800080" size={isVerySmallScreen ? 24 : 32} />
                <Text style={styles.planName}>VIP Monthly</Text>
              </View>
              <Text style={styles.planPrice}>₹99<Text style={styles.planPeriod}>/month</Text></Text>
              <Text style={styles.planDescription}>
                Full access to all VIP features with monthly billing
              </Text>
            </LinearGradient>

            <LinearGradient
              colors={['#800080', '#9B59B6']}
              style={[styles.pricingCard, styles.popularPlan]}
            >
              <Animated.View style={[styles.popularBadge, shimmerAnimatedStyle]}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </Animated.View>
              <View style={styles.pricingHeader}>
                <Crown color="#FFD700" size={isVerySmallScreen ? 24 : 32} />
                <Text style={[styles.planName, styles.planNameWhite]}>VIP Yearly</Text>
              </View>
              <Text style={[styles.planPrice, styles.planPriceWhite]}>₹999<Text style={styles.planPeriodWhite}>/year</Text></Text>
              <Text style={styles.planSavings}>Save 17% compared to monthly</Text>
              <Text style={[styles.planDescription, styles.planDescriptionWhite]}>
                Best value with full VIP access and maximum savings
              </Text>
            </LinearGradient>
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
                  <Crown color="#FFD700" size={20} />
                  <Text style={styles.subscribeButtonText}>
                    {isSubscribing ? 'Processing...' : 'Subscribe Now'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.subscribeNote}>
              Cancel anytime. No hidden fees. Secure payment processing.
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
    backgroundColor: '#F8F9FA',
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 32,
    margin: 16,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  heroIcon: {
    width: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    height: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    borderRadius: isVerySmallScreen ? 40 : isSmallScreen ? 50 : 60,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: 'white',
    padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
    margin: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 12 : 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.1)',
  },
  benefitIcon: {
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
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
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 18,
  },
  pricingSection: {
    backgroundColor: 'white',
    padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
    margin: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  pricingCard: {
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24,
    marginBottom: 16,
    position: 'relative',
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
  popularPlan: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#800080',
    fontSize: isVerySmallScreen ? 8 : 10,
    fontWeight: 'bold',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  planNameWhite: {
    color: 'white',
  },
  planPrice: {
    fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#800080',
    marginBottom: 4,
  },
  planPriceWhite: {
    color: '#FFD700',
  },
  planPeriod: {
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 16 : 18,
    fontWeight: 'normal',
    color: '#666',
  },
  planPeriodWhite: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  planSavings: {
    fontSize: isVerySmallScreen ? 12 : 14,
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 18,
  },
  planDescriptionWhite: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  subscribeSection: {
    padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
    paddingBottom: 32,
  },
  subscribeButton: {
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  subscribeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  subscribingButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  subscribeNote: {
    fontSize: isVerySmallScreen ? 10 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});