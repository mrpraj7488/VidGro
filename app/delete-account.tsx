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
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trash2, AlertTriangle, Shield, Clock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

export default function DeleteAccountScreen() {
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const warningPulse = useSharedValue(1);

  const requiredText = 'DELETE MY ACCOUNT';
  const isConfirmValid = confirmText === requiredText;

  const handleDeleteAccount = async () => {
    if (!isConfirmValid) {
      Alert.alert('Error', `Please type "${requiredText}" to confirm`);
      return;
    }

    setIsDeleting(true);
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    try {
      // Simulate account deletion process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. We\'re sorry to see you go!',
        [
          {
            text: 'OK',
            onPress: () => {
              signOut();
              router.replace('/(auth)/login');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContinue = () => {
    warningPulse.value = withSequence(
      withSpring(1.05),
      withSpring(1)
    );
    setStep(2);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const warningAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: warningPulse.value }],
  }));

  if (step === 1) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Warning Section */}
          <Animated.View style={[styles.warningSection, warningAnimatedStyle]}>
            <View style={styles.warningIcon}>
              <AlertTriangle color="#E74C3C" size={48} />
            </View>
            <Text style={styles.warningTitle}>Account Deletion Warning</Text>
            <Text style={styles.warningSubtitle}>
              This action cannot be undone. Please read carefully before proceeding.
            </Text>
          </Animated.View>

          {/* What Will Be Deleted */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What will be deleted:</Text>
            <View style={styles.deletionList}>
              <Text style={styles.deletionItem}>• Your user profile and account information</Text>
              <Text style={styles.deletionItem}>• All your coin balance and transaction history</Text>
              <Text style={styles.deletionItem}>• Your promoted videos and analytics data</Text>
              <Text style={styles.deletionItem}>• Video viewing history and preferences</Text>
              <Text style={styles.deletionItem}>• Referral code and referral earnings</Text>
              <Text style={styles.deletionItem}>• All app settings and configurations</Text>
            </View>
          </View>

          {/* Consequences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Important consequences:</Text>
            <View style={styles.consequencesList}>
              <View style={styles.consequenceItem}>
                <AlertTriangle color="#E74C3C" size={16} />
                <Text style={styles.consequenceText}>
                  You will lose all coins in your account (no refund possible)
                </Text>
              </View>
              <View style={styles.consequenceItem}>
                <AlertTriangle color="#E74C3C" size={16} />
                <Text style={styles.consequenceText}>
                  Your promoted videos will be removed from the platform
                </Text>
              </View>
              <View style={styles.consequenceItem}>
                <AlertTriangle color="#E74C3C" size={16} />
                <Text style={styles.consequenceText}>
                  You cannot recover your account or data after deletion
                </Text>
              </View>
              <View style={styles.consequenceItem}>
                <AlertTriangle color="#E74C3C" size={16} />
                <Text style={styles.consequenceText}>
                  Your referral code will become invalid for future users
                </Text>
              </View>
            </View>
          </View>

          {/* Alternatives */}
          <View style={styles.alternativesSection}>
            <Text style={styles.alternativesTitle}>Consider these alternatives:</Text>
            <View style={styles.alternativesList}>
              <View style={styles.alternativeItem}>
                <Shield color="#4ECDC4" size={20} />
                <Text style={styles.alternativeText}>
                  Take a break - just stop using the app temporarily
                </Text>
              </View>
              <View style={styles.alternativeItem}>
                <Clock color="#4ECDC4" size={20} />
                <Text style={styles.alternativeText}>
                  Adjust your notification settings instead
                </Text>
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>I Understand, Continue</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Deletion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Final Confirmation */}
        <View style={styles.confirmationSection}>
          <View style={styles.confirmationIcon}>
            <Trash2 color="#E74C3C" size={48} />
          </View>
          <Text style={styles.confirmationTitle}>Final Confirmation</Text>
          <Text style={styles.confirmationSubtitle}>
            Type "{requiredText}" below to permanently delete your account
          </Text>
        </View>

        {/* Account Info */}
        <View style={styles.accountSection}>
          <Text style={styles.accountTitle}>Account to be deleted:</Text>
          <Text style={styles.accountEmail}>{user?.email}</Text>
        </View>

        {/* Confirmation Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Type "{requiredText}" to confirm:
          </Text>
          <TextInput
            style={[
              styles.confirmInput,
              isConfirmValid && styles.confirmInputValid,
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={requiredText}
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Delete Button */}
        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              !isConfirmValid && styles.deleteButtonDisabled,
              isDeleting && styles.deletingButton,
            ]}
            onPress={handleDeleteAccount}
            disabled={!isConfirmValid || isDeleting}
          >
            <Trash2 color="white" size={20} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting Account...' : 'Delete My Account Forever'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Final Warning */}
        <View style={styles.finalWarning}>
          <Text style={styles.finalWarningText}>
            ⚠️ This action is permanent and cannot be undone. All your data will be lost forever.
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
  warningSection: {
    alignItems: 'center',
    padding: isSmallScreen ? 24 : 32,
    backgroundColor: '#FFF5F5',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  warningIcon: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deletionList: {
    paddingLeft: 8,
  },
  deletionItem: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 6,
  },
  consequencesList: {
    gap: 12,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  consequenceText: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#E74C3C',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  alternativesSection: {
    backgroundColor: '#F0F8FF',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  alternativesTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  alternativesList: {
    gap: 12,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alternativeText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1E3A8A',
    marginLeft: 12,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(231, 76, 60, 0.3)',
      },
    }),
  },
  continueButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 32,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  confirmationSection: {
    alignItems: 'center',
    padding: isSmallScreen ? 24 : 32,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  confirmationIcon: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  accountSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  accountTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    marginBottom: 8,
  },
  accountEmail: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
  },
  inputSection: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  confirmInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#333',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmInputValid: {
    borderColor: '#E74C3C',
    backgroundColor: '#FFF5F5',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(231, 76, 60, 0.3)',
      },
    }),
  },
  deleteButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  deletingButton: {
    opacity: 0.8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
  },
  finalWarning: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  finalWarningText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
  },
});