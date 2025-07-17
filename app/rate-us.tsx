import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Star, Heart, ThumbsUp } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 375;

export default function RateUsScreen() {
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const starScales = Array.from({ length: 5 }, () => useSharedValue(1));
  const shimmer = useSharedValue(0);
  const fadeIn = useSharedValue(0);
  const coinGlow = useSharedValue(1);

  React.useEffect(() => {
    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    // Fade in animation
    fadeIn.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Coin glow effect
    coinGlow.value = withRepeat(
      withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
    
    // Animate the selected star
    starScales[rating - 1].value = withSequence(
      withSpring(1.3, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
  };

  const handleSubmitRating = () => {
    if (selectedRating === 0) {
      Alert.alert('Please Rate Us', 'Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    // Simulate rating submission
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Thank You! 🎉',
        'Your rating has been submitted and 400 coins have been added to your account!',
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    }, 2000);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const getStarAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      transform: [{ scale: starScales[index].value }],
    }));
  };

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmer.value * 0.7),
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        translateY: interpolate(fadeIn.value, [0, 1], [20, 0])
      }
    ]
  }));

  const coinGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinGlow.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#4b004b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Us</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(128, 0, 128, 0.05)', 'transparent']}
        style={styles.backgroundGradient}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeInStyle}>
          {/* Hero Section */}
          <LinearGradient
            colors={['#800080', '#9B59B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            <Animated.View style={[styles.heroIcon, shimmerAnimatedStyle]}>
              <Star color="#FFD700" size={isVerySmallScreen ? 48 : 64} />
            </Animated.View>
            <Text style={styles.heroTitle}>Rate VidGro</Text>
            <Text style={styles.heroSubtitle}>
              Help us improve by sharing your experience with other users
            </Text>
          </LinearGradient>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>How would you rate VidGro?</Text>
            <Text style={styles.ratingSubtitle}>
              Tap the stars to rate your experience
            </Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Animated.View key={rating} style={getStarAnimatedStyle(rating - 1)}>
                  <TouchableOpacity
                    style={styles.starButton}
                    onPress={() => handleStarPress(rating)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={rating <= selectedRating ? ['#FFD700', '#FFA500'] : ['#E5E7EB', '#D1D5DB']}
                      style={styles.starGradient}
                    >
                      <Star
                        color={rating <= selectedRating ? '#800080' : '#9CA3AF'}
                        fill={rating <= selectedRating ? '#800080' : 'transparent'}
                        size={isVerySmallScreen ? 32 : isSmallScreen ? 40 : 48}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
            
            {selectedRating > 0 && (
              <LinearGradient
                colors={['rgba(128, 0, 128, 0.1)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.ratingFeedback}
              >
                <Text style={styles.ratingText}>
                  {selectedRating === 1 && 'We appreciate your feedback!'}
                  {selectedRating === 2 && 'Thanks for your input!'}
                  {selectedRating === 3 && 'Good to know your thoughts!'}
                  {selectedRating === 4 && 'Great! We\'re glad you like VidGro!'}
                  {selectedRating === 5 && 'Awesome! You love VidGro! 🎉'}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Reward Section */}
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.rewardSection}
          >
            <Animated.View style={[styles.rewardIcon, coinGlowStyle]}>
              <Text style={styles.coinEmoji}>🪙</Text>
            </Animated.View>
            <Text style={styles.rewardTitle}>Get 400 Coins!</Text>
            <Text style={styles.rewardDescription}>
              Submit your rating and receive 400 coins as a thank you for helping us improve VidGro
            </Text>
          </LinearGradient>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Rate Us?</Text>
            
            <LinearGradient
              colors={['rgba(128, 0, 128, 0.05)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.benefitItem}
            >
              <View style={styles.benefitIconContainer}>
                <Heart color="#800080" size={isVerySmallScreen ? 16 : 20} />
              </View>
              <Text style={styles.benefitText}>Help other users discover VidGro</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['rgba(128, 0, 128, 0.05)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.benefitItem}
            >
              <View style={styles.benefitIconContainer}>
                <ThumbsUp color="#800080" size={isVerySmallScreen ? 16 : 20} />
              </View>
              <Text style={styles.benefitText}>Support app development and improvements</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['rgba(128, 0, 128, 0.05)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.benefitItem}
            >
              <View style={styles.benefitIconContainer}>
                <Star color="#800080" size={isVerySmallScreen ? 16 : 20} />
              </View>
              <Text style={styles.benefitText}>Earn 400 coins instantly</Text>
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Animated.View style={buttonAnimatedStyle}>
              <LinearGradient
                colors={selectedRating === 0 ? ['#9CA3AF', '#6B7280'] : ['#800080', '#9B59B6']}
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submittingButton
                ]}
              >
                <TouchableOpacity
                  style={styles.submitButtonInner}
                  onPress={handleSubmitRating}
                  disabled={selectedRating === 0 || isSubmitting}
                >
                  <Star color="#FFD700" size={20} />
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Rate Now & Get 400 Coins'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.submitNote}>
              Your rating will be submitted to the app store and coins will be added to your account
            </Text>
          </View>
        </Animated.View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 32,
    margin: 16,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#800080',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(128, 0, 128, 0.3)',
      },
    }),
  },
  heroIcon: {
    width: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    height: isVerySmallScreen ? 80 : isSmallScreen ? 100 : 120,
    borderRadius: isVerySmallScreen ? 40 : isSmallScreen ? 50 : 60,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  heroTitle: {
    fontSize: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  ratingSection: {
    backgroundColor: 'white',
    padding: isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24,
    margin: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
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
  ratingTitle: {
    fontSize: isVerySmallScreen ? 16 : isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 13 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isVerySmallScreen ? 6 : isSmallScreen ? 8 : 12,
    marginBottom: 16,
  },
  starButton: {
    padding: isVerySmallScreen ? 2 : 4,
  },
  starGradient: {
    borderRadius: isVerySmallScreen ? 20 : 24,
    padding: isVerySmallScreen ? 6 : 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingFeedback: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  ratingText: {
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    color: '#800080',
    fontWeight: '500',
    textAlign: 'center',
  },
  rewardSection: {
    padding: isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24,
    margin: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
      },
    }),
  },
  rewardIcon: {
    width: isVerySmallScreen ? 50 : isSmallScreen ? 60 : 70,
    height: isVerySmallScreen ? 50 : isSmallScreen ? 60 : 70,
    borderRadius: isVerySmallScreen ? 25 : isSmallScreen ? 30 : 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  coinEmoji: {
    fontSize: isVerySmallScreen ? 28 : isSmallScreen ? 32 : 36,
  },
  rewardTitle: {
    fontSize: isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsSection: {
    backgroundColor: 'white',
    padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
    margin: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  benefitsTitle: {
    fontSize: isVerySmallScreen ? 14 : isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  benefitIconContainer: {
    width: isVerySmallScreen ? 28 : 32,
    height: isVerySmallScreen ? 28 : 32,
    borderRadius: isVerySmallScreen ? 14 : 16,
    backgroundColor: 'rgba(128, 0, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: isVerySmallScreen ? 11 : isSmallScreen ? 13 : 14,
    color: '#666',
    flex: 1,
  },
  submitSection: {
    padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
    paddingBottom: 32,
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 12,
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
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submittingButton: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: isVerySmallScreen ? 12 : isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  submitNote: {
    fontSize: isVerySmallScreen ? 10 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});