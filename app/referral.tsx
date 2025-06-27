import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Copy, Gift, Users, DollarSign, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function ReferralScreen() {
  const { coins, addCoins } = useUserStore();
  const [referralCode] = useState('VIDGRO123');
  const [friendEmail, setFriendEmail] = useState('');
  const [referralStats] = useState({
    totalReferrals: 12,
    pendingReferrals: 3,
    totalEarned: 6000,
    thisMonth: 2400,
  });

  const handleCopyCode = async () => {
    try {
      await Clipboard.setString(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy referral code');
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join VidGro and earn coins by watching videos! Use my referral code: ${referralCode} and we both get 500 bonus coins! Download: https://vidgro.app`,
        title: 'Join VidGro - Watch & Earn!',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral code');
    }
  };

  const handleInviteFriend = () => {
    if (!friendEmail.trim()) {
      Alert.alert('Error', 'Please enter your friend\'s email address');
      return;
    }

    // Simulate sending invitation
    Alert.alert(
      'Invitation Sent!',
      `Invitation sent to ${friendEmail}. You'll earn 500 coins when they sign up and complete their first video!`,
      [{ text: 'OK', onPress: () => setFriendEmail('') }]
    );
  };

  const handleClaimReward = () => {
    Alert.alert(
      'Claim Reward',
      'Claim your pending referral rewards?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: () => {
            const reward = 1500; // 3 pending * 500 coins each
            addCoins(reward);
            Alert.alert('Success!', `${reward} coins have been added to your account! 🎉`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Refer Friends</Text>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>{coins}</Text>
            <View style={styles.coinIcon}>
              <DollarSign size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* How it Works */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Gift size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>How Referrals Work</Text>
            </View>
            <View style={styles.stepContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Share your referral code with friends</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>They sign up using your code</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Both of you get 500 bonus coins!</Text>
              </View>
            </View>
          </View>

          {/* Referral Code */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Share2 size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>Your Referral Code</Text>
            </View>
            <View style={styles.codeContainer}>
              <Text style={styles.referralCode}>{referralCode}</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
                  <Copy size={20} color="#6B7280" />
                  <Text style={styles.codeButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
                  <Share2 size={20} color="#6B7280" />
                  <Text style={styles.codeButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Invite Friend */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={24} color="#6366F1" />
              <Text style={styles.sectionTitle}>Invite a Friend</Text>
            </View>
            <View style={styles.inviteContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="Enter friend's email address"
                value={friendEmail}
                onChangeText={setFriendEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.inviteButton} onPress={handleInviteFriend}>
                <Text style={styles.inviteButtonText}>Send Invitation</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Your Referral Stats</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{referralStats.totalReferrals}</Text>
                <Text style={styles.statLabel}>Total Referrals</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{referralStats.pendingReferrals}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{referralStats.totalEarned}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{referralStats.thisMonth}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
            </View>
          </View>

          {/* Claim Rewards */}
          {referralStats.pendingReferrals > 0 && (
            <TouchableOpacity style={styles.claimButton} onPress={handleClaimReward}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.claimGradient}
              >
                <Gift size={24} color="#FFFFFF" />
                <Text style={styles.claimButtonText}>
                  Claim {referralStats.pendingReferrals * 500} Coins
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              • Both you and your friend must complete at least one video to earn referral coins{'\n'}
              • Referral rewards are credited within 24 hours{'\n'}
              • Maximum 50 referrals per month{'\n'}
              • VidGro reserves the right to modify referral terms
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  codeContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  referralCode: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  codeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  inviteContainer: {
    gap: 12,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#F9FAFB',
  },
  inviteButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  claimButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  claimButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  termsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});