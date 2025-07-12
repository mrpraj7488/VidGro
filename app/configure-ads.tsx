import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Clock, Play, CircleCheck as CheckCircle, Star } from 'lucide-react-native';
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
  runOnJS,
} from 'react-native-reanimated';

// Conditionally import AdMob only on native platforms
let AdMobRewarded: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    const AdMob = require('expo-ads-admob');
    AdMobRewarded = AdMob.AdMobRewarded;
  } catch (error) {
    console.warn('AdMob not available:', error);
  }
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 375;

interface AdOption {
  id: string;
  title: string;
  description: string;
  adsRequired: number;
  adFreeDuration: number; // in hours
  videoDuration: number; // in hours
  isDefault?: boolean;
  icon: React.ReactNode;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
}

export default function ConfigureAdsScreen() {
  const [selectedOption, setSelectedOption] = useState('default');
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [isWatchingAds, setIsWatchingAds] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [totalAdsRequired, setTotalAdsRequired] = useState(0);
  const [adFreeTimeLeft, setAdFreeTimeLeft] = useState(0); // in seconds
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
  
  // Animation values
  const fadeIn = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const progressRing = useSharedValue(0);
  const timerPulse = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const cardScales = Array.from({ length: 4 }, () => useSharedValue(1));
  const selectedGlow = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  const adOptions: AdOption[] = [
    {
      id: 'default',
      title: 'Default',
      description: 'Ad after every 5th Video',
      adsRequired: 0,
      adFreeDuration: 0,
      videoDuration: 0,
      isDefault: true,
      icon: <Shield color="#800080" size={isVerySmallScreen ? 18 : 20} />,
    },
    {
      id: 'option1',
      title: 'Option 1',
      description: 'Watch 6 ads → 2 hours ad-free',
      adsRequired: 6,
      adFreeDuration: 2,
      videoDuration: 2,
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 18 : 20} />,
    },
    {
      id: 'option2',
      title: 'Option 2',
      description: 'Watch 10 ads → 4 hours ad-free',
      adsRequired: 10,
      adFreeDuration: 4,
      videoDuration: 4,
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 18 : 20} />,
    },
    {
      id: 'option3',
      title: 'Option 3',
      description: 'Watch 13 ads → 6 hours ad-free',
      adsRequired: 13,
      adFreeDuration: 6,
      videoDuration: 6,
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 18 : 20} />,
    },
  ];

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize AdMob only on native platforms
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      initializeAdMob();
    }

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Icon rotation animation
    iconRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    // Selected option glow animation
    selectedGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      false
    );

    // Timer pulse when active
    if (isAdFreeActive) {
      timerPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    }

    return () => {
      setIsMounted(false);
    };
  }, [isAdFreeActive]);

  // Countdown timer effect
  useEffect(() => {
    if (!isMounted) return;
    
    let interval: NodeJS.Timeout;
    
    if (isAdFreeActive && adFreeTimeLeft > 0) {
      interval = setInterval(() => {
        if (isMounted) {
          setAdFreeTimeLeft(prev => {
            if (prev <= 1) {
              setIsAdFreeActive(false);
              setSelectedOption('default');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAdFreeActive, adFreeTimeLeft, isMounted]);

  const initializeAdMob = async () => {
    if (!AdMobRewarded || !isMounted) {
      return;
    }
    
    try {
      AdMobRewarded.setAdUnitID(process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || 'ca-app-pub-2892152842024866/2049185437');
      
      // Set up event listeners
      AdMobRewarded.addEventListener('rewardedVideoDidRewardUser', handleAdReward);
      AdMobRewarded.addEventListener('rewardedVideoDidLoad', () => {
        if (isMounted) {
          console.log('Rewarded ad loaded');
        }
      });
      AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad', handleAdError);
      AdMobRewarded.addEventListener('rewardedVideoDidClose', handleAdClose);
      
      // Request ad
      await AdMobRewarded.requestAdAsync();
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
    }
  };

  const handleAdReward = () => {
    if (!isMounted) return;
    
    setAdsWatched(prev => {
      const newCount = prev + 1;
      
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
          
          // Show confetti animation
          showConfettiAnimation();
          
          // Animate progress ring
          progressRing.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) });
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
    console.error('Ad failed to load:', error);
    if (isMounted) {
      Alert.alert('Ad Not Available', 'Please try again later.');
      setIsWatchingAds(false);
      setAdsWatched(0);
      setTotalAdsRequired(0);
    }
  };

  const handleAdClose = () => {
    if (isMounted && AdMobRewarded) {
      // Request next ad
      AdMobRewarded.requestAdAsync();
    }
  };

  const showNextAd = async () => {
    if (!AdMobRewarded || !isMounted) {
      Alert.alert('Error', 'Ad service not available. Please try again later.');
      return;
    }

    try {
      const isReady = await AdMobRewarded.getIsReadyAsync();
      
      if (isReady) {
        await AdMobRewarded.showAdAsync();
      } else {
        // Request and show ad
        await AdMobRewarded.requestAdAsync();
        const isReadyAfterRequest = await AdMobRewarded.getIsReadyAsync();
        
        if (isReadyAfterRequest) {
          await AdMobRewarded.showAdAsync();
        } else {
          throw new Error('Ad not ready');
        }
      }
    } catch (error) {
      console.error('Failed to show ad:', error);
      if (isMounted) {
        Alert.alert(
          'Ad Unavailable',
          'No ads are available right now. Please try again later.',
          [{ text: 'OK', onPress: () => {
            setIsWatchingAds(false);
            setAdsWatched(0);
            setTotalAdsRequired(0);
          }}]
        );
      }
    }
  };

  const showConfettiAnimation = () => {
    const particles: ConfettiParticle[] = [];
    const colors = ['#800080', '#FFD700', '#FFFFFF'];
    
    for (let i = 0; i < 30; i++) {
      particles.push({
        id: i,
        x: Math.random() * screenWidth,
        y: -10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: Math.random() * 3 + 2,
        },
      });
    }
    
    setConfettiParticles(particles);
    setShowConfetti(true);
    confettiOpacity.value = withTiming(1, { duration: 500 });
    
    // Hide confetti after animation
    setTimeout(() => {
      confettiOpacity.value = withTiming(0, { duration: 1000 });
      setTimeout(() => {
        setShowConfetti(false);
        setConfettiParticles([]);
      }, 1000);
    }, 3000);
  };

  const handleOptionSelect = (optionId: string) => {
    if (isWatchingAds || isAdFreeActive) return;
    
    setSelectedOption(optionId);
    setExpandedOption(expandedOption === optionId ? null : optionId);
    
    // Animate card selection
    const index = adOptions.findIndex(opt => opt.id === optionId);
    if (index !== -1) {
      cardScales[index].value = withSequence(
        withSpring(0.95, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
    }
  };

  const handleWatchAds = () => {
    // Handle web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'Ad rewards are only available on mobile devices. Please use the mobile app to watch ads.',
        [{ text: 'OK' }]
      );
      return;
    }

    const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
    if (!selectedOpt || selectedOpt.isDefault) return;

    setIsWatchingAds(true);
    setAdsWatched(0);
    setTotalAdsRequired(selectedOpt.adsRequired);
    
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

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

  const getProgressPercentage = () => {
    if (totalAdsRequired === 0) return 0;
    return (adsWatched / totalAdsRequired) * 100;
  };

  const getTimerProgress = () => {
    const selectedOpt = adOptions.find(opt => opt.id === selectedOption);
    if (!selectedOpt || !isAdFreeActive) return 0;
    const totalSeconds = selectedOpt.adFreeDuration * 3600;
    return ((totalSeconds - adFreeTimeLeft) / totalSeconds) * 100;
  };

  // Animation styles
  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [30, 0])
      }
    ]
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const getCardAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: cardScales[index].value }],
    }));
  };

  const selectedGlowStyle = useAnimatedStyle(() => ({
    opacity: selectedGlow.value,
  }));

  const confettiAnimatedStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  const renderOption = (option: AdOption, index: number) => {
    const isSelected = selectedOption === option.id;
    const isExpanded = expandedOption === option.id;
    
    return (
      <Animated.View key={option.id} style={[getCardAnimatedStyle(index)]}>
        <Pressable
          style={[
            styles.optionCard,
            isSelected && styles.selectedCard,
            option.isDefault && styles.defaultCard
          ]}
          onPress={() => handleOptionSelect(option.id)}
          android_ripple={{ color: 'rgba(128, 0, 128, 0.1)' }}
        >
          {/* Selected glow effect */}
          {isSelected && !option.isDefault && (
            <Animated.View style={[styles.glowEffect, selectedGlowStyle]} />
          )}
          
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Animated.View style={iconAnimatedStyle}>
                {option.icon}
              </Animated.View>
            </View>
            
            <View style={styles.optionInfo}>
              <Text style={[
                styles.optionTitle,
                isSelected && styles.selectedTitle
              ]}>
                {option.title}
              </Text>
              <Text style={styles.optionDescription}>
                {option.description}
              </Text>
            </View>
            
            {isSelected && !option.isDefault && (
              <View style={styles.selectedIndicator}>
                <CheckCircle color="#FFD700" size={isVerySmallScreen ? 16 : 18} />
              </View>
            )}
          </View>
          
          {/* Expanded details */}
          {isExpanded && !option.isDefault && (
            <View style={styles.expandedDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ads Required:</Text>
                <Text style={styles.detailValue}>{option.adsRequired}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ad-Free Duration:</Text>
                <Text style={styles.detailValue}>{option.adFreeDuration} hours</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Video Duration Limit:</Text>
                <Text style={styles.detailValue}>{option.videoDuration} hours</Text>
              </View>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#4b004b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ad Control Center</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Main Content */}
      <LinearGradient
        colors={['#800080', '#4b004b', '#2d0033']}
        style={styles.backgroundGradient}
      >
        <Animated.View style={[styles.content, fadeInStyle]}>
          
          {/* Timer Display (when active) */}
          {isAdFreeActive && (
            <Animated.View style={[styles.timerSection, timerAnimatedStyle]}>
              <View style={styles.timerContainer}>
                <View style={styles.progressRing}>
                  <View style={[styles.progressFill, { 
                    transform: [{ rotate: `${(getTimerProgress() * 3.6)}deg` }] 
                  }]} />
                  <Animated.View style={[styles.timerIcon, iconAnimatedStyle]}>
                    <Shield color="#FFD700" size={isVerySmallScreen ? 32 : 40} />
                  </Animated.View>
                </View>
                <Text style={styles.timerText}>
                  {formatTime(adFreeTimeLeft)}
                </Text>
                <Text style={styles.timerSubtext}>
                  Ad-free until timer ends or video duration met
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Progress Bar (when watching ads) */}
          {isWatchingAds && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>
                Watching Ads: {adsWatched}/{totalAdsRequired}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
              </View>
              <Text style={styles.progressSubtext}>
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
                <Animated.View style={[styles.watchAdsSection, buttonAnimatedStyle]}>
                  <LinearGradient
                    colors={['#800080', '#9B59B6']}
                    style={styles.watchAdsButton}
                  >
                    <Pressable
                      style={styles.watchAdsButtonInner}
                      onPress={handleWatchAds}
                      android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      <Play color="white" size={isVerySmallScreen ? 18 : 20} />
                      <Text style={styles.watchAdsButtonText}>
                        Watch Ads Now
                      </Text>
                    </Pressable>
                  </LinearGradient>
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
                  • Select an option to see ad-free duration details
                </Text>
                <Text style={styles.infoItem}>
                  • Watch the required ads continuously
                </Text>
                <Text style={styles.infoItem}>
                  • Enjoy ad-free experience for the specified time
                </Text>
                <Text style={styles.infoItem}>
                  • Ad-free period ends when timer or video duration limit is reached
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Confetti Animation */}
      {showConfetti && (
        <Animated.View style={[styles.confettiContainer, confettiAnimatedStyle]}>
          {confettiParticles.map((particle) => (
            <View
              key={particle.id}
              style={[
                styles.confettiParticle,
                {
                  left: particle.x,
                  top: particle.y,
                  backgroundColor: particle.color,
                  width: particle.size,
                  height: particle.size,
                }
              ]}
            />
          ))}
        </Animated.View>
      )}
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
  backgroundGradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 12 : 20,
    paddingTop: 20,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerContainer: {
    alignItems: 'center',
  },
  progressRing: {
    width: isVerySmallScreen ? 120 : 150,
    height: isVerySmallScreen ? 120 : 150,
    borderRadius: isVerySmallScreen ? 60 : 75,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  progressFill: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: isVerySmallScreen ? 64 : 79,
    borderWidth: 4,
    borderColor: '#FFD700',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerIcon: {
    position: 'absolute',
  },
  timerText: {
    fontSize: isVerySmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  timerSubtext: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#CCCCCC',
    textAlign: 'center',
    maxWidth: '80%',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
  },
  progressTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  optionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsList: {
    gap: isVerySmallScreen ? 12 : 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: isVerySmallScreen ? 16 : 20,
    position: 'relative',
    overflow: 'hidden',
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
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  defaultCard: {
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 128, 0.3)',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    zIndex: -1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedTitle: {
    color: '#800080',
  },
  optionDescription: {
    fontSize: isVerySmallScreen ? 10 : 12,
    color: '#666',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 0, 128, 0.2)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#666',
  },
  detailValue: {
    fontSize: isVerySmallScreen ? 11 : 12,
    fontWeight: '600',
    color: '#800080',
  },
  watchAdsSection: {
    marginBottom: 24,
  },
  watchAdsButton: {
    borderRadius: 25,
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
  watchAdsButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 16 : 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  watchAdsButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  confettiParticle: {
    position: 'absolute',
    borderRadius: 4,
  },
});