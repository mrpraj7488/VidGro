import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Eye, Lock, Database } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Shield color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            We are committed to protecting your personal information and privacy
          </Text>
          <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
        </View>

        {/* Privacy Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database color="#800080" size={24} />
            <Text style={styles.sectionTitle}>Information We Collect</Text>
          </View>
          <Text style={styles.sectionContent}>
            We collect information you provide directly to us, such as when you create an account, 
            use our services, or contact us for support. This includes:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Account information (email, username)</Text>
            <Text style={styles.bulletPoint}>• Video viewing preferences and history</Text>
            <Text style={styles.bulletPoint}>• Coin transaction records</Text>
            <Text style={styles.bulletPoint}>• Device and usage information</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye color="#800080" size={24} />
            <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          </View>
          <Text style={styles.sectionContent}>
            We use the information we collect to provide, maintain, and improve our services:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Provide and personalize our video platform</Text>
            <Text style={styles.bulletPoint}>• Process coin transactions and rewards</Text>
            <Text style={styles.bulletPoint}>• Send important service notifications</Text>
            <Text style={styles.bulletPoint}>• Improve app performance and user experience</Text>
            <Text style={styles.bulletPoint}>• Prevent fraud and ensure platform security</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock color="#800080" size={24} />
            <Text style={styles.sectionTitle}>Data Protection & Security</Text>
          </View>
          <Text style={styles.sectionContent}>
            We implement appropriate technical and organizational measures to protect your personal information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• End-to-end encryption for sensitive data</Text>
            <Text style={styles.bulletPoint}>• Secure authentication and access controls</Text>
            <Text style={styles.bulletPoint}>• Regular security audits and updates</Text>
            <Text style={styles.bulletPoint}>• Limited access to personal information</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information Sharing</Text>
          <Text style={styles.sectionContent}>
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except in the following circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• With your explicit consent</Text>
            <Text style={styles.bulletPoint}>• To comply with legal obligations</Text>
            <Text style={styles.bulletPoint}>• To protect our rights and prevent fraud</Text>
            <Text style={styles.bulletPoint}>• With trusted service providers under strict agreements</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionContent}>
            You have the following rights regarding your personal information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Access and review your personal data</Text>
            <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
            <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
            <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
            <Text style={styles.bulletPoint}>• Data portability and export</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cookies and Tracking</Text>
          <Text style={styles.sectionContent}>
            We use cookies and similar technologies to enhance your experience and analyze app usage. 
            You can control cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.sectionContent}>
            Our service is not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13. If you become aware that a child 
            has provided us with personal information, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.sectionContent}>
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </Text>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactContent}>
            If you have any questions about this Privacy Policy or our data practices, 
            please contact us at:
          </Text>
          <Text style={styles.contactEmail}>privacy@vidgro.com</Text>
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
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  sectionContent: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  contactSection: {
    backgroundColor: '#F3E8FF',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 32,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  contactTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#800080',
    marginBottom: 8,
  },
  contactContent: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#800080',
  },
});