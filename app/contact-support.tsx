import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Send, Phone, Mail, CircleHelp as HelpCircle, Bug, CreditCard, User, Coins, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';
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

export default function ContactSupportScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const cardScale = useSharedValue(0.95);

  React.useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const supportCategories = [
    { id: 'technical', title: 'Technical Issue', icon: Bug, color: '#E74C3C', description: 'App crashes, bugs, errors' },
    { id: 'payment', title: 'Payment Problem', icon: CreditCard, color: '#F39C12', description: 'Coin purchases, billing' },
    { id: 'account', title: 'Account Issue', icon: User, color: '#9B59B6', description: 'Login, profile, settings' },
    { id: 'video', title: 'Video Problem', icon: MessageCircle, color: '#3498DB', description: 'Promotion, playback issues' },
    { id: 'coins', title: 'Coin Issue', icon: Coins, color: '#FFD700', description: 'Earning, balance problems' },
    { id: 'other', title: 'Other', icon: HelpCircle, color: '#2ECC71', description: 'General questions' },
  ];

  const handleSubmitTicket = async () => {
    if (!selectedCategory || !subject || !message) {
      Alert.alert('Missing Information', 'Please fill in all fields to submit your support ticket');
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
    
    setTimeout(() => {
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
    setSelectedCategory(categoryId);
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
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#3498DB', '#2980B9']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 22 }]}>
            Contact Support
          </Text>
          <MessageCircle size={isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <Animated.View style={[
          styles.introSection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(52, 152, 219, 0.1)', 'rgba(52, 152, 219, 0.05)']}
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
              How can we help?
            </Text>
            <Text style={[
              styles.introText, 
              { 
                color: colors.textSecondary,
                fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
              }
            ]}>
              We're here to assist you with any questions or issues you may have.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Category Selection */}
        <Animated.View style={[
          styles.categorySection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <Text style={[
            styles.sectionTitle, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
            }
          ]}>
            🎯 Select Issue Category
          </Text>
          
          <View style={styles.categoriesGrid}>
            {supportCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { 
                    backgroundColor: selectedCategory === category.id 
                      ? category.color + '20' 
                      : colors.card,
                    borderColor: selectedCategory === category.id 
                      ? category.color 
                      : colors.border
                  }
                ]}
                onPress={() => handleCategorySelect(category.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <category.icon 
                    size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} 
                    color={category.color} 
                  />
                </View>
                <View style={styles.categoryContent}>
                  <Text style={[
                    styles.categoryTitle,
                    { 
                      color: selectedCategory === category.id ? category.color : colors.text,
                      fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    {category.title}
                  </Text>
                  <Text style={[
                    styles.categoryDescription,
                    { 
                      color: colors.textSecondary,
                      fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 11 : 12
                    }
                  ]}>
                    {category.description}
                  </Text>
                </View>
                {selectedCategory === category.id && (
                  <CheckCircle size={isTinyScreen ? 16 : 18} color={category.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Subject Input */}
        <Animated.View style={[
          styles.inputSection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <Text style={[
            styles.inputLabel, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
            }
          ]}>
            📝 Subject
          </Text>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
                fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
              }
            ]}
            placeholder="Brief description of your issue"
            placeholderTextColor={colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
          <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
            {subject.length}/100
          </Text>
        </Animated.View>

        {/* Message Input */}
        <Animated.View style={[
          styles.inputSection,
          { backgroundColor: colors.surface },
          cardAnimatedStyle
        ]}>
          <Text style={[
            styles.inputLabel, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
            }
          ]}>
            💬 Detailed Message
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.messageInput,
              { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
                fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
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
          <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
            {message.length}/500
          </Text>
        </Animated.View>

        {/* Submit Button */}
        <AnimatedTouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!selectedCategory || !subject || !message || loading) && styles.buttonDisabled,
            buttonAnimatedStyle
          ]}
          onPress={handleSubmitTicket}
          disabled={!selectedCategory || !subject || !message || loading}
        >
          <Send size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color="white" />
          <Text style={[
            styles.submitButtonText,
            { fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18 }
          ]}>
            {loading ? 'Submitting Ticket...' : 'Submit Support Ticket'}
          </Text>
        </AnimatedTouchableOpacity>

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
            
            <View style={styles.contactMethods}>
              <View style={[styles.contactMethod, { backgroundColor: colors.primary + '15' }]}>
                <View style={[styles.contactIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Mail size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color={colors.primary} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[
                    styles.contactMethodTitle, 
                    { 
                      color: colors.text,
                      fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    Email Support
                  </Text>
                  <Text style={[
                    styles.contactMethodText, 
                    { 
                      color: colors.primary,
                      fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
                    }
                  ]}>
                    support@vidgro.com
                  </Text>
                </View>
              </View>

              <View style={[styles.contactMethod, { backgroundColor: colors.success + '15' }]}>
                <View style={[styles.contactIcon, { backgroundColor: colors.success + '20' }]}>
                  <Phone size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color={colors.success} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[
                    styles.contactMethodTitle, 
                    { 
                      color: colors.text,
                      fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    Phone Support
                  </Text>
                  <Text style={[
                    styles.contactMethodText, 
                    { 
                      color: colors.success,
                      fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
                    }
                  ]}>
                    +1 (555) 123-4567
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.responseTimeCard, { backgroundColor: colors.warning + '15' }]}>
              <Clock size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.warning} />
              <View style={styles.responseTimeContent}>
                <Text style={[
                  styles.responseTimeTitle, 
                  { 
                    color: colors.warning,
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                  }
                ]}>
                  ⚡ Response Times
                </Text>
                <Text style={[
                  styles.responseTimeText, 
                  { 
                    color: colors.warning,
                    fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
                  }
                ]}>
                  • Critical issues: Within 1 hour{'\n'}
                  • General support: 2-4 hours{'\n'}
                  • Account questions: Within 24 hours
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Help Tips */}
        <View style={[styles.tipsSection, { backgroundColor: colors.success + '10' }]}>
          <View style={styles.tipsHeader}>
            <HelpCircle size={isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20} color={colors.success} />
            <Text style={[
              styles.tipsTitle, 
              { 
                color: colors.success,
                fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
              }
            ]}>
              💡 Quick Tips
            </Text>
          </View>
          
          <View style={styles.tipsList}>
            <Text style={[
              styles.tipText, 
              { 
                color: colors.success,
                fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
              }
            ]}>
              • Include your username and device info for faster resolution
            </Text>
            <Text style={[
              styles.tipText, 
              { 
                color: colors.success,
                fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
              }
            ]}>
              • For video issues, include the video title or URL
            </Text>
            <Text style={[
              styles.tipText, 
              { 
                color: colors.success,
                fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
              }
            ]}>
              • Screenshots help us understand visual problems better
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

  // Introduction Section
  introSection: {
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
  introGradient: {
    alignItems: 'center',
    padding: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
  },
  introIcon: {
    width: isTinyScreen ? 56 : isVerySmallScreen ? 64 : 72,
    height: isTinyScreen ? 56 : isVerySmallScreen ? 64 : 72,
    borderRadius: isTinyScreen ? 28 : isVerySmallScreen ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  introTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  introText: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 22,
    fontWeight: '500',
  },

  // Category Section
  categorySection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
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
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
  },
  categoryCard: {
    width: isTinyScreen 
      ? (screenWidth - 48) / 2 
      : isVerySmallScreen 
        ? (screenWidth - 56) / 2
        : (screenWidth - 72) / 2,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    borderWidth: 2,
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
  categoryIcon: {
    width: isTinyScreen ? 36 : isVerySmallScreen ? 40 : 44,
    height: isTinyScreen ? 36 : isVerySmallScreen ? 40 : 44,
    borderRadius: isTinyScreen ? 18 : isVerySmallScreen ? 20 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    alignSelf: 'center',
  },
  categoryContent: {
    alignItems: 'center',
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  categoryTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 2 : isVerySmallScreen ? 4 : 6,
    letterSpacing: 0.3,
  },
  categoryDescription: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    fontWeight: '500',
  },

  // Input Sections
  inputSection: {
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
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
  inputLabel: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    paddingHorizontal: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    borderWidth: 2,
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
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
  messageInput: {
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 11 : 12,
    textAlign: 'right',
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 20,
    paddingHorizontal: isTinyScreen ? 20 : isVerySmallScreen ? 24 : 32,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
    marginBottom: isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Contact Section
  contactSection: {
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
  contactGradient: {
    padding: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  contactTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
    letterSpacing: 0.5,
  },
  contactMethods: {
    gap: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    marginBottom: isTinyScreen ? 16 : isVerySmallScreen ? 20 : 24,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
  },
  contactIcon: {
    width: isTinyScreen ? 40 : isVerySmallScreen ? 44 : 48,
    height: isTinyScreen ? 40 : isVerySmallScreen ? 44 : 48,
    borderRadius: isTinyScreen ? 20 : isVerySmallScreen ? 22 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
  },
  contactMethodTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 2 : isVerySmallScreen ? 4 : 6,
    letterSpacing: 0.3,
  },
  contactMethodText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  responseTimeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
    gap: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
  },
  responseTimeContent: {
    flex: 1,
  },
  responseTimeTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
    letterSpacing: 0.3,
  },
  responseTimeText: {
    lineHeight: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    fontWeight: '500',
  },

  // Tips Section
  tipsSection: {
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    padding: isTinyScreen ? 12 : isVerySmallScreen ? 16 : 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    gap: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
  },
  tipsTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  tipsList: {
    gap: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
  },
  tipText: {
    lineHeight: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18,
    fontWeight: '500',
  },
});