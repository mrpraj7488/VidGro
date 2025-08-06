import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldOff, Clock, Play } from 'lucide-react-native';

export default function ConfigureAdsScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState(5);
  const [loading, setLoading] = useState(false);

  const adFreeOptions = [
    { hours: 1, watchAds: 2, description: 'Watch 2 ads for 1 hour ad-free' },
    { hours: 3, watchAds: 5, description: 'Watch 5 ads for 3 hours ad-free' },
    { hours: 5, watchAds: 8, description: 'Watch 8 ads for 5 hours ad-free' },
    { hours: 12, watchAds: 15, description: 'Watch 15 ads for 12 hours ad-free' },
    { hours: 24, watchAds: 25, description: 'Watch 25 ads for 24 hours ad-free' },
  ];

  const handleStartAdFreeSession = async () => {
    const option = adFreeOptions.find(opt => opt.hours === selectedOption);
    if (!option) return;

    setLoading(true);
    
    Alert.alert(
      'Watch Ads for Ad-Free Time',
      `You need to watch ${option.watchAds} ads to get ${option.hours} hours of ad-free experience. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: async () => {
            // Simulate watching ads
            setTimeout(() => {
              setIsAdFreeActive(true);
              Alert.alert(
                'Ad-Free Session Started!',
                `You now have ${option.hours} hours of ad-free experience.`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            }, 1000);
          }
        }
      ]
    );
    
    setLoading(false);
  };

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
          <Text style={[styles.headerTitle, { color: 'white' }]}>Configure Ads</Text>
          <ShieldOff size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isAdFreeActive ? (
          <View style={[styles.activeContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.activeIcon, { backgroundColor: colors.success + '20' }]}>
              <ShieldOff size={48} color="#2ECC71" />
            </View>
            <Text style={[styles.activeTitle, { color: colors.text }]}>Ad-Free Active</Text>
            <Text style={[styles.activeSubtitle, { color: colors.textSecondary }]}>
              You're currently enjoying an ad-free experience
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose how many ads you want to watch to earn ad-free time
            </Text>

            <View style={styles.optionsContainer}>
              {adFreeOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedOption === option.hours && styles.selectedOption
                  ]}
                  onPress={() => setSelectedOption(option.hours)}
                >
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionHours, { color: colors.text }]}>{option.hours} Hours</Text>
                    <View style={[styles.adCount, { backgroundColor: colors.primary + '20' }]}>
                      <Play size={16} color={colors.primary} />
                      <Text style={[styles.adCountText, { color: colors.primary }]}>{option.watchAds} ads</Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
              onPress={handleStartAdFreeSession}
              disabled={loading}
            >
              <ShieldOff size={20} color="white" />
              <Text style={[styles.startButtonText, { color: 'white' }]}>
                {loading ? 'Starting...' : 'Start Ad-Free Session'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            1. Select how many hours of ad-free time you want{'\n'}
            2. Watch the required number of ads{'\n'}
            3. Enjoy uninterrupted video watching and earning{'\n'}
            4. VIP members get unlimited ad-free experience
          </Text>
        </View>

        {!profile?.is_vip && (
          <TouchableOpacity
            style={[styles.vipButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/become-vip')}
          >
            <Text style={[styles.vipButtonText, { color: colors.primary }]}>
              Upgrade to VIP for unlimited ad-free experience
            </Text>
          </TouchableOpacity>
        )}
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
  activeContainer: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOption: {
    borderColor: '#9D4EDD',
    shadowColor: '#9D4EDD',
    shadowOpacity: 0.2,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionHours: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  adCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  adCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  vipButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  vipButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});