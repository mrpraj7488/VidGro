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
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface VIPBenefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function BecomeVIPScreen() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);

  const vipBenefits: VIPBenefit[] = [
    {
      icon: <Shield color="#800080" size={24} />,
      title: 'Ad-Free Experience',
      description: 'Enjoy uninterrupted video watching without any advertisements',
    },
    {
      icon: <Star color="#800080" size={24} />,
      title: 'Exclusive Discounts',
      description: 'Get special discounts on coin purchases and premium features',
    },
    {
      icon: <Zap color="#800080" size={24} />,
      title: 'Priority Support',
      description: 'Get faster response times and priority customer support',
    },
    {
      icon: <Crown color="#800080" size={24} />,
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#9B59B6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become VIP</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Crown color="#800080" size={64} />
          </View>
          <Text style={styles.heroTitle}>Upgrade to VIP</Text>
          <Text style={styles.heroSubtitle}>
            Unlock premium features and enjoy an enhanced VidGro experience
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>VIP Benefits</Text>
          
          {vipBenefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                {benefit.icon}
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
              <Check color="#4CAF50" size={20} />
            </View>
          ))}
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Crown color="#800080" size={32} />
              <Text style={styles.planName}>VIP Monthly</Text>
            </View>
            <Text style={styles.planPrice}>₹99<Text style={styles.planPeriod}>/month</Text></Text>
            <Text style={styles.planDescription}>
              Full access to all VIP features with monthly billing
            </Text>
          </View>

          <View style={[styles.pricingCard, styles.popularPlan]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <View style={styles.pricingHeader}>
              <Crown color="#800080" size={32} />
              <Text style={styles.planName}>VIP Yearly</Text>
            </View>
            <Text style={styles.planPrice}>₹999<Text style={styles.planPeriod}>/year</Text></Text>
            <Text style={styles.planSavings}>Save 17% compared to monthly</Text>
            <Text style={styles.planDescription}>
              Best value with full VIP access and maximum savings
            </Text>
          </View>
        </View>

        {/* Subscribe Button */}
        <View style={styles.subscribeSection}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.subscribeButton, isSubscribing && styles.subscribingButton]}
              onPress={handleSubscribe}
              disabled={isSubscribing}
            >
              <Crown color="white" size={20} />
              <Text style={styles.subscribeButtonText}>
                {isSubscribing ? 'Processing...' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.subscribeNote}>
            Cancel anytime. No hidden fees. Secure payment processing.
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: isSmallScreen ? 24 : 32,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  heroIcon: {
    width: isSmallScreen ? 100 : 120,
    height: isSmallScreen ? 100 : 120,
    borderRadius: isSmallScreen ? 50 : 60,
    backgroundColor: '#F8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 18,
  },
  pricingSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  pricingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: isSmallScreen ? 20 : 24,
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
    borderWidth: 2,
    borderColor: '#800080',
    backgroundColor: '#F8F4FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#800080',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  planPrice: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#800080',
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'normal',
    color: '#666',
  },
  planSavings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 18,
  },
  subscribeSection: {
    padding: isSmallScreen ? 16 : 20,
    paddingBottom: 32,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
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
  subscribingButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  subscribeNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});