import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { ArrowLeft, Shield, Check, Play, Clock, Timer } from 'lucide-react-native';
import { isAdSupportedPlatform } from '@/utils/ad-module';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  withSequence,
  runOnJS,
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

export default function ConfigureAdsScreen() {
  // All useState hooks first - maintain consistent order
  const [selectedOption, setSelectedOption] = useState('default');
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [isWatchingAds, setIsWatchingAds] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [totalAdsRequired, setTotalAdsRequired] = useState(0);
  const [adFreeTimeLeft, setAdFreeTimeLeft] = useState(0); // in seconds
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // All useSharedValue hooks next - maintain consistent order
  const fadeIn = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const timerProgress = useSharedValue(0);
  
  // Fixed arrays for animations - always 4 elements
  const cardScale0 = useSharedValue(1);
  const cardScale1 = useSharedValue(1);
  const cardScale2 = useSharedValue(1);
  const cardScale3 = useSharedValue(1);
  
  const expandAnimation0 = useSharedValue(0);
  const expandAnimation1 = useSharedValue(0);
  const expandAnimation2 = useSharedValue(0);
  const expandAnimation3 = useSharedValue(0);

  // All useAnimatedStyle hooks - maintain consistent order
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

  // Fixed animated styles for cards
  const cardAnimatedStyle0 = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale0.value }],
  }));

  const cardAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale1.value }],
  }));

  const cardAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale2.value }],
  }));

  const cardAnimatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale3.value }],
  }));

  // Fixed animated styles for expansion
  const expandAnimatedStyle0 = useAnimatedStyle(() => ({
    height: interpolate(expandAnimation0.value, [0, 1], [0, 80]),
    opacity: expandAnimation0.value,
  }));

  const expandAnimatedStyle1 = useAnimatedStyle(() => ({
    height: interpolate(expandAnimation1.value, [0, 1], [0, 80]),
    opacity: expandAnimation1.value,
  }));

  const expandAnimatedStyle2 = useAnimatedStyle(() => ({
    height: interpolate(expandAnimation2.value, [0, 1], [0, 80]),
    opacity: expandAnimation2.value,
  }));

  const expandAnimatedStyle3 = useAnimatedStyle(() => ({
    height: interpolate(expandAnimation3.value, [0, 1], [0, 80]),
    opacity: expandAnimation3.value,
  }));

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

  // All useEffect hooks - maintain consistent order
  useEffect(() => {
    setIsMounted(true);
    
    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });

    return () => {
      setIsMounted(false);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!isMounted) return;
    
    let interval: NodeJS.Timeout;
    
    if (isAdFreeActive && adFreeTimeLeft > 0) {
      interval = setInterval(() => {
        if (isMounted) {
          setAdFreeTimeLeft(prev => {
            const newTime = prev - 1;
            if (newTime <= 0) {
              setIsAdFreeActive(false);
              setSelectedOption('default');
              timerProgress.value = withTiming(0, { duration: 500 });
              return 0;
            }
            
            // Update timer progress
            const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
            if (selectedOpt) {
              const totalSeconds = selectedOpt.adFreeDuration * 3600;
              const progressValue = (totalSeconds - newTime) / totalSeconds;
              timerProgress.value = withTiming(progressValue, { duration: 1000 });
            }
            
            return newTime;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAdFreeActive, adFreeTimeLeft, isMounted, selectedOption]);

  const handleAdReward = () => {
    if (!isMounted) return;
    
    setAdsWatched(prev => {
      const newCount = prev + 1;
      const progress = newCount / totalAdsRequired;
      progressWidth.value = withTiming(progress, { duration: 500 });
      
      if (newCount >= totalAdsRequired) {
        // All ads watched, start ad-free period
        const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
        if (selectedOpt) {
          const adFreeSeconds = selectedOpt.adFreeDuration * 3600; // Convert hours to seconds
          setAdFreeTimeLeft(adFreeSeconds);
          setIsAdFreeActive(true);
          setIsWatchingAds(false);
          setAdsWatched(0);
          setTotalAdsRequired(0);
          progressWidth.value = withTiming(0, { duration: 500 });
          
          // Show success message briefly
          Alert.alert(
            'Ad-Free Activated! 🎉',
            `You now have ${selectedOpt.adFreeDuration} hours of ad-free viewing.`,
            [{ text: 'Great!' }]
          );
        }
      } else {
        // Continue watching ads
        setTimeout(() => {
          if (isMounted) {
            showNextAd();
          }
        }, 1000);
      }
      
      return newCount;
    });
  };

  const handleAdError = (error: any) => {
    if (isMounted) {
      Alert.alert('Ad Not Available', 'Please try again later.');
      setIsWatchingAds(false);
      setAdsWatched(0);
      setTotalAdsRequired(0);
      progressWidth.value = withTiming(0, { duration: 500 });
    }
  };

  const handleAdClose = () => {
    // Mock implementation - in real app, this would load next ad
    console.log('Ad closed');
  };

  const showNextAd = async () => {
    if (!isMounted || !isAdSupportedPlatform()) {
      Alert.alert('Error', 'Ads are not available on this platform.');
      return;
    }

    // Simulate ad loading and showing
    setTimeout(() => {
      if (isMounted) {
        // Simulate successful ad completion
        handleAdReward();
      }
    }, 2000);
  };

  const getCardAnimatedStyle = (index: number) => {
    switch (index) {
      case 0: return cardAnimatedStyle0;
      case 1: return cardAnimatedStyle1;
      case 2: return cardAnimatedStyle2;
      case 3: return cardAnimatedStyle3;
      default: return cardAnimatedStyle0;
    }
  };

  const getExpandAnimatedStyle = (index: number) => {
    switch (index) {
      case 0: return expandAnimatedStyle0;
      case 1: return expandAnimatedStyle1;
      case 2: return expandAnimatedStyle2;
      case 3: return expandAnimatedStyle3;
      default: return expandAnimatedStyle0;
    }
  };

  const getCardScale = (index: number) => {
    switch (index) {
      case 0: return cardScale0;
      case 1: return cardScale1;
      case 2: return cardScale2;
      case 3: return cardScale3;
      default: return cardScale0;
    }
  };

  const getExpandAnimation = (index: number) => {
    switch (index) {
      case 0: return expandAnimation0;
      case 1: return expandAnimation1;
      case 2: return expandAnimation2;
      case 3: return expandAnimation3;
      default: return expandAnimation0;
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (isWatchingAds || isAdFreeActive) return;
    
    setSelectedOption(optionId);
    
    // Toggle expansion
    const isCurrentlyExpanded = expandedOption === optionId;
    setExpandedOption(isCurrentlyExpanded ? null : optionId);
    
    // Animate card selection
    const index = adOptions.findIndex(opt => opt.id === optionId);
    if (index !== -1 && index < 4) {
      const cardScale = getCardScale(index);
      const expandAnimation = getExpandAnimation(index);
      
      cardScale.value = withSequence(
        withSpring(0.98, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
      
      // Animate expansion
      expandAnimation.value = withTiming(
        isCurrentlyExpanded ? 0 : 1,
        { duration: 300, easing: Easing.out(Easing.quad) }
      );
    }
  };

  const handleWatchAds = () => {
    // Handle web platform
    if (!isAdSupportedPlatform()) {
      Alert.alert(
        'Feature Not Available',
        'Ad rewards are only available on mobile devices (iOS/Android). Please use the mobile app to watch ads.',
        [{ text: 'OK' }]
      );
      return;
    }

    const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
    if (!selectedOpt || selectedOpt.isDefault) return;

    setIsWatchingAds(true);
    setAdsWatched(0);
    setTotalAdsRequired(selectedOpt.adsRequired);
    progressWidth.value = withTiming(0, { duration: 300 });
    
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    // Start watching ads
    setTimeout(() => {
      showNextAd();
    }, 500);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderOption = (option: AdOption, index: number) => {
    const isSelected = selectedOption === option.id;
    const isExpanded = expandedOption === option.id;
    
    return (
      <Animated.View key={option.id} style={[getCardAnimatedStyle(index)]}>
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
            <Animated.View style={[styles.expandedContent, getExpandAnimatedStyle(index)]}>
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
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeInStyle}>
          
          {/* Timer Display (when active) */}
          {isAdFreeActive && (
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
          {!isAdFreeActive && !isWatchingAds && (
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Choose Your Ad Experience</Text>
              
              <View style={styles.optionsList}>
                {adOptions.map((option, index) => renderOption(option, index))}
              </View>
              
              {/* Watch Ads Button */}
              {selectedOption !== 'default' && !isWatchingAds && (
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
          {!isAdFreeActive && !isWatchingAds && (
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
    gap: isSmallScreen ? 6 : 8,
    marginBottom: 20,
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