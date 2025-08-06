import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Copy, Gift, Users, Coins } from 'lucide-react-native';

function ReferFriendScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const referralCode = profile?.referral_code || 'VIDGRO123';
  const referralLink = `https://vidgro.app/join?ref=${referralCode}`;

  const handleCopyCode = async () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const handleCopyLink = async () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on VidGro and start earning coins by watching videos! Use my referral code: ${referralCode} or click: ${referralLink}`,
        title: 'Join VidGro - Watch & Earn',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const benefits = [
    {
      icon: Coins,
      title: 'You Get 500 Coins',
      description: 'Earn 500 coins for each friend who joins and completes their first video watch',
      color: '#FFD700'
    },
    {
      icon: Gift,
      title: 'Friend Gets 200 Coins',
      description: 'Your friend receives 200 bonus coins when they sign up with your code',
      color: '#2ECC71'
    },
    {
      icon: Users,
      title: 'Unlimited Referrals',
      description: 'No limit on how many friends you can refer. More friends = more coins!',
      color: '#3498DB'
    }
  ];

  const steps = [
    'Share your referral code or link with friends',
    'Friend signs up using your code',
    'Friend watches their first video',
    'You both get bonus coins instantly!'
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#9D4EDD', '#FF6B7A'] : ['#800080', '#FF4757']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer Friends</Text>
          <Share2 size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
          <Users size={64} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Invite Friends & Earn Together</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Share VidGro with your friends and both of you earn bonus coins!
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Referral Benefits</Text>
          {benefits.map((benefit, index) => (
            <View key={index} style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}20` }]}>
                <benefit.icon size={24} color={benefit.color} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.codeSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Referral Code</Text>
          <View style={[styles.codeContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
            <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]} onPress={handleCopyCode}>
              <Copy size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.linkSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Referral Link</Text>
          <View style={[styles.linkContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>{referralLink}</Text>
            <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]} onPress={handleCopyLink}>
              <Copy size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color="white" />
          <Text style={[styles.shareButtonText, { color: 'white' }]}>Share with Friends</Text>
        </TouchableOpacity>

        <View style={[styles.stepsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How It Works</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumberText, { color: 'white' }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Referral Stats</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Friends Referred</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coins Earned</Text>
            </View>
          </View>
        </View>

        <View style={[styles.termsSection, { backgroundColor: colors.warning + '20', borderLeftColor: colors.warning }]}>
          <Text style={[styles.termsTitle, { color: colors.warning }]}>Terms & Conditions</Text>
          <Text style={[styles.termsText, { color: colors.warning }]}>
            • Referral bonus is awarded when referred friend completes first video watch{'\n'}
            • Each user can only be referred once{'\n'}
            • Referral rewards may take up to 24 hours to process{'\n'}
            • VidGro reserves the right to modify referral terms at any time{'\n'}
            • Fraudulent referrals will result in account suspension
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  codeSection: {
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
  },
  linkSection: {
    marginBottom: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  termsSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 4,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ReferFriendScreen;