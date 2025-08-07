import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Dimensions, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trash2, TriangleAlert as AlertTriangle, Shield, User, Mail, Coins, Calendar } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTinyScreen = screenWidth < 320;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function DeleteAccountScreen() {
  const { user, profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const cardScale = useSharedValue(0.95);

  React.useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type "DELETE" to confirm account deletion');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);
    
    Alert.alert(
      '⚠️ Final Confirmation',
      'This action cannot be undone. Are you absolutely sure you want to delete your account permanently?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
            setTimeout(async () => {
              Alert.alert(
                '✅ Account Deleted',
                'Your account has been permanently deleted. Thank you for using VidGro.',
                [{ text: 'OK', onPress: async () => {
                  await signOut();
                  router.replace('/(auth)/login');
                }}]
              );
            }, 2000);
          }
        }
      ]
    );
    
    setLoading(false);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#E74C3C', '#C0392B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 22 }]}>
            Delete Account
          </Text>
          <Trash2 size={isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Warning Section */}
        <Animated.View style={[
          styles.warningSection,
          { 
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: colors.error + '40'
          },
          cardAnimatedStyle
        ]}>
          <View style={[styles.warningIcon, { backgroundColor: colors.error + '20' }]}>
            <AlertTriangle size={isTinyScreen ? 32 : isVerySmallScreen ? 40 : 48} color={colors.error} />
          </View>
          <Text style={[
            styles.warningTitle, 
            { 
              color: colors.error,
              fontSize: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24
            }
          ]}>
            Permanent Deletion
          </Text>
          <Text style={[
            styles.warningText, 
            { 
              color: colors.error,
              fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16
            }
          ]}>
            This action cannot be undone. All your data will be permanently deleted.
          </Text>
        </Animated.View>

        {/* Account Summary */}
        <Animated.View style={[
          styles.accountSection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
            style={styles.accountGradient}
          >
            <Text style={[
              styles.accountTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
              }
            ]}>
              📊 Account Summary
            </Text>
            
            <View style={styles.accountGrid}>
              <View style={[styles.accountCard, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(128, 0, 128, 0.15)' }]}>
                <User size={isTinyScreen ? 16 : 18} color={colors.primary} />
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Username</Text>
                <Text style={[
                  styles.accountValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                  }
                ]} numberOfLines={1}>
                  {profile?.username || 'N/A'}
                </Text>
              </View>

              <View style={[styles.accountCard, { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.15)' }]}>
                <Coins size={isTinyScreen ? 16 : 18} color="#FFD700" />
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Coins</Text>
                <Text style={[
                  styles.accountValue, 
                  { 
                    color: '#FFD700',
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                  }
                ]}>
                  🪙{profile?.coins?.toLocaleString() || '0'}
                </Text>
              </View>

              <View style={[styles.accountCard, { backgroundColor: isDark ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.15)' }]}>
                <Mail size={isTinyScreen ? 16 : 18} color="#3498DB" />
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[
                  styles.accountValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
                  }
                ]} numberOfLines={1}>
                  {profile?.email || 'N/A'}
                </Text>
              </View>

              <View style={[styles.accountCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                <Calendar size={isTinyScreen ? 16 : 18} color="#10B981" />
                <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Member Since</Text>
                <Text style={[
                  styles.accountValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
                  }
                ]}>
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Unknown'
                  }
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Confirmation Section */}
        <Animated.View style={[
          styles.confirmationSection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <LinearGradient
            colors={isDark ? ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)'] : ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
            style={styles.confirmationGradient}
          >
            <Text style={[
              styles.confirmationTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
              }
            ]}>
              🔐 Confirm Deletion
            </Text>
            
            <Text style={[
              styles.confirmationText, 
              { 
                color: colors.textSecondary,
                fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              Type "DELETE" below to confirm permanent account deletion:
            </Text>

            <TextInput
              style={[
                styles.confirmInput,
                { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: confirmText === 'DELETE' ? colors.success : colors.border,
                  fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
                }
              ]}
              placeholder="Type DELETE here"
              placeholderTextColor={colors.textSecondary}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              textAlign="center"
            />

            <AnimatedTouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.error },
                (loading || confirmText !== 'DELETE') && styles.buttonDisabled,
                buttonAnimatedStyle
              ]}
              onPress={handleDeleteAccount}
              disabled={loading || confirmText !== 'DELETE'}
            >
              <Trash2 size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="white" />
              <Text style={[
                styles.deleteButtonText,
                { fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18 }
              ]}>
                {loading ? 'Deleting Account...' : 'Delete Account Forever'}
              </Text>
            </AnimatedTouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={[
                styles.cancelButtonText, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                }
              ]}>
                Cancel - Keep My Account
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: colors.primary + '15' }]}>
          <Shield size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.primary} />
          <View style={styles.securityContent}>
            <Text style={[
              styles.securityTitle, 
              { 
                color: colors.primary,
                fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              🔒 Data Security
            </Text>
            <Text style={[
              styles.securityText, 
              { 
                color: colors.primary,
                fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
              }
            ]}>
              Your data will be securely deleted within 30 days as per our privacy policy.
            </Text>
          </View>
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
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
  },
  headerTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingVertical: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    paddingBottom: 40,
  },

  // Warning Section
  warningSection: {
    alignItems: 'center',
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    padding: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(231, 76, 60, 0.15)',
      },
    }),
  },
  warningIcon: {
    width: isTinyScreen ? 64 : isVerySmallScreen ? 72 : 80,
    height: isTinyScreen ? 64 : isVerySmallScreen ? 72 : 80,
    borderRadius: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  warningTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  warningText: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24,
    fontWeight: '500',
  },

  // Account Section
  accountSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    overflow: 'hidden',
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  accountGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  accountTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    letterSpacing: 0.5,
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
  },
  accountCard: {
    width: isTinyScreen 
      ? (screenWidth - 48) / 2 
      : isVerySmallScreen 
        ? (screenWidth - 56) / 2
        : (screenWidth - 72) / 2,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    alignItems: 'center',
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
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
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  accountLabel: {
    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  accountValue: {
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
  },

  // Confirmation Section
  confirmationSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    overflow: 'hidden',
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  confirmationGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    alignItems: 'center',
  },
  confirmationTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  confirmationText: {
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    lineHeight: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 22,
    fontWeight: '500',
  },
  confirmInput: {
    width: '100%',
    maxWidth: 200,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    borderWidth: 2,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    fontWeight: 'bold',
    letterSpacing: 1,
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
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(231, 76, 60, 0.3)',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
    letterSpacing: 0.3,
  },
  securityText: {
    lineHeight: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    fontWeight: '500',
  },
});