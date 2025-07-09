import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, Phone, Clock, Send, CircleHelp as HelpCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How do I earn coins?',
    answer: 'You earn coins by watching videos for at least 30 seconds. Each completed video gives you 3 coins.',
  },
  {
    question: 'How do I promote my videos?',
    answer: 'Go to the Promote tab, enter your YouTube video URL, set your target views and duration, then pay with coins.',
  },
  {
    question: 'Why is my video on hold?',
    answer: 'New videos are held for 10 minutes before entering the active queue. This ensures fair distribution.',
  },
  {
    question: 'Can I get a refund for promoted videos?',
    answer: 'Yes! You get 100% refund within 10 minutes, and 80% refund after that when deleting videos.',
  },
  {
    question: 'How does the referral system work?',
    answer: 'Share your referral code with friends. You get 50 coins when they join, and they get 25 bonus coins.',
  },
];

export default function ContactSupportScreen() {
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation values
  const buttonScale = useSharedValue(1);

  const categories = [
    { id: 'general', label: 'General Question' },
    { id: 'technical', label: 'Technical Issue' },
    { id: 'billing', label: 'Billing & Coins' },
    { id: 'account', label: 'Account Problem' },
    { id: 'feedback', label: 'Feedback' },
  ];

  const handleSubmit = async () => {
    if (!message.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@vidgro.com?subject=VidGro Support Request');
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MessageCircle color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>We're Here to Help</Text>
          <Text style={styles.heroSubtitle}>
            Get support for any questions or issues with VidGro
          </Text>
        </View>

        {/* Quick Contact Options */}
        <View style={styles.quickContactSection}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          
          <TouchableOpacity style={styles.contactOption} onPress={handleEmailSupport}>
            <View style={styles.contactIcon}>
              <Mail color="#800080" size={24} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDescription}>support@vidgro.com</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.contactOption}>
            <View style={styles.contactIcon}>
              <Clock color="#4ECDC4" size={24} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Response Time</Text>
              <Text style={styles.contactDescription}>Usually within 24 hours</Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(index)}
              >
                <HelpCircle color="#800080" size={20} />
                <Text style={styles.faqQuestionText}>{item.question}</Text>
              </TouchableOpacity>
              
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          
          {/* Category Selection */}
          <View style={styles.categorySection}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.selectedCategory,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.selectedCategoryText,
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Your Email *</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Message Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Message *</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your question or issue in detail..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submittingButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Send color="white" size={20} />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Support Hours */}
        <View style={styles.hoursSection}>
          <Text style={styles.hoursTitle}>Support Hours</Text>
          <Text style={styles.hoursText}>
            Monday - Friday: 9:00 AM - 6:00 PM (UTC)
          </Text>
          <Text style={styles.hoursText}>
            Saturday - Sunday: 10:00 AM - 4:00 PM (UTC)
          </Text>
          <Text style={styles.hoursNote}>
            We aim to respond to all inquiries within 24 hours during business days.
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
  quickContactSection: {
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
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
  },
  faqSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  faqAnswer: {
    paddingHorizontal: 48,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCategory: {
    backgroundColor: '#F3E8FF',
    borderColor: '#800080',
  },
  categoryText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#800080',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
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
  submittingButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  hoursSection: {
    backgroundColor: '#F0F8FF',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  hoursTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1E3A8A',
    marginBottom: 4,
  },
  hoursNote: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#3B82F6',
    marginTop: 8,
    fontStyle: 'italic',
  },
});