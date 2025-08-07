import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Star, Send, Heart, ThumbsUp } from 'lucide-react-native';

export default function RateUsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const ratingLabels = [
    '', // 0 stars
    'Poor',
    'Fair', 
    'Good',
    'Very Good',
    'Excellent'
  ];

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting');
      return;
    }

    setLoading(true);

    // Simulate rating submission
    setTimeout(() => {
      Alert.alert(
        'Thank You!',
        `Thank you for your ${rating}-star rating! You've earned 100 coins as a reward for your feedback.`,
        [{ text: 'OK', onPress: () => {
          refreshProfile();
          router.back();
        }}]
      );
      setLoading(false);
    }, 1000);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      return (
        <TouchableOpacity
          key={starNumber}
          onPress={() => setRating(starNumber)}
          style={styles.starButton}
        >
          <Star
            size={40}
            color={starNumber <= rating ? '#FFD700' : '#E0E0E0'}
            fill={starNumber <= rating ? '#FFD700' : 'transparent'}
          />
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate VidGro</Text>
          <Star size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.ratingSection, { backgroundColor: colors.surface }]}>
          <Heart size={48} color="#FF4757" />
          <Text style={[styles.ratingTitle, { color: colors.text }]}>How do you like VidGro?</Text>
          <Text style={[styles.ratingSubtitle, { color: colors.textSecondary }]}>
            Your feedback helps us improve the app for everyone
          </Text>

          <View style={styles.starsContainer}>
            {renderStars()}
          </View>

          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: colors.accent }]}>
              {ratingLabels[rating]}
            </Text>
          )}
        </View>

        <View style={[styles.feedbackSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>Tell us more (optional)</Text>
          <TextInput
            style={[styles.feedbackInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="What do you like most about VidGro? Any suggestions for improvement?"
            placeholderTextColor={colors.textSecondary}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleRatingSubmit}
          disabled={loading}
        >
          <Send size={20} color="white" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Rating & Get 100 Coins'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.benefitsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>Why rate us?</Text>
          <View style={styles.benefitItem}>
            <ThumbsUp size={20} color="#2ECC71" />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Earn 100 coins instantly</Text>
          </View>
          <View style={styles.benefitItem}>
            <Heart size={20} color="#E74C3C" />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Help us improve the app</Text>
          </View>
          <View style={styles.benefitItem}>
            <Star size={20} color="#FFD700" />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Support the VidGro community</Text>
          </View>
        </View>

        <View style={[styles.storeLinksSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.storeLinksTitle, { color: colors.text }]}>Love VidGro? Rate us on:</Text>
          <TouchableOpacity style={[styles.storeButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.storeButtonText, { color: colors.text }]}>📱 App Store</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.storeButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.storeButtonText, { color: colors.text }]}>🤖 Google Play</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.thankYouSection, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }]}>
          <Text style={[styles.thankYouText, { color: colors.primary }]}>
            Thank you for being part of the VidGro community! Your support means everything to us. 💜
          </Text>
        </View>
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
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  ratingSection: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  feedbackSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  feedbackInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    height: 100,
  },
  submitButton: {
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
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  benefitsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
  },
  storeLinksSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeLinksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  storeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  storeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  thankYouSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
  },
  thankYouText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});