import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Shield, Check, Play, Clock, Timer } from 'lucide-react-native';
import { isAdSupportedPlatform } from '@/utils/ad-module';
import { useAdFreeStore } from '@/store/adFreeStore';
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

interface AdOption {
  id: string;
  title: string;
  description: string;
  adsRequired: number;
  adFreeDuration: number; // in hours
  videoDuration: number; // in hours
  isDefault?: boolean;
}

// Static ad options - moved outside component to prevent recreation
const adOptions: AdOption[] = [
  {
    id: 'default',
    title: 'Default',
    description: 'Ad after every 5th Video',
    adsRequired: 0,
    adFreeDuration: 0,
    videoDuration: 0,
    isDefault: true,
  },
  {
    id: 'option1',
    title: 'Option 1',
    description: 'Watch 6 ads → 2 hours ad-free',
    adsRequired: 6,
    adFreeDuration: 2,
    videoDuration: 2,
  },
  {
    id: 'option2',
    title: 'Option 2',
    description: 'Watch 10 ads → 4 hours ad-free',
    adsRequired: 10,
    adFreeDuration: 4,
    videoDuration: 4,
  },
  {
    id: 'option3',
    title: 'Option 3',
    description: 'Watch 13 ads → 6 hours ad-free',
    adsRequired: 13,
    adFreeDuration: 6,
    videoDuration: 6,
  },
];

export default function ConfigureAdsScreen() {
  // Store hooks - must be at the top and stable
  const {
    isAdFreeActive,
    selectedOption,
    adsWatched,
    totalAdsRequired,
    isWatchingAds,
    startAdFreeSession,
    updateTimer,
    setWatchingAds,
    getRemainingTime,
    isTimerActive,
  } = useAdFreeStore();

  // All useState hooks - stable order, no conditional creation
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState('default');
  const [adFreeTimeLeft, setAdFreeTimeLeft] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // All animation values - created once, never conditionally
  const fadeIn = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const timerProgress = useSharedValue(0);

  // Initialize component
  useEffect(() => {
    setIsMounted(true);
    setCurrentSelection(selectedOption);
    
    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });

    return () => {
      setIsMounted(false);
    };
  }, []);

  // Timer update effect
  useEffect(() => {
    if (!isMounted) return;
    
    let interval: NodeJS.Timeout;
    
    if (isTimerActive()) {
      const updateTimerState = () => {
        if (isMounted) {
          const stillActive = updateTimer();
          const remaining = getRemainingTime();
          setAdFreeTimeLeft(remaining);
          
          if (!stillActive) {
            // Timer expired
            if (router.canGoBack()) {
              router.replace('/configure-ads');
            }
          } else {
            // Update progress bar
            const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
            if (selectedOpt && selectedOpt.adFreeDuration > 0) {
              const totalSeconds = selectedOpt.adFreeDuration * 3600;
              const elapsed = totalSeconds - remaining;
              const progressValue = Math.min(elapsed / totalSeconds, 1);
              timerProgress.value = withTiming(progressValue, { duration: 1000 });
            }
          }
        }
      };
      
      updateTimerState();
      interval = setInterval(updateTimerState, 1000);
    } else {
      setAdFreeTimeLeft(0);
      timerProgress.value = withTiming(0, { duration: 500 });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMounted, isTimerActive, updateTimer, getRemainingTime, selectedOption, timerProgress]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      if (isTimerActive()) {
        const remaining = getRemainingTime();
        setAdFreeTimeLeft(remaining);
      }
    }, [isTimerActive, getRemainingTime])
  );

  const handleAdReward = useCallback(() => {
    if (!isMounted) return;
    
    const newAdsWatched = adsWatched + 1;
    setWatchingAds(true, newAdsWatched, totalAdsRequired);
    
    const progress = newAdsWatched / totalAdsRequired;
    progressWidth.value = withTiming(progress, { duration: 500 });
    
    if (newAdsWatched >= totalAdsRequired) {
      const selectedOpt = adOptions.find(opt => opt.id === currentSelection);
      if (selectedOpt && selectedOpt.adFreeDuration > 0) {
        startAdFreeSession(selectedOpt.adFreeDuration, currentSelection);
        setAdFreeTimeLeft(selectedOpt.adFreeDuration * 3600);
        
        setWatchingAds(false, 0, 0);
        progressWidth.value = withTiming(0, { duration: 500 });
        
        Alert.alert(
          'Ad-Free Activated! 🎉',
          `You now have ${selectedOpt.adFreeDuration} hours of ad-free viewing.`,
          [{ text: 'Great!' }]
        );
      }
    } else {
      setTimeout(() => {
        if (isMounted) {
          showNextAd();
        }
      }, 1000);
    }
  }, [isMounted, adsWatched, totalAdsRequired, setWatchingAds, progressWidth, currentSelection, startAdFreeSession]);

  const showNextAd = useCallback(async () => {
    if (!isMounted || !isAdSupportedPlatform()) {
      Alert.alert('Error', 'Ads are not available on this platform.');
      return;
    }

    setTimeout(() => {
      if (isMounted) {
        handleAdReward();
      }
    }, 2000);
  }, [isMounted, handleAdReward]);

  const handleOptionSelect = useCallback((optionId: string) => {
    if (isWatchingAds || isAdFreeActive) return;
    
    setCurrentSelection(optionId);
    setExpandedOption(expandedOption === optionId ? null : optionId);
  }, [isWatchingAds, isAdFreeActive, expandedOption]);

  const handleWatchAds = useCallback(() => {
    if (!isAdSupportedPlatform()) {
      Alert.alert(
        'Feature Not Available',
        'Ad rewards are only available on mobile devices (iOS/Android). Please use the mobile app to watch ads.',
        [{ text: 'OK' }]
      );
      return;
    }

    const selectedOpt = adOptions.find(opt => opt.id === currentSelection);
    if (!selectedOpt || selectedOpt.isDefault) return;

    setWatchingAds(true, 0, selectedOpt.adsRequired);
    progressWidth.value = withTiming(0, { duration: 300 });
    
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    setTimeout(() => {
      showNextAd();
    }, 500);
  }, [currentSelection, setWatchingAds, progressWidth, buttonScale, showNextAd]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Animated styles - memoized
  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const timerProgressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${timerProgress.value * 100}%`,
  }));

  const renderOption = useCallback((option: AdOption, index: number) => {
    const isSelected = currentSelection === option.id;
    const isExpanded = expandedOption === option.id;
    
    return (
      <View
        key={option.id}
        style={[
          styles.cardContainer,
          { 
            marginBottom: isSmallScreen ? 12 : 16,
            width: isSmallScreen ? '100%' : '48%'
          }
        ]}
      >
        <Pressable
          style={[
            styles.optionRow,
            isSelected && styles.selectedRow,
          ]}
          onPress={() => handleOptionSelect(option.id)}
          android_ripple={{ color: 'rgba(128, 0, 128, 0.05)' }}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Shield color="#800080" size={isSmallScreen ? 16 : 18} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </View>
            
            {isSelected && (
              <View style={styles.checkmarkContainer}>
                <Check color="#800080" size={isSmallScreen ? 16 : 18} />
              </View>
            )}
          </View>
          
          {/* Expanded details */}
          {isExpanded && !option.isDefault && (
            <View style={styles.expandedContent}>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ads Required</Text>
                  <Text style={styles.detailValue}>{option.adsRequired}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ad-Free Duration</Text>
                  <Text style={styles.detailValue}>{option.adFreeDuration}h</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Video Duration Limit</Text>
                  <Text style={styles.detailValue}>{option.videoDuration}h</Text>
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    );
  }, [currentSelection, expandedOption, handleOptionSelect]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stop Ads</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.contentWrapper, fadeInStyle]}>
          
          {/* Timer Display (when active) */}
          {isTimerActive() && (
            <View style={styles.timerSection}>
              <View style={styles.timerContainer}>
                <View style={styles.timerHeader}>
                  <Clock color="#800080" size={isSmallScreen ? 18 : 20} />
                  <Text style={styles.timerTitle}>Ad-Free Active</Text>
                </View>
                <Text style={styles.timerText}>
                  {formatTime(adFreeTimeLeft)} remaining
                </Text>
                <View style={styles.timerProgressContainer}>
                  <Animated.View style={[styles.timerProgressFill, timerProgressAnimatedStyle]} />
                </View>
                <Text style={styles.timerNote}>
                  Ad-free until timer ends or video duration met
                </Text>
              </View>
            </View>
          )}

          {/* Progress Display (when watching ads) */}
          {isWatchingAds && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>
                Watching Ads: {adsWatched}/{totalAdsRequired}
              </Text>
              <View style={styles.progressContainer}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
              <Text style={styles.progressNote}>
                Please watch all ads continuously to activate ad-free period
              </Text>
            </View>
          )}

          {/* Options List */}
          {!isWatchingAds && (
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Choose Your Ad Experience</Text>
              
              <View style={[
                styles.optionsList,
                isSmallScreen && styles.optionsListSmall
              ]}>
                {adOptions.map((option, index) => renderOption(option, index))}
              </View>
              
              {/* Watch Ads Button */}
              {currentSelection !== 'default' && !isTimerActive() && (
                <Animated.View style={[styles.buttonSection, buttonAnimatedStyle]}>
                  <TouchableOpacity
                    style={styles.watchAdsButton}
                    onPress={handleWatchAds}
                    activeOpacity={0.8}
                  >
                    <Play color="white" size={isSmallScreen ? 16 : 18} />
                    <Text style={styles.watchAdsButtonText}>
                      Watch Ads Now
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}

          {/* Info Section */}
          {!isTimerActive() && !isWatchingAds && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <View style={styles.infoList}>
                <Text style={styles.infoItem}>
                  • Select an option to see detailed requirements
                </Text>
                <Text style={styles.infoItem}>
                  • Watch the required ads continuously without interruption
                </Text>
                <Text style={styles.infoItem}>
                  • Enjoy ad-free experience for the specified duration
                </Text>
                <Text style={styles.infoItem}>
                  • Period ends when timer expires or video duration limit is reached
                </Text>
              </View>
            </View>
          )}
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
  scrollContent: {
    paddingBottom: 32,
  },
  contentWrapper: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
  },
  timerSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#800080',
    marginLeft: 8,
  },
  timerText: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  timerProgressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: '#800080',
    borderRadius: 3,
  },
  timerNote: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#800080',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#800080',
    borderRadius: 4,
  },
  progressNote: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
    textAlign: 'center',
  },
  optionsSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 6 : 8,
    marginBottom: 20,
  },
  optionsListSmall: {
    flexDirection: 'column',
  },
  cardContainer: {
    // Width set dynamically in renderOption
  },
  optionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  selectedRow: {
    borderColor: '#800080',
    backgroundColor: '#FAFAFA',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isSmallScreen ? 12 : 16,
    minHeight: isSmallScreen ? 40 : 50,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#666666',
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: isSmallScreen ? 9 : 10,
    color: '#666666',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: '#800080',
  },
  buttonSection: {
    marginBottom: 20,
  },
  watchAdsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
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
  watchAdsButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
    lineHeight: 18,
  },
});