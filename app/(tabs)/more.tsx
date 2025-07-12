import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { 
  DollarSign, 
  Crown, 
  Gift, 
  ShieldOff, 
  Star,
  ChevronRight,
  Play
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';
import { isAdSupportedPlatform } from '@/utils/ad-module';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 375;

interface MoreItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  showArrow: boolean;
  isSpecial?: boolean;
  gradientColors: string[];
}

export default function MoreTab() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);

  // Animation values
  const fadeIn = useSharedValue(0);
  const cardScales = Array.from({ length: 5 }, () => useSharedValue(1));
  const shimmerX = useSharedValue(-1);
  const coinRain = useSharedValue(0);
  const giftBoxScale = useSharedValue(1);

  useEffect(() => {
    // Fade in animation on mount
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    
    // Shimmer effect
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const handleBuyCoins = () => {
    router.push('/buy-coins');
  };

  const handleBecomeVIP = () => {
    router.push('/become-vip');
  };

  const handleFreeCoins = () => {
    // Handle web platform
    if (!isAdSupportedPlatform()) {
      Alert.alert(
        'Feature Not Available',
        'Ad rewards are only available on mobile devices (iOS/Android). Please use the mobile app to watch ads and earn coins.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Animate gift box
    giftBoxScale.value = withSequence(
      withSpring(1.2, { damping: 15, stiffness: 150 }),
      withSpring(0.8, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    // Show coin rain animation
    setShowCoinAnimation(true);
    coinRain.value = withTiming(1, { duration: 1500 }, () => {
      runOnJS(() => {
        setShowCoinAnimation(false);
        coinRain.value = 0;
      })();
    });

    // Show ad and award coins
    Alert.alert(
      '🎁 Watch Ad for Coins',
      'Watch a short ad to earn 100 coins!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Watch Ad', 
          onPress: () => {
            setTimeout(() => {
              Alert.alert('🎉 Coins Earned!', 'You received 100 coins for watching the ad!');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleStopAds = () => {
    router.push('/configure-ads');
  };

  const handleRateUs = () => {
    router.push('/rate-us');
  };

  const handleCardPress = (index: number, onPress: () => void) => {
    cardScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    setTimeout(onPress, 100);
  };

  const moreItems: MoreItem[] = [
    {
      id: 'buy-coins',
      title: 'Buy Coins',
      subtitle: 'Unlock Rewards',
      icon: <DollarSign color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      onPress: handleBuyCoins,
      showArrow: true,
      gradientColors: ['#800080', '#4b004b'],
    },
    {
      id: 'become-vip',
      title: 'Become VIP',
      subtitle: 'Premium Access',
      icon: <Crown color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      onPress: handleBecomeVIP,
      showArrow: true,
      gradientColors: ['#800080', '#5d1a8b'],
    },
    {
      id: 'free-coins',
      title: 'Free Coins',
      subtitle: 'Watch & Earn',
      icon: <Gift color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      onPress: handleFreeCoins,
      showArrow: false,
      isSpecial: true,
      gradientColors: ['#800080', '#6b21a8'],
    },
    {
      id: 'stop-ads',
      title: 'Stop Ads',
      subtitle: '5 Hours Ad-Free',
      icon: <ShieldOff color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      onPress: handleStopAds,
      showArrow: true,
      gradientColors: ['#800080', '#7c2d92'],
    },
    {
      id: 'rate-us',
      title: 'Rate Us',
      subtitle: 'Get 400 Coins',
      icon: <Star color="#FFD700" size={isVerySmallScreen ? 20 : 24} />,
      onPress: handleRateUs,
      showArrow: true,
      gradientColors: ['#800080', '#8b5cf6'],
    },
  ];

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmerX.value, [-1, 1], [-screenWidth, screenWidth])
      }
    ]
  }));

  const coinRainStyle = useAnimatedStyle(() => ({
    opacity: coinRain.value,
    transform: [
      {
        translateY: interpolate(coinRain.value, [0, 1], [-50, 200])
      }
    ]
  }));

  const giftBoxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: giftBoxScale.value }]
  }));

  const getCardAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: cardScales[index].value }]
    }));
  };

  const renderCard = (item: MoreItem, index: number) => (
    <Animated.View
      key={item.id}
      style={[
        styles.cardContainer,
        getCardAnimatedStyle(index),
        { 
          marginBottom: isSmallScreen ? 12 : 16,
          width: isSmallScreen ? '100%' : '48%'
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleCardPress(index, item.onPress)}
      >
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Shimmer overlay */}
          <View style={styles.shimmerContainer}>
            <Animated.View style={[styles.shimmer, shimmerStyle]} />
          </View>

          {/* Card content */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[
                styles.iconContainer,
                item.isSpecial && giftBoxStyle
              ]}>
                {item.icon}
              </View>
              
              {item.showArrow ? (
                <Animated.View style={styles.arrowContainer}>
                  <ChevronRight color="#FFD700" size={isVerySmallScreen ? 16 : 20} />
                </Animated.View>
              ) : (
                <View style={styles.specialBadge}>
                  <Play color="white" size={isVerySmallScreen ? 10 : 12} />
                  <Text style={styles.specialBadgeText}>TAP</Text>
                </View>
              )}
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>

          {/* Gold accent border */}
          <View style={styles.goldAccent} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="More" 
        showCoinDisplay={true} 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />

      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(128, 0, 128, 0.1)', 'transparent']}
        style={styles.backgroundGradient}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.content, fadeInStyle]}>

          {/* Cards grid */}
          <View style={[
            styles.cardsGrid,
            isSmallScreen && styles.cardsGridSmall
          ]}>
            {moreItems.map((item, index) => renderCard(item, index))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Coin rain animation */}
      {showCoinAnimation && (
        <View style={styles.coinRainContainer}>
          {Array.from({ length: 10 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.coin,
                coinRainStyle,
                {
                  left: Math.random() * (screenWidth - 30),
                  animationDelay: Math.random() * 500,
                }
              ]}
            >
              <Text style={styles.coinEmoji}>🪙</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 12 : 16,
  },
  heroSection: {
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  heroGradient: {
    padding: isVerySmallScreen ? 20 : 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 13 : 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardsGridSmall: {
    flexDirection: 'column',
  },
  cardContainer: {
    // Width set dynamically in renderCard
  },
  card: {
    borderRadius: 16,
    padding: isVerySmallScreen ? 16 : 20,
    minHeight: isVerySmallScreen ? 120 : 140,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: isVerySmallScreen ? 40 : 48,
    height: isVerySmallScreen ? 40 : 48,
    borderRadius: isVerySmallScreen ? 20 : 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  arrowContainer: {
    padding: 4,
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: isVerySmallScreen ? 6 : 8,
    paddingVertical: isVerySmallScreen ? 3 : 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  specialBadgeText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 8 : 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: isVerySmallScreen ? 11 : 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  goldAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFD700',
  },
  coinRainContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  coin: {
    position: 'absolute',
    top: 100,
  },
  coinEmoji: {
    fontSize: 24,
  },
});