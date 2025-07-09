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
import { ArrowLeft, FileText, Scale, AlertTriangle, CheckCircle } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <FileText color="#800080" size={48} />
          </View>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <Text style={styles.heroSubtitle}>
            Please read these terms carefully before using VidGro
          </Text>
          <Text style={styles.lastUpdated}>Effective Date: January 2025</Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle color="#800080" size={24} />
            <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          </View>
          <Text style={styles.sectionContent}>
            By accessing and using VidGro ("the Service"), you accept and agree to be bound by the 
            terms and provision of this agreement. If you do not agree to abide by the above, 
            please do not use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.sectionContent}>
            VidGro is a video viewing platform that rewards users with virtual coins for watching 
            videos and allows users to promote their own content. The service includes:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Video viewing and earning coins</Text>
            <Text style={styles.bulletPoint}>• Video promotion and advertising services</Text>
            <Text style={styles.bulletPoint}>• Coin-based reward system</Text>
            <Text style={styles.bulletPoint}>• User account management</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.sectionContent}>
            To use certain features of the Service, you must register for an account. You agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
            <Text style={styles.bulletPoint}>• Maintain the security of your account</Text>
            <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>
            <Text style={styles.bulletPoint}>• Notify us immediately of any unauthorized use</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale color="#800080" size={24} />
            <Text style={styles.sectionTitle}>User Conduct</Text>
          </View>
          <Text style={styles.sectionContent}>
            You agree not to use the Service to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Upload or promote illegal, harmful, or offensive content</Text>
            <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
            <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
            <Text style={styles.bulletPoint}>• Engage in fraudulent activities or coin manipulation</Text>
            <Text style={styles.bulletPoint}>• Spam, harass, or abuse other users</Text>
            <Text style={styles.bulletPoint}>• Use automated systems to manipulate the platform</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coin System</Text>
          <Text style={styles.sectionContent}>
            VidGro uses a virtual coin system for rewards and payments:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Coins have no real-world monetary value</Text>
            <Text style={styles.bulletPoint}>• Coins cannot be exchanged for cash</Text>
            <Text style={styles.bulletPoint}>• Coin balances may be adjusted for violations</Text>
            <Text style={styles.bulletPoint}>• We reserve the right to modify the coin system</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content and Intellectual Property</Text>
          <Text style={styles.sectionContent}>
            By uploading or promoting content through our Service:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• You retain ownership of your content</Text>
            <Text style={styles.bulletPoint}>• You grant us license to display and distribute your content</Text>
            <Text style={styles.bulletPoint}>• You confirm you have rights to all content you upload</Text>
            <Text style={styles.bulletPoint}>• You're responsible for content compliance with laws</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle color="#FF6B35" size={24} />
            <Text style={styles.sectionTitle}>Disclaimers and Limitations</Text>
          </View>
          <Text style={styles.sectionContent}>
            The Service is provided "as is" without warranties of any kind. We disclaim all warranties, 
            express or implied, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Merchantability and fitness for a particular purpose</Text>
            <Text style={styles.bulletPoint}>• Uninterrupted or error-free service</Text>
            <Text style={styles.bulletPoint}>• Security or accuracy of information</Text>
            <Text style={styles.bulletPoint}>• Third-party content or services</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.sectionContent}>
            We may terminate or suspend your account and access to the Service immediately, 
            without prior notice, for conduct that we believe violates these Terms or is harmful 
            to other users, us, or third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.sectionContent}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs 
            your use of the Service, to understand our practices.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.sectionContent}>
            We reserve the right to modify these terms at any time. We will notify users of any 
            material changes. Your continued use of the Service after such modifications constitutes 
            acceptance of the updated terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.sectionContent}>
            These Terms shall be governed by and construed in accordance with the laws of the 
            jurisdiction in which VidGro operates, without regard to conflict of law provisions.
          </Text>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Information</Text>
          <Text style={styles.contactContent}>
            If you have any questions about these Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>legal@vidgro.com</Text>
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
    marginBottom: 8,
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