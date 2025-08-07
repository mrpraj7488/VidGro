import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Send, Phone, Mail, CircleHelp as HelpCircle, Bug, CreditCard, User, Coins, Shield, Clock } from 'lucide-react-native';
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

function ContactSupportScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const categoryScale = useSharedValue(1);

  const supportCategories = [
    { 
      id: 'technical', 
      title: 'Technical Issue', 
      subtitle: 'App bugs & crashes',
      icon: Bug, 
      color: '#E74C3C',
      gradient: ['#E74C3C', '#C0392B']
    },
    { 
      id: 'payment', 
      title: 'Payment Problem', 
      subtitle: 'Billing & purchases',
      icon: CreditCard, 
      color: '#F39C12',
      gradient: ['#F39C12', '#E67E22']
    },
    { 
      id: 'account', 
      title: 'Account Issue', 
      subtitle: 'Profile & settings',
      icon: User, 
      color: '#9B59B6',
      gradient: ['#9B59B6', '#8E44AD']
    },
    { 
      id: 'video', 
      title: 'Video Problem', 
      subtitle: 'Promotion & viewing',
      icon: MessageCircle, 
      color: '#3498DB',
      gradient: ['#3498DB', '#2980B9']
    },
    { 
      id: 'coins', 
      title: 'Coin Issue', 
      subtitle: 'Earning & spending',
      icon: Coins, 
      color: '#FFD700',
      gradient: ['#FFD700', '#F1C40F']
    },
    { 
      id: 'other', 
      title: 'Other', 
      subtitle: 'General questions',
      icon: HelpCircle, 
      color: '#2ECC71',
      gradient: ['#2ECC71', '#27AE60']
    },
  ];

  const handleSubmitTicket = async () => {
    if (!selectedCategory || !subject || !message) {
      Alert.alert('Missing Information', 'Please fill in all fields before submitting');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);
    
    // Simulate ticket submission
    setTimeout(() => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        '✅ Support Ticket Submitted',
        `Your support ticket has been submitted successfully!\n\nTicket ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}\n\nOur team will respond within 24 hours to your registered email.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setLoading(false);
    }, 1500);
  };

  const handleCategorySelect = (categoryId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    categoryScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedCategory(categoryId);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const categoryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: categoryScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Contact Support</Text>
          <MessageCircle size={24} color="white" />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={[styles.introSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
            style={styles.introGradient}
          >
            <View style={[styles.introIcon, { backgroundColor: colors.primary + '20' }]}>
              <MessageCircle size={isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32} color={colors.primary} />
            </View>
            <Text style={[
              styles.introTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24
              }
            ]}>
              We're Here to Help
            </Text>
            <Text style={[
              styles.introText, 
              { 
                color: colors.textSecondary,
                fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              Need assistance? Our support team is ready to help you with any questions or issues.
            </Text>
          </LinearGradient>
        </View>

        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={[
            styles.sectionTitle, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
            }
          ]}>
            🎯 Select Issue Category
          </Text>
          
          <View style={styles.categoriesGrid}>
            {supportCategories.map((category) => (
              <AnimatedTouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: selectedCategory === category.id ? category.color : colors.border,
                    borderWidth: selectedCategory === category.id ? 2 : 1
                  },
                  categoryAnimatedStyle
                ]}
                onPress={() => handleCategorySelect(category.id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedCategory === category.id ? category.gradient : ['transparent', 'transparent']}
                  style={styles.categoryGradient}
                >
                  <View style={[
                    styles.categoryIconContainer,
                    { backgroundColor: selectedCategory === category.id ? 'rgba(255, 255, 255, 0.2)' : category.color + '20' }
                  ]}>
                    <category.icon 
                      size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} 
                      color={selectedCategory === category.id ? 'white' : category.color} 
                    />
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={[
                      styles.categoryTitle,
                      { 
                        color: selectedCategory === category.id ? 'white' : colors.text,
                        fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                      }
                    ]}>
                      {category.title}
                    </Text>
                    <Text style={[
                      styles.categorySubtitle,
                      { 
                        color: selectedCategory === category.id ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary,
                        fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                      }
                    ]}>
                      {category.subtitle}
                    </Text>
                  </View>
                </LinearGradient>
              </AnimatedTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Form Section */}
        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.08)', 'rgba(74, 144, 226, 0.03)'] : ['rgba(128, 0, 128, 0.08)', 'rgba(128, 0, 128, 0.03)']}
            style={styles.formGradient}
          >
            <Text style={[
              styles.formTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
              }
            ]}>
              📝 Describe Your Issue
            </Text>

            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={[
                styles.inputLabel, 
                { 
                  color: colors.text,
                  fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                }
              ]}>
                Subject
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                    fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16
                  }
                ]}
                placeholder="Brief description of your issue"
                placeholderTextColor={colors.textSecondary}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
              <Text style={[
                styles.characterCount, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                }
              ]}>
                {subject.length}/100
              </Text>
            </View>

            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={[
                styles.inputLabel, 
                { 
                  color: colors.text,
                  fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 13 : 14
                }
              ]}>
                Message
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.messageInput,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                    fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16,
                    height: isTinyScreen ? 100 : isVerySmallScreen ? 120 : 140
                  }
                ]}
                placeholder="Please describe your issue in detail..."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={[
                styles.characterCount, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                }
              ]}>
                {message.length}/500
              </Text>
            </View>

            {/* Submit Button */}
            <AnimatedTouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (loading || !selectedCategory || !subject || !message) && styles.buttonDisabled,
                buttonAnimatedStyle
              ]}
              onPress={handleSubmitTicket}
              disabled={loading || !selectedCategory || !subject || !message}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Send size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color="white" />
                    <Text style={[
                      styles.submitButtonText,
                      { fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16 }
                    ]}>
                      Submitting...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Send size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color="white" />
                    <Text style={[
                      styles.submitButtonText,
                      { fontSize: isTinyScreen ? 13 : isVerySmallScreen ? 14 : 16 }
                    ]}>
                      Submit Support Ticket
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </LinearGradient>
        </View>

        {/* Contact Information */}
        <View style={[styles.contactSection, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] : ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.contactGradient}
          >
            <Text style={[
              styles.contactTitle, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
              }
            ]}>
              📞 Other Ways to Reach Us
            </Text>
            
            <View style={styles.contactGrid}>
              <View style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.1)' }]}>
                <View style={[styles.contactIconContainer, { backgroundColor: '#3498DB' + '20' }]}>
                  <Mail size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="#3498DB" />
                </View>
                <Text style={[
                  styles.contactLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Email
                </Text>
                <Text style={[
                  styles.contactValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 12 : 13
                  }
                ]} numberOfLines={1}>
                  support@vidgro.com
                </Text>
              </View>

              <View style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                <View style={[styles.contactIconContainer, { backgroundColor: colors.success + '20' }]}>
                  <Phone size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.success} />
                </View>
                <Text style={[
                  styles.contactLabel, 
                  { 
                    color: colors.textSecondary,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                  }
                ]}>
                  Phone
                </Text>
                <Text style={[
                  styles.contactValue, 
                  { 
                    color: colors.text,
                    fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 12 : 13
                  }
                ]}>
                  +1 (555) 123-4567
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Response Time Information */}
        <View style={[styles.responseSection, { backgroundColor: colors.primary + '15' }]}>
          <View style={styles.responseHeader}>
            <Clock size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color={colors.primary} />
            <Text style={[
              styles.responseTitle, 
              { 
                color: colors.primary,
                fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
              }
            ]}>
              ⏱️ Response Times
            </Text>
          </View>
          
          <View style={styles.responseGrid}>
            {[
              { type: 'Critical Issues', time: '< 1 hour', color: '#E74C3C' },
              { type: 'General Support', time: '2-4 hours', color: '#F39C12' },
              { type: 'Account Questions', time: '< 24 hours', color: '#2ECC71' }
            ].map((item, index) => (
              <View key={index} style={[styles.responseItem, { backgroundColor: colors.primary + '10' }]}>
                <View style={[styles.responseIndicator, { backgroundColor: item.color }]} />
                <View style={styles.responseContent}>
                  <Text style={[
                    styles.responseType, 
                    { 
                      color: colors.primary,
                      fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 11 : 12
                    }
                  ]}>
                    {item.type}
                  </Text>
                  <Text style={[
                    styles.responseTime, 
                    { 
                      color: colors.primary,
                      fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 12 : 13
                    }
                  ]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Trust Section */}
        <View style={[styles.trustSection, { backgroundColor: colors.success + '15' }]}>
          <View style={styles.trustHeader}>
            <Shield size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color={colors.success} />
            <Text style={[
              styles.trustTitle, 
              { 
                color: colors.success,
                fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
              }
            ]}>
              🛡️ Trusted Support
            </Text>
          </View>
          
          <View style={styles.trustStats}>
            <View style={styles.trustStat}>
              <Text style={[
                styles.trustNumber, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
                }
              ]}>
                50K+
              </Text>
              <Text style={[
                styles.trustLabel, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                }
              ]}>
                Happy Users
              </Text>
            </View>
            <View style={styles.trustStat}>
              <Text style={[
                styles.trustNumber, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
                }
              ]}>
                98%
              </Text>
              <Text style={[
                styles.trustLabel, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                }
              ]}>
                Satisfaction
              </Text>
            </View>
            <View style={styles.trustStat}>
              <Text style={[
                styles.trustNumber, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20
                }
              ]}>
              2.5h
              </Text>
              <Text style={[
                styles.trustLabel, 
                { 
                  color: colors.success,
                  fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 10 : 11
                }
              ]}>
                Avg Response
              </Text>
            </View>
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
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingBottom: 40,
  },

  // Introduction Section
  introSection: {
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
  introGradient: {
    alignItems: 'center',
    padding: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  introIcon: {
    width: isTinyScreen ? 56 : isVerySmallScreen ? 64 : 72,
    height: isTinyScreen ? 56 : isVerySmallScreen ? 64 : 72,
    borderRadius: isTinyScreen ? 28 : isVerySmallScreen ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  introTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  introText: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24,
    fontWeight: '500',
  },

  // Category Section
  categorySection: {
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  categoryCard: {
    width: isTinyScreen 
      ? (screenWidth - 32) / 2 
      : isVerySmallScreen 
        ? (screenWidth - 36) / 2
        : (screenWidth - 44) / 2,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  categoryGradient: {
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    alignItems: 'center',
    minHeight: isTinyScreen ? 80 : isVerySmallScreen ? 90 : 100,
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: isTinyScreen ? 36 : isVerySmallScreen ? 40 : 44,
    height: isTinyScreen ? 36 : isVerySmallScreen ? 40 : 44,
    borderRadius: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  categoryContent: {
    alignItems: 'center',
  },
  categoryTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  categorySubtitle: {
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
  },

  // Form Section
  formSection: {
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
  formGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  formTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  input: {
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    borderWidth: 1,
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
  messageInput: {
    textAlignVertical: 'top',
    paddingTop: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  submitButtonGradient: {
    paddingVertical: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    paddingHorizontal: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Contact Section
  contactSection: {
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
  contactGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  contactTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    letterSpacing: 0.5,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    borderRadius: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
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
  contactIconContainer: {
    width: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    height: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  contactValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Response Section
  responseSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    marginBottom: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  responseTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  responseGrid: {
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  responseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14,
    borderRadius: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
  },
  responseIndicator: {
    width: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    height: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    borderRadius: isTinyScreen ? 4 : isVerySmallScreen ? 5 : 6,
    flexShrink: 0,
  },
  responseContent: {
    flex: 1,
  },
  responseType: {
    fontWeight: '600',
    marginBottom: 2,
  },
  responseTime: {
    fontWeight: 'bold',
  },

  // Trust Section
  trustSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  trustTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  trustStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trustStat: {
    alignItems: 'center',
  },
  trustNumber: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trustLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ContactSupportScreen;