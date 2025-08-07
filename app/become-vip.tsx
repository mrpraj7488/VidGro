import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Crown, Check, Zap, Shield, Headphones } from 'lucide-react-native';

export default function BecomeVIPScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const vipPlans = [
    {
      duration: '1 Month',
      price: 99,
      savings: 0,
      popular: false,
    },
    {
      duration: '3 Months',
      price: 249,
      savings: 48,
      popular: true,
    },
    {
      duration: '6 Months',
      price: 449,
      savings: 145,
      popular: false,
    },
    {
      duration: '1 Year',
      price: 799,
      savings: 389,
      popular: false,
    },
  ];

  const vipBenefits = [
    { icon: Zap, title: '10% Discount', description: 'On all video promotions' },
    { icon: Shield, title: 'Ad-Free Experience', description: 'No interruptions while earning' },
    { icon: Headphones, title: 'Priority Support', description: '24/7 dedicated customer support' },
    { icon: Crown, title: 'VIP Badge', description: 'Show your premium status' },
  ];

  const handleSubscribe = async (plan: any) => {
    setLoading(true);
    
    Alert.alert(
      'Subscribe to VIP',
      `Are you sure you want to subscribe to VIP for ${plan.duration} at ₹${plan.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: async () => {
            // Here you would integrate with actual payment service
            // For now, we'll simulate successful subscription
            
            setTimeout(() => {
              Alert.alert(
                'Welcome to VIP!',
                `You are now a VIP member for ${plan.duration}. Enjoy all the premium benefits!`,
                [{ text: 'OK', onPress: () => {
                  refreshProfile();
                  router.back();
                }}]
              );
            }, 1000);
          }
        }
      ]
    );
    
    setLoading(false);
  };

  if (profile?.is_vip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: '#800080' }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: 'white' }]}>VIP Status</Text>
            <Crown size={24} color="white" />
          </View>
        </View>

        <View style={[styles.vipActiveContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.vipIcon, { backgroundColor: colors.accent + '20' }]}>
            <Crown size={48} color="#FFD700" />
          </View>
          <Text style={[styles.vipActiveTitle, { color: colors.text }]}>You're a VIP Member!</Text>
          <Text style={[styles.vipActiveSubtitle, { color: colors.textSecondary }]}>
            Enjoy all premium benefits including ad-free experience and 10% discount
          </Text>
          
          <View style={[styles.benefitsList, { backgroundColor: colors.surface }]}>
            {vipBenefits.map((benefit, index) => (
              <View key={index} style={[styles.benefitItem, { borderBottomColor: colors.border }]}>
                <benefit.icon size={20} color="#FFD700" />
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                  <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>{benefit.description}</Text>
                </View>
                <Check size={20} color="#2ECC71" />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Become VIP</Text>
          <Crown size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.vipIcon, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.2)' }]}>
          Unlock premium features and maximize your earnings
        </Text>

        <View style={[styles.benefitsContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>VIP Benefits</Text>
          {vipBenefits.map((benefit, index) => (
            <View key={index} style={[styles.benefitItem, { borderBottomColor: colors.border }]}>
              <benefit.icon size={24} color="#FFD700" />
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          <Text style={[styles.plansTitle, { color: colors.text }]}>Choose Your Plan</Text>
          {vipPlans.map((plan, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.planCard,
                { backgroundColor: colors.surface },
                plan.popular && styles.popularPlan
              ]}
              onPress={() => handleSubscribe(plan)}
              disabled={loading}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={[styles.planDuration, { color: colors.text }]}>{plan.duration}</Text>
                <View style={styles.planPricing}>
                  <Text style={[styles.planPrice, { color: colors.accent }]}>₹{plan.price}</Text>
                  {plan.savings > 0 && (
                    <Text style={[styles.planSavings, { color: colors.success }]}>Save ₹{plan.savings}</Text>
                  )}
                </View>
              </View>

              <View style={[styles.subscribeButton, { backgroundColor: colors.accent }]}>
                <Text style={[styles.subscribeButtonText, { color: 'white' }]}>
                  {loading ? 'Processing...' : 'Subscribe'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.guaranteeContainer, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.guaranteeTitle, { color: colors.success }]}>💎 Premium Guarantee</Text>
          <Text style={[styles.guaranteeText, { color: colors.success }]}>
            Not satisfied? Cancel anytime within 7 days for a full refund
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  benefitContent: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefitDescription: {
    fontSize: 14,
  },
  plansContainer: {
    marginBottom: 32,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planDuration: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planSavings: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscribeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guaranteeContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  guaranteeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  vipActiveContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  vipIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  vipActiveTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vipActiveSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});