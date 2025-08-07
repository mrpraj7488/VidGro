import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Send, Phone, Mail, CircleHelp as HelpCircle } from 'lucide-react-native';

function ContactSupportScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supportCategories = [
    { id: 'technical', title: 'Technical Issue', icon: HelpCircle },
    { id: 'payment', title: 'Payment Problem', icon: Phone },
    { id: 'account', title: 'Account Issue', icon: Mail },
    { id: 'video', title: 'Video Problem', icon: MessageCircle },
    { id: 'coins', title: 'Coin Issue', icon: Send },
    { id: 'other', title: 'Other', icon: HelpCircle },
  ];

  const handleSubmitTicket = async () => {
    if (!selectedCategory || !subject || !message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // Simulate ticket submission
    setTimeout(() => {
      Alert.alert(
        'Support Ticket Submitted',
        'Your support ticket has been submitted successfully. Our team will respond within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setLoading(false);
    }, 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Contact Support</Text>
          <MessageCircle size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Need help? We're here to assist you with any questions or issues.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Category</Text>
          <View style={styles.categoriesContainer}>
            {supportCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedCategory === category.id && styles.selectedCategory
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <category.icon size={20} color={selectedCategory === category.id ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.categoryText,
                  { color: colors.textSecondary },
                  selectedCategory === category.id && styles.selectedCategoryText
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Brief description of your issue"
            placeholderTextColor={colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Please describe your issue in detail..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleSubmitTicket}
          disabled={loading}
        >
          <Send size={20} color="white" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </Text>
        </TouchableOpacity>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Other Ways to Reach Us</Text>
          <View style={styles.contactItem}>
            <Mail size={20} color="#800080" />
            <Text style={styles.contactText}>support@vidgro.com</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={20} color="#800080" />
            <Text style={styles.contactText}>+1 (555) 123-4567</Text>
          </View>
          <Text style={styles.responseTime}>
            Average response time: 2-4 hours
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
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '45%',
    gap: 8,
  },
  selectedCategory: {
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 14,
  },
  selectedCategoryText: {
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  messageInput: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#666666',
  },
  responseTime: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ContactSupportScreen;