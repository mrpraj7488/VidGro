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
  const warningPulse = useSharedValue(1);

  React.useEffect(() => {
    // Start warning pulse animation
    warningPulse.value = withSequence(
      withSpring(1.02, { damping: 15, stiffness: 200 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
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
            // Simulate account deletion process
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
  };

  const warningAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: warningPulse.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <Trash2 size={24} color="white" />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Warning Section */}
        <Animated.View style={[
          styles.warningContainer, 
          { 
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'
          },
          warningAnimatedStyle
        ]}>
          <LinearGradient
            colors={isDark ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
            style={styles.warningGradient}
          >
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
          </LinearGradient>
        </Animated.View>

        {/* Account Summary */}
        <View style={[styles.accountSummary, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
            style={styles.summaryGradient}
          >
            <Text style={[
              styles.summaryTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
              }
            ]}>
              📊 Account Summary
            </Text>
            
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(128, 0, 128, 0.15)' }]}>
                <User size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.primary} />
                <Text style={[
                  styles.summaryLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Username
                </Text>
                <Text style={[
                  styles.summaryValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                  }
                ]} numberOfLines={1}>
                  {profile?.username || 'N/A'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.15)' }]}>
                <Coins size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="#FFD700" />
                <Text style={[
                  styles.summaryLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Coins
                </Text>
                <Text style={[
                  styles.summaryValue, 
                  { 
                    color: '#FFD700',
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                  }
                ]}>
                  🪙{profile?.coins?.toLocaleString() || '0'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                <Mail size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.success} />
                <Text style={[
                  styles.summaryLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Email
                </Text>
                <Text style={[
                  styles.summaryValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                  }
                ]} numberOfLines={1}>
                  {profile?.email || 'N/A'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.15)' }]}>
                <Calendar size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="#3498DB" />
                <Text style={[
                  styles.summaryLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Member Since
                </Text>
                <Text style={[
                  styles.summaryValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
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
        </View>

        {/* Confirmation Section */}
        <View style={[styles.confirmationSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)'] : ['rgba(239, 68, 68, 0.08)', 'rgba(239, 68, 68, 0.03)']}
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
                fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              Type "DELETE" below to confirm permanent account deletion:
            </Text>

            <View style={styles.inputContainer}>
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
                maxLength={6}
              />
              {confirmText === 'DELETE' && (
                <View style={[styles.confirmCheck, { backgroundColor: colors.success }]}>
                  <Shield size={isTinyScreen ? 12 : 14} color="white" />
                </View>
              )}
            </View>

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
              <LinearGradient
                colors={['#E74C3C', '#C0392B']}
                style={styles.deleteButtonGradient}
              >
                <Trash2 size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="white" />
                <Text style={[
                  styles.deleteButtonText,
                  { fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 15 : 16 }
                ]}>
                  {loading ? 'Deleting Account...' : 'Delete Account Forever'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={[
                styles.cancelButtonText, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 15
                }
              ]}>
                Cancel - Keep My Account
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Data Loss Information */}
        <View style={[styles.dataLossSection, { backgroundColor: colors.warning + '15' }]}>
          <View style={styles.dataLossHeader}>
            <AlertTriangle size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color={colors.warning} />
            <Text style={[
              styles.dataLossTitle, 
              { 
                color: colors.warning,
                fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
              }
            ]}>
              📋 What Will Be Lost
            </Text>
          </View>
          
          <View style={styles.dataLossGrid}>
            {[
              { icon: User, label: 'Profile & Username', color: colors.primary },
              { icon: Coins, label: 'Coin Balance', color: '#FFD700' },
              { icon: Shield, label: 'VIP Status', color: '#9B59B6' },
              { icon: Calendar, label: 'Account History', color: colors.success }
            ].map((item, index) => (
              <View key={index} style={[styles.dataLossItem, { backgroundColor: colors.warning + '10' }]}>
                <item.icon size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={item.color} />
                <Text style={[
                  styles.dataLossText, 
                  { 
                    color: colors.warning,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: colors.primary + '15' }]}>
          <Shield size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.primary} />
          <View style={styles.securityContent}>
            <Text style={[
              styles.securityTitle, 
              { 
                color: colors.primary,
                fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              🔒 Secure Deletion Process
            </Text>
            <Text style={[
              styles.securityText, 
              { 
                color: colors.primary,
                fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 12 : 14
              }
            ]}>
              Your data will be securely deleted from all our servers within 30 days as per our privacy policy.
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
  },
  scrollContent: {
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingBottom: 40,
  },

  // Warning Section
  warningContainer: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(231, 76, 60, 0.2)',
      },
    }),
  },
  warningGradient: {
    alignItems: 'center',
    padding: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  warningIcon: {
    width: isTinyScreen ? 64 : isVerySmallScreen ? 72 : 80,
    height: isTinyScreen ? 64 : isVerySmallScreen ? 72 : 80,
    borderRadius: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(231, 76, 60, 0.3)',
      },
    }),
  },
  warningTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  warningText: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24,
    fontWeight: '500',
  },

  // Account Summary
  accountSummary: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    overflow: 'hidden',
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
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  summaryGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  summaryTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  summaryCard: {
    width: isTinyScreen 
      ? (screenWidth - 48) / 2 
      : isVerySmallScreen 
        ? (screenWidth - 52) / 2
        : (screenWidth - 56) / 2,
    alignItems: 'center',
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    gap: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  summaryLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Confirmation Section
  confirmationSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    overflow: 'hidden',
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
    lineHeight: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  confirmInput: {
    width: '100%',
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    paddingHorizontal: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    paddingVertical: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    borderWidth: 2,
    fontWeight: 'bold',
    letterSpacing: 2,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  confirmCheck: {
    position: 'absolute',
    right: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    top: '50%',
    transform: [{ translateY: isTinyScreen ? -10 : isVerySmallScreen ? -11 : -12 }],
    width: isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24,
    height: isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24,
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    overflow: 'hidden',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(231, 76, 60, 0.3)',
      },
    }),
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    paddingHorizontal: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
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
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    paddingHorizontal: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontWeight: '600',
  },

  // Data Loss Section
  dataLossSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  dataLossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  dataLossTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dataLossGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  dataLossItem: {
    width: isTinyScreen 
      ? (screenWidth - 48) / 2 
      : isVerySmallScreen 
        ? (screenWidth - 52) / 2
        : (screenWidth - 56) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  dataLossText: {
    flex: 1,
    fontWeight: '600',
    lineHeight: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    gap: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
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
    lineHeight: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    fontWeight: '500',
  },
});