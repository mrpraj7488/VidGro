import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Mail, Edit3, Save, Camera, Lock, Eye, EyeOff, Shield } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Animation values
  const saveButtonScale = useSharedValue(1);
  const avatarScale = useSharedValue(1);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    saveButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);

    try {
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      // Refresh profile data
      await refreshProfile();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        '✅ Profile Updated',
        'Your profile has been updated successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setPasswordLoading(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        '🔒 Password Updated',
        'Your password has been changed successfully!',
        [{ 
          text: 'OK', 
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);
          }
        }]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    avatarScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    Alert.alert(
      '📸 Profile Picture',
      'Profile picture upload will be available in a future update!',
      [{ text: 'OK' }]
    );
  };

  const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={isVerySmallScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isVerySmallScreen ? 18 : 22 }]}>
            Edit Profile
          </Text>
          <Edit3 size={isVerySmallScreen ? 20 : 24} color="white" />
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Avatar Section */}
          <View style={[styles.avatarSection, { backgroundColor: colors.surface }]}>
            <AnimatedTouchableOpacity
              style={[
                styles.avatarContainer,
                { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 0, 128, 0.2)' },
                avatarAnimatedStyle
              ]}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
            >
              <User size={isVerySmallScreen ? 40 : 48} color={colors.primary} />
              <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                <Camera size={isVerySmallScreen ? 12 : 14} color="white" />
              </View>
            </AnimatedTouchableOpacity>
            <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>
              Tap to change profile picture
            </Text>
          </View>

          {/* Basic Information */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              👤 Basic Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
              <View style={styles.inputContainer}>
                <User size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                <TextInput
                  style={[
                    styles.input,
                    styles.disabledInput,
                    { 
                      backgroundColor: colors.border + '30',
                      color: colors.textSecondary,
                      borderColor: colors.border,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  editable={false}
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Email cannot be changed for security reasons
              </Text>
            </View>

            <AnimatedTouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
                saveButtonAnimatedStyle
              ]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Save size={isVerySmallScreen ? 16 : 18} color="white" />
              )}
              <Text style={[styles.saveButtonText, { fontSize: isVerySmallScreen ? 14 : 16 }]}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </AnimatedTouchableOpacity>
          </View>

          {/* Password Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Lock size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  🔒 Change Password
                </Text>
              </View>
              <Text style={[styles.expandText, { color: colors.primary }]}>
                {showPasswordSection ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textSecondary}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { 
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                          fontSize: isVerySmallScreen ? 14 : 16
                        }
                      ]}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      ) : (
                        <Eye size={isVerySmallScreen ? 16 : 18} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.passwordButton,
                    { backgroundColor: colors.warning },
                    passwordLoading && styles.buttonDisabled
                  ]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Shield size={isVerySmallScreen ? 16 : 18} color="white" />
                  )}
                  <Text style={[styles.passwordButtonText, { fontSize: isVerySmallScreen ? 14 : 16 }]}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Account Information */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Account Information
            </Text>

            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Current Coins</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  🪙{profile?.coins?.toLocaleString() || '0'}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>VIP Status</Text>
                <Text style={[
                  styles.infoValue, 
                  { color: profile?.is_vip ? colors.warning : colors.textSecondary }
                ]}>
                  {profile?.is_vip ? '👑 VIP' : 'Regular'}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Member Since</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Unknown'
                  }
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Referral Code</Text>
                <Text style={[styles.infoValue, { color: colors.accent }]}>
                  {profile?.referral_code || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Security Notice */}
          <View style={[styles.securityNotice, { backgroundColor: colors.primary + '15' }]}>
            <Shield size={isVerySmallScreen ? 18 : 20} color={colors.primary} />
            <View style={styles.securityContent}>
              <Text style={[styles.securityTitle, { color: colors.primary }]}>
                🔐 Security Notice
              </Text>
              <Text style={[styles.securityText, { color: colors.primary }]}>
                Your account is protected with bank-grade encryption. Always use a strong password and never share your login credentials.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: isVerySmallScreen ? 32 : 36,
  },
  headerTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: isVerySmallScreen ? 24 : 32,
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  avatarContainer: {
    width: isVerySmallScreen ? 80 : 96,
    height: isVerySmallScreen ? 80 : 96,
    borderRadius: isVerySmallScreen ? 40 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: isVerySmallScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  cameraIcon: {
    position: 'absolute',
    bottom: isVerySmallScreen ? 4 : 6,
    right: isVerySmallScreen ? 4 : 6,
    width: isVerySmallScreen ? 24 : 28,
    height: isVerySmallScreen ? 24 : 28,
    borderRadius: isVerySmallScreen ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarLabel: {
    fontSize: isVerySmallScreen ? 12 : 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Form Sections
  section: {
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 16 : 20,
    padding: isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isVerySmallScreen ? 8 : 10,
  },
  sectionTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  expandText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: isVerySmallScreen ? 16 : 20,
  },
  inputLabel: {
    fontSize: isVerySmallScreen ? 13 : 14,
    fontWeight: '600',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 12 : 14,
    borderWidth: 1,
    gap: isVerySmallScreen ? 8 : 10,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  disabledInput: {
    opacity: 0.7,
  },
  passwordInput: {
    paddingRight: isVerySmallScreen ? 32 : 40,
  },
  eyeButton: {
    position: 'absolute',
    right: isVerySmallScreen ? 12 : 16,
    padding: 4,
  },
  helperText: {
    fontSize: isVerySmallScreen ? 11 : 12,
    marginTop: isVerySmallScreen ? 4 : 6,
    fontStyle: 'italic',
  },
  passwordContent: {
    paddingTop: isVerySmallScreen ? 8 : 12,
  },

  // Buttons
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 10 : 12,
    gap: isVerySmallScreen ? 6 : 8,
    marginTop: isVerySmallScreen ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 10 : 12,
    gap: isVerySmallScreen ? 6 : 8,
    marginTop: isVerySmallScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  passwordButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Account Information Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isVerySmallScreen ? 8 : 12,
  },
  infoCard: {
    width: isVerySmallScreen ? (screenWidth - 56) / 2 : (screenWidth - 64) / 2,
    borderRadius: isVerySmallScreen ? 10 : 12,
    padding: isVerySmallScreen ? 12 : 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  infoLabel: {
    fontSize: isVerySmallScreen ? 10 : 12,
    fontWeight: '500',
    marginBottom: isVerySmallScreen ? 4 : 6,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: isVerySmallScreen ? 12 : 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: isVerySmallScreen ? 12 : 16,
    borderRadius: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 16 : 20,
    gap: isVerySmallScreen ? 10 : 12,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: isVerySmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 6 : 8,
  },
  securityText: {
    fontSize: isVerySmallScreen ? 12 : 14,
    lineHeight: isVerySmallScreen ? 16 : 20,
  },
});