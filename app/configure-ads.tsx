import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AdMobRewarded } from 'expo-ads-admob';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  withSequence,
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

export default function ConfigureAdsScreen() {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adFreeTimeLeft, setAdFreeTimeLeft] = useState(0); // in seconds
  const [isAdFreeActive, setIsAdFreeActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  const progressRing = useSharedValue(0);
  const fadeIn = useSharedValue(0);
  const playIconScale = useSharedValue(1);
  const countdownPulse = useSharedValue(1);

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize AdMob only on native platforms
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      initializeAdMob();
    }

    // Icon rotation animation
    iconRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    // Play icon scale animation
    playIconScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    return () => {
      setIsMounted(false);
    };

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Countdown pulse when active
    if (isAdFreeActive) {
      countdownPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [isAdFreeActive]);

  // Countdown timer effect
  useEffect(() => {
    if (!isMounted) return;
    
    let interval: NodeJS.Timeout;
    
    if (isAdFreeActive && adFreeTimeLeft > 0) {
      interval = setInterval(() => {
        if (isMounted) {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              setIsAdFree(false);
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
  }, [isAdFree, timeRemaining, isMounted]);

  const initializeAdMob = async () => {
    if (!AdMobRewarded || !isMounted) {
      return;
    }
    
        if (isMounted) {
          console.log('Rewarded ad loaded');
          setIsLoadingAd(false);
        }
      AdMobRewarded.setAdUnitID(process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || 'ca-app-pub-2892152842024866/2049185437');
      
      // Set up event listeners
        if (isMounted) {
          setIsLoadingAd(false);
          Alert.alert('Error', 'Failed to load ad. Please try again later.');
        }
      AdMobRewarded.addEventListener('rewardedVideoDidClose', handleAdClose);
      
      // Request ad
      await AdMobRewarded.requestAdAsync();
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
    }
  };

  const handleAdReward = () => {
    if (!isMounted) return;
    
    // Start 5-hour ad-free period (18000 seconds)
    setAdFreeTimeLeft(18000);
    setIsAdFreeActive(true);
    
    // Animate progress ring
    progressRing.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) });
    
    Alert.alert(
      'Ad-Free Activated! 🎉',
      'You now have 5 hours of ad-free browsing. Enjoy!',
      [{ text: 'Awesome!' }]
    );
  };

  const handleAdError = (error: any) => {
    console.error('Ad failed to load:', error);
    Alert.alert('Ad Not Available', 'Please try again later.');
    setIsWatchingAd(false);
  };

  const handleAdClose = () => {
    setIsWatchingAd(false);
    // Request next ad
    AdMobRewarded.requestAdAsync();
  };

  const handleWatchAd = async () => {
    // Handle web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Feature Not Available',
        'Ad rewards are only available on mobile devices. Please use the mobile app to watch ads and earn rewards.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!AdMobRewarded || !isMounted) {
      Alert.alert('Error', 'Ad service not available. Please try again later.');
      return;
    }

    if (isAdFreeActive) {
      Alert.alert('Already Active', 'You already have an active ad-free period.');
      return;
    }

    setIsWatchingAd(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

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
      if (isMounted) {
        setIsLoadingAd(false);
        Alert.alert(
          'Ad Unavailable',
          'No ads are available right now. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressRing.value }],
    opacity: progressRing.value,
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playIconScale.value }],
  }));

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownPulse.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#4b004b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stop Ads</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Dark Purple Background */}
      <LinearGradient
        colors={['#800080', '#4b004b', '#2d0033']}
        style={styles.backgroundGradient}
      >
        <Animated.View style={[styles.content, fadeInStyle]}>
          {/* Central Ad-Block Icon */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              {/* Progress Ring */}
              <Animated.View style={[styles.progressRing, progressAnimatedStyle]}>
                <View style={styles.progressRingInner} />
              </Animated.View>
              
              {/* Rotating Shield Icon */}
              <Animated.View style={[styles.adBlockIcon, iconAnimatedStyle]}>
                <Shield color="#FFFFFF" size={isVerySmallScreen ? 48 : 64} />
              </Animated.View>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <LinearGradient
              colors={['#FFFFFF', '#800080']}
              style={styles.titleGradient}
            >
              <Text style={styles.title}>Stop Ads</Text>
            </LinearGradient>
            
            <Text style={styles.subtitle}>
              Enjoy an ad-free experience for 5 hours!
            </Text>
            
            <Text style={styles.description}>
              Temporarily disable ads to enhance your browsing. Watch a rewarded ad to activate.
            </Text>
          </View>

          {/* Countdown Timer (when active) */}
          {isAdFreeActive && (
            <Animated.View style={[styles.countdownSection, countdownAnimatedStyle]}>
              <Clock color="#FFD700" size={24} />
              <Text style={styles.countdownText}>
                {formatTime(adFreeTimeLeft)} remaining
              </Text>
            </Animated.View>
          )}

          {/* Watch Ad Button */}
          <View style={styles.buttonSection}>
            <Animated.View style={buttonAnimatedStyle}>
              <LinearGradient
                colors={isAdFreeActive ? ['#4CAF50', '#45A049'] : ['#800080', '#9B59B6']}
                style={[styles.watchAdButton, isWatchingAd && styles.loadingButton]}
              >
                <TouchableOpacity
                  style={styles.watchAdButtonInner}
                  onPress={handleWatchAd}
                  disabled={isWatchingAd || isAdFreeActive}
                >
                  <Animated.View style={playIconAnimatedStyle}>
                    {isAdFreeActive ? (
                      <Shield color="white" size={20} />
                    ) : (
                      <Play color="white" size={20} />
                    )}
                  </Animated.View>
                  <Text style={styles.watchAdButtonText}>
                    {isWatchingAd 
                      ? 'Loading Ad...' 
                      : isAdFreeActive 
                        ? 'Ad-Free Active' 
                        : 'Watch Ad Now'
                    }
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.buttonNote}>
              {isAdFreeActive 
                ? 'Ads are currently disabled for your account'
                : 'Watch a short ad to enjoy 5 hours without interruptions'
              }
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What you get:</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Shield color="#FFD700" size={16} />
                <Text style={styles.featureText}>No video ads for 5 hours</Text>
              </View>
              <View style={styles.featureItem}>
                <Clock color="#FFD700" size={16} />
                <Text style={styles.featureText}>Uninterrupted viewing experience</Text>
              </View>
              <View style={styles.featureItem}>
                <Play color="#FFD700" size={16} />
                <Text style={styles.featureText}>Faster video loading</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSection: {
    marginBottom: 40,
  },
  iconContainer: {
    position: 'relative',
    width: isVerySmallScreen ? 120 : 150,
    height: isVerySmallScreen ? 120 : 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: isVerySmallScreen ? 60 : 75,
    borderWidth: 4,
    borderColor: '#FFD700',
    opacity: 0,
  },
  progressRingInner: {
    flex: 1,
    borderRadius: isVerySmallScreen ? 56 : 71,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  adBlockIcon: {
    width: isVerySmallScreen ? 80 : 100,
    height: isVerySmallScreen ? 80 : 100,
    borderRadius: isVerySmallScreen ? 40 : 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(255, 255, 255, 0.3)',
      },
    }),
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleGradient: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: 'transparent',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    maxWidth: '90%',
  },
  countdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  countdownText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonSection: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  watchAdButton: {
    borderRadius: 25,
    marginBottom: 16,
    minWidth: '80%',
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
  watchAdButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingButton: {
    opacity: 0.7,
  },
  watchAdButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  buttonNote: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
  },
  featuresSection: {
    alignItems: 'center',
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
});