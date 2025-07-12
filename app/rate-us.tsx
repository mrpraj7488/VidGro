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
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function RateUsScreen() {
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const starScales = Array.from({ length: 5 }, () => useSharedValue(1));

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#800080', '#9B59B6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Us</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Star color="#800080" size={64} />
          </View>
          <Text style={styles.heroTitle}>Rate VidGro</Text>
          <Text style={styles.heroSubtitle}>
            Help us improve by sharing your experience with other users
          </Text>
        </View>

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
                  <Star
                    color={rating <= selectedRating ? '#FFD700' : '#E5E7EB'}
                    fill={rating <= selectedRating ? '#FFD700' : 'transparent'}
                    size={isSmallScreen ? 40 : 48}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          
          {selectedRating > 0 && (
            <Text style={styles.ratingText}>
              {selectedRating === 1 && 'We appreciate your feedback!'}
              {selectedRating === 2 && 'Thanks for your input!'}
              {selectedRating === 3 && 'Good to know your thoughts!'}
              {selectedRating === 4 && 'Great! We\'re glad you like VidGro!'}
              {selectedRating === 5 && 'Awesome! You love VidGro! 🎉'}
            </Text>
          )}
        </View>

        {/* Reward Section */}
        <View style={styles.rewardSection}>
          <View style={styles.rewardIcon}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>
          <Text style={styles.rewardTitle}>Get 400 Coins!</Text>
          <Text style={styles.rewardDescription}>
            Submit your rating and receive 400 coins as a thank you for helping us improve VidGro
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Rate Us?</Text>
          
          <View style={styles.benefitItem}>
            <Heart color="#800080" size={20} />
            <Text style={styles.benefitText}>Help other users discover VidGro</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <ThumbsUp color="#800080" size={20} />
            <Text style={styles.benefitText}>Support app development and improvements</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star color="#800080" size={20} />
            <Text style={styles.benefitText}>Earn 400 coins instantly</Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                selectedRating === 0 && styles.submitButtonDisabled,
                isSubmitting && styles.submittingButton
              ]}
              onPress={handleSubmitRating}
              disabled={selectedRating === 0 || isSubmitting}
            >
              <Star color="white" size={20} />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Rate Now & Get 400 Coins'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.submitNote}>
            Your rating will be submitted to the app store and coins will be added to your account
          </Text>
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
    width: isSmallScreen ? 100 : 120,
    height: isSmallScreen ? 100 : 120,
    borderRadius: isSmallScreen ? 50 : 60,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: isSmallScreen ? 24 : 28,
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
  ratingSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 20 : 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallScreen ? 8 : 12,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#800080',
    fontWeight: '500',
    textAlign: 'center',
  },
  rewardSection: {
    backgroundColor: '#FFF9E6',
    padding: isSmallScreen ? 20 : 24,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  rewardIcon: {
    width: isSmallScreen ? 60 : 70,
    height: isSmallScreen ? 60 : 70,
    borderRadius: isSmallScreen ? 30 : 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinEmoji: {
    fontSize: isSmallScreen ? 32 : 36,
  },
  rewardTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  submitSection: {
    padding: isSmallScreen ? 16 : 20,
    paddingBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  submittingButton: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
  submitNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});