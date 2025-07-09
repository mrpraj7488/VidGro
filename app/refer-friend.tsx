import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
  Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Share2, Copy, Gift, Users, Coins } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

export default function ReferFriendScreen() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const copyScale = useSharedValue(1);

  const referralCode = profile?.referral_code || 'LOADING...';
  const referralLink = `https://vidgro.app/join?ref=${referralCode}`;

  const handleShare = async () => {
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      const message = `🎉 Join VidGro and start earning coins by watching videos!\n\nUse my referral code: ${referralCode}\n\nDownload now: ${referralLink}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Join VidGro - Watch & Earn',
            text: message,
            url: referralLink,
          });
        } else {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied!', 'Referral message copied to clipboard');
        }
      } else {
        await Share.share({
          message,
          url: referralLink,
          title: 'Join VidGro - Watch & Earn',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyCode = async () => {
    copyScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(referralCode);
      } else {
        Clipboard.setString(referralCode);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy referral code');
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: copyScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer a Friend</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Gift color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Invite Friends & Earn Together!</Text>
          <Text style={styles.heroSubtitle}>
            Share VidGro with your friends and both of you get bonus coins when they join
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Referral Benefits</Text>
          
          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Coins color="#FFD700" size={24} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>You Get 50 Coins</Text>
              <Text style={styles.benefitDescription}>
                Earn 50 bonus coins for each friend who joins using your code
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Users color="#4ECDC4" size={24} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Friend Gets 25 Coins</Text>
              <Text style={styles.benefitDescription}>
                Your friend receives 25 bonus coins when they sign up with your code
              </Text>
            </View>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          
          <View style={styles.codeContainer}>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>
            <Animated.View style={copyAnimatedStyle}>
              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copiedButton]}
                onPress={handleCopyCode}
              >
                <Copy color={copied ? "#4CAF50" : "#800080"} size={20} />
                <Text style={[styles.copyButtonText, copied && styles.copiedButtonText]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Share Section */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Share with Friends</Text>
          
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 color="white" size={20} />
              <Text style={styles.shareButtonText}>Share Referral Link</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.stepsList}>
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
              <Text style={styles.stepText}>Friend signs up using your code</Text>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Both of you receive bonus coins instantly!</Text>
            </View>
          </View>
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
    backgroundColor: '#800080',
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
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 22 : 26,
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
  benefitCard: {
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
  codeSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeDisplay: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#800080',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#800080',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  copiedButton: {
    backgroundColor: '#E8F5E8',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#800080',
  },
  copiedButtonText: {
    color: '#4CAF50',
  },
  shareSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
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
  shareButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  howItWorksSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#800080',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    lineHeight: 20,
  },
});