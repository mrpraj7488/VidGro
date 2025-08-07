import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { DollarSign, Crown, ShieldOff, Star, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, User, X, Bug, Gift, Play, Clock, Coins } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTablet = screenWidth >= 768;

export default function MoreTab() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [freeCoinsAvailable, setFreeCoinsAvailable] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFreeCoinsAvailability();
    
    // Update timer every minute
    const interval = setInterval(checkFreeCoinsAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkFreeCoinsAvailability = async () => {
    try {
      const lastClaimTime = await AsyncStorage.getItem('lastFreeCoinsClaimTime');
      if (lastClaimTime) {
        const lastClaim = new Date(lastClaimTime);
        const now = new Date();
        const timeDiff = now.getTime() - lastClaim.getTime();
        const twoHoursInMs = 2 * 60 * 60 * 1000;
        
        if (timeDiff < twoHoursInMs) {
          setFreeCoinsAvailable(false);
          const remainingMs = twoHoursInMs - timeDiff;
          const hours = Math.floor(remainingMs / (60 * 60 * 1000));
          const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setFreeCoinsAvailable(true);
          setTimeRemaining('');
        }
      } else {
        setFreeCoinsAvailable(true);
        setTimeRemaining('');
      }
    } catch (error) {
      console.error('Error checking free coins availability:', error);
      setFreeCoinsAvailable(true);
    }
  };

  const handleFreeCoinsClick = async () => {
    if (!freeCoinsAvailable || loading) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);

    try {
      // Simulate AdMob rewarded ad
      Alert.alert(
        '🎬 Watch Ad for Free Coins',
        'Watch a 30-second ad to earn 100 free coins. Continue?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          { 
            text: '▶️ Watch Ad', 
            onPress: async () => {
              // Simulate ad watching process
              setTimeout(async () => {
                try {
                  // Award coins to user
                  if (user) {
                    const { error } = await supabase
                      .from('coin_transactions')
                      .insert({
                        user_id: user.id,
                        amount: 100,
                        transaction_type: 'ad_reward',
                        description: 'Free coins earned by watching 30-second ad',
                        reference_id: `ad_${Date.now()}`,
                        metadata: {
                          ad_duration: 30,
                          platform: Platform.OS
                        }
                      });

                    if (!error) {
                      // Update user's coin balance
                      await supabase
                        .from('profiles')
                        .update({ 
                          coins: (profile?.coins || 0) + 100 
                        })
                        .eq('id', user.id);

                      // Record claim time
                      await AsyncStorage.setItem('lastFreeCoinsClaimTime', new Date().toISOString());
                      
                      // Refresh profile and check availability
                      await refreshProfile();
                      await checkFreeCoinsAvailability();

                      if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }

                      Alert.alert(
                        '🎉 Coins Earned!',
                        '100 coins have been added to your account! Come back in 2 hours for more free coins.',
                        [{ text: '🚀 Awesome!' }]
                      );
                    } else {
                      throw new Error('Failed to award coins');
                    }
                  }
                } catch (error) {
                  console.error('Error awarding free coins:', error);
                  Alert.alert('Error', 'Failed to award coins. Please try again.');
                } finally {
                  setLoading(false);
                }
              }, 3000); // Simulate 30-second ad
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling free coins:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: DollarSign, title: 'Buy Coins', subtitle: 'Unlock Rewards', route: '/buy-coins' },
    { icon: Crown, title: 'Become VIP', subtitle: 'Premium Access', route: '/become-vip' },
    { icon: ShieldOff, title: 'Stop Ads', subtitle: '5 Hours Ad-Free', route: '/configure-ads' },
    { icon: Star, title: 'Rate Us', subtitle: 'Get 100 Coins', route: '/rate-us' },
    { icon: Bug, title: 'Report Problem', subtitle: 'Technical Issues', route: '/report-problem' },
  ];

  const sideMenuItems = [
    { icon: Share2, title: 'Refer a Friend', route: '/refer-friend' },
    { icon: Shield, title: 'Privacy Policy', route: '/privacy-policy' },
    { icon: FileText, title: 'Terms of Service', route: '/terms' },
    { icon: Globe, title: 'Languages', route: '/languages' },
    { icon: Settings, title: 'Configure Ads', route: '/configure-ads' },
    { icon: MessageCircle, title: 'Contact Support', route: '/contact-support' },
    { icon: LogOut, title: 'Log Out', action: 'logout', color: '#E74C3C' },
    { icon: Trash2, title: 'Delete Account', route: '/delete-account', color: '#E74C3C' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    router.replace('/(auth)/login');
  };

  const handleItemPress = (item: any) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="More" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        {/* Main Menu Grid */}
        <View style={[styles.menuGrid, isTablet && styles.menuGridTablet]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { 
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  borderColor: colors.border
                },
                isTablet && styles.menuItemTablet
              ]}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(74, 144, 226, 0.15)', 'rgba(74, 144, 226, 0.05)']
                  : ['rgba(128, 0, 128, 0.15)', 'rgba(128, 0, 128, 0.05)']
                }
                style={styles.menuItemGradient}
              >
                <View style={[
                  styles.menuItemIcon, 
                  { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 0, 128, 0.2)' }
                ]}>
                  <item.icon size={isVerySmallScreen ? 20 : 24} color={colors.accent} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[
                    styles.menuItemTitle, 
                    { 
                      color: colors.text,
                      fontSize: isVerySmallScreen ? 16 : 18
                    }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.menuItemSubtitle, 
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 12 : 14
                    }
                  ]}>
                    {item.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free Coins Section */}
        <View style={[styles.freeCoinsSection, isTablet && styles.freeCoinsSectionTablet]}>
          <Text style={[
            styles.freeCoinsSectionTitle, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 18 : 20
            }
          ]}>
            🎁 Free Coins
          </Text>
          
          <TouchableOpacity
            style={[
              styles.freeCoinsCard,
              { 
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                borderColor: freeCoinsAvailable ? colors.success : colors.border,
                opacity: freeCoinsAvailable ? 1 : 0.7
              },
              !freeCoinsAvailable && styles.freeCoinsCardDisabled,
              isTablet && styles.freeCoinsCardTablet
            ]}
            onPress={handleFreeCoinsClick}
            disabled={!freeCoinsAvailable || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                freeCoinsAvailable
                  ? isDark 
                    ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']
                    : ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']
                  : isDark
                    ? ['rgba(107, 114, 128, 0.1)', 'rgba(107, 114, 128, 0.05)']
                    : ['rgba(156, 163, 175, 0.1)', 'rgba(156, 163, 175, 0.05)']
              }
              style={styles.freeCoinsGradient}
            >
              <View style={styles.freeCoinsHeader}>
                <View style={[
                  styles.freeCoinsIcon,
                  { 
                    backgroundColor: freeCoinsAvailable 
                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)')
                      : (isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(156, 163, 175, 0.2)')
                  }
                ]}>
                  {freeCoinsAvailable ? (
                    <Gift size={isVerySmallScreen ? 24 : 28} color={colors.success} />
                  ) : (
                    <Clock size={isVerySmallScreen ? 24 : 28} color={colors.textSecondary} />
                  )}
                </View>
                
                <View style={styles.freeCoinsContent}>
                  <Text style={[
                    styles.freeCoinsTitle,
                    { 
                      color: freeCoinsAvailable ? colors.text : colors.textSecondary,
                      fontSize: isVerySmallScreen ? 16 : 18
                    }
                  ]}>
                    {freeCoinsAvailable ? 'Watch Ad & Earn' : 'Free Coins Cooldown'}
                  </Text>
                  <Text style={[
                    styles.freeCoinsSubtitle,
                    { 
                      color: freeCoinsAvailable ? colors.textSecondary : colors.textSecondary,
                      fontSize: isVerySmallScreen ? 12 : 14
                    }
                  ]}>
                    {freeCoinsAvailable 
                      ? '30s Ad = 100 Coins' 
                      : `Available in ${timeRemaining}`
                    }
                  </Text>
                </View>

                <View style={styles.freeCoinsReward}>
                  <View style={[
                    styles.coinsBadge,
                    { 
                      backgroundColor: freeCoinsAvailable 
                        ? (isDark ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.15)')
                        : (isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(156, 163, 175, 0.15)')
                    }
                  ]}>
                    <Coins size={isVerySmallScreen ? 14 : 16} color={freeCoinsAvailable ? '#FFD700' : colors.textSecondary} />
                    <Text style={[
                      styles.coinsAmount,
                      { 
                        color: freeCoinsAvailable ? '#FFD700' : colors.textSecondary,
                        fontSize: isVerySmallScreen ? 14 : 16
                      }
                    ]}>
                      100
                    </Text>
                  </View>
                </View>
              </View>

              {freeCoinsAvailable && (
                <View style={styles.freeCoinsAction}>
                  <View style={[styles.adPreview, { backgroundColor: colors.primary + '15' }]}>
                    <Play size={isVerySmallScreen ? 12 : 14} color={colors.primary} />
                    <Text style={[
                      styles.adPreviewText,
                      { 
                        color: colors.primary,
                        fontSize: isVerySmallScreen ? 11 : 12
                      }
                    ]}>
                      {loading ? 'Loading Ad...' : 'Tap to watch 30s ad'}
                    </Text>
                  </View>
                </View>
              )}

              {!freeCoinsAvailable && timeRemaining && (
                <View style={styles.cooldownInfo}>
                  <View style={[styles.cooldownBadge, { backgroundColor: colors.warning + '15' }]}>
                    <Clock size={isVerySmallScreen ? 12 : 14} color={colors.warning} />
                    <Text style={[
                      styles.cooldownText,
                      { 
                        color: colors.warning,
                        fontSize: isVerySmallScreen ? 11 : 12
                      }
                    ]}>
                      Next free coins in {timeRemaining}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Enhanced Menu Items with Better Spacing */}
        <View style={[styles.additionalMenuSection, isTablet && styles.additionalMenuSectionTablet]}>
          <Text style={[
            styles.additionalMenuTitle,
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            ⚙️ Settings & Support
          </Text>
          
          <View style={[styles.additionalMenuGrid, isTablet && styles.additionalMenuGridTablet]}>
            {[
              { icon: Share2, title: 'Refer Friends', subtitle: 'Earn 500 Coins', route: '/refer-friend', color: colors.success },
              { icon: MessageCircle, title: 'Get Help', subtitle: 'Contact Support', route: '/contact-support', color: colors.primary },
              { icon: Shield, title: 'Privacy', subtitle: 'Your Data Safety', route: '/privacy-policy', color: colors.warning },
              { icon: Globe, title: 'Language', subtitle: 'Change App Language', route: '/languages', color: colors.accent },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.additionalMenuItem,
                  { 
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadowColor,
                    borderColor: colors.border
                  },
                  isTablet && styles.additionalMenuItemTablet
                ]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark 
                    ? [`${item.color}20`, `${item.color}05`]
                    : [`${item.color}15`, `${item.color}05`]
                  }
                  style={styles.additionalMenuItemGradient}
                >
                  <View style={[styles.additionalMenuIcon, { backgroundColor: item.color + '20' }]}>
                    <item.icon size={isVerySmallScreen ? 18 : 20} color={item.color} />
                  </View>
                  <View style={styles.additionalMenuContent}>
                    <Text style={[
                      styles.additionalMenuItemTitle,
                      { 
                        color: colors.text,
                        fontSize: isVerySmallScreen ? 14 : 16
                      }
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={[
                      styles.additionalMenuItemSubtitle,
                      { 
                        color: colors.textSecondary,
                        fontSize: isVerySmallScreen ? 11 : 12
                      }
                    ]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Actions Section */}
        <View style={[styles.accountSection, isTablet && styles.accountSectionTablet]}>
          <Text style={[
            styles.accountSectionTitle,
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            👤 Account Actions
          </Text>
          
          <View style={[styles.accountActions, isTablet && styles.accountActionsTablet]}>
            <TouchableOpacity
              style={[
                styles.accountAction,
                { 
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  borderColor: colors.border
                },
                isTablet && styles.accountActionTablet
              ]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']
                  : ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']
                }
                style={styles.accountActionGradient}
              >
                <View style={[styles.accountActionIcon, { backgroundColor: colors.error + '20' }]}>
                  <LogOut size={isVerySmallScreen ? 18 : 20} color={colors.error} />
                </View>
                <View style={styles.accountActionContent}>
                  <Text style={[
                    styles.accountActionTitle,
                    { 
                      color: colors.error,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    Sign Out
                  </Text>
                  <Text style={[
                    styles.accountActionSubtitle,
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 11 : 12
                    }
                  ]}>
                    Log out of your account
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountAction,
                { 
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                  borderColor: colors.border
                },
                isTablet && styles.accountActionTablet
              ]}
              onPress={() => router.push('/delete-account')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']
                  : ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']
                }
                style={styles.accountActionGradient}
              >
                <View style={[styles.accountActionIcon, { backgroundColor: colors.error + '20' }]}>
                  <Trash2 size={isVerySmallScreen ? 18 : 20} color={colors.error} />
                </View>
                <View style={styles.accountActionContent}>
                  <Text style={[
                    styles.accountActionTitle,
                    { 
                      color: colors.error,
                      fontSize: isVerySmallScreen ? 14 : 16
                    }
                  ]}>
                    Delete Account
                  </Text>
                  <Text style={[
                    styles.accountActionSubtitle,
                    { 
                      color: colors.textSecondary,
                      fontSize: isVerySmallScreen ? 11 : 12
                    }
                  ]}>
                    Permanently remove account
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={[styles.appInfoSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.appName, { color: colors.text }]}>VidGro</Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            Watch videos, earn coins, promote content
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isVerySmallScreen ? 16 : 20,
    paddingVertical: isVerySmallScreen ? 16 : 20,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    paddingBottom: 60,
  },

  // Main Menu Grid
  menuGrid: {
    gap: isVerySmallScreen ? 12 : 16,
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  menuGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  menuItem: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  menuItemTablet: {
    width: (screenWidth - 120) / 2,
  },
  menuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 16 : 20,
  },
  menuItemIcon: {
    width: isVerySmallScreen ? 44 : 48,
    height: isVerySmallScreen ? 44 : 48,
    borderRadius: isVerySmallScreen ? 22 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 12 : 16,
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
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  menuItemSubtitle: {
    lineHeight: 18,
  },

  // Free Coins Section
  freeCoinsSection: {
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  freeCoinsSectionTablet: {
    marginBottom: 40,
  },
  freeCoinsSectionTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 12 : 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  freeCoinsCard: {
    borderRadius: isVerySmallScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  freeCoinsCardTablet: {
    alignSelf: 'center',
    maxWidth: 400,
  },
  freeCoinsCardDisabled: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.05,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  freeCoinsGradient: {
    padding: isVerySmallScreen ? 18 : 24,
  },
  freeCoinsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isVerySmallScreen ? 12 : 16,
  },
  freeCoinsIcon: {
    width: isVerySmallScreen ? 56 : 64,
    height: isVerySmallScreen ? 56 : 64,
    borderRadius: isVerySmallScreen ? 28 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 12 : 16,
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
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  freeCoinsContent: {
    flex: 1,
  },
  freeCoinsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  freeCoinsSubtitle: {
    lineHeight: 18,
  },
  freeCoinsReward: {
    alignItems: 'center',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 10 : 12,
    paddingVertical: isVerySmallScreen ? 6 : 8,
    borderRadius: 16,
    gap: isVerySmallScreen ? 4 : 6,
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
  coinsAmount: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  freeCoinsAction: {
    alignItems: 'center',
  },
  adPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 10,
    borderRadius: 12,
    gap: isVerySmallScreen ? 6 : 8,
  },
  adPreviewText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cooldownInfo: {
    alignItems: 'center',
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 8 : 10,
    borderRadius: 12,
    gap: isVerySmallScreen ? 6 : 8,
  },
  cooldownText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Additional Menu Section
  additionalMenuSection: {
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  additionalMenuSectionTablet: {
    marginBottom: 40,
  },
  additionalMenuTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 12 : 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  additionalMenuGrid: {
    gap: isVerySmallScreen ? 10 : 12,
  },
  additionalMenuGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  additionalMenuItem: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  additionalMenuItemTablet: {
    width: (screenWidth - 112) / 2,
  },
  additionalMenuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 14 : 16,
  },
  additionalMenuIcon: {
    width: isVerySmallScreen ? 36 : 40,
    height: isVerySmallScreen ? 36 : 40,
    borderRadius: isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 10 : 12,
  },
  additionalMenuContent: {
    flex: 1,
  },
  additionalMenuItemTitle: {
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  additionalMenuItemSubtitle: {
    lineHeight: 16,
  },

  // Account Section
  accountSection: {
    marginBottom: isVerySmallScreen ? 24 : 32,
  },
  accountSectionTablet: {
    marginBottom: 40,
  },
  accountSectionTitle: {
    fontWeight: 'bold',
    marginBottom: isVerySmallScreen ? 12 : 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  accountActions: {
    gap: isVerySmallScreen ? 10 : 12,
  },
  accountActionsTablet: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  accountAction: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  accountActionTablet: {
    width: 200,
  },
  accountActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isVerySmallScreen ? 14 : 16,
  },
  accountActionIcon: {
    width: isVerySmallScreen ? 36 : 40,
    height: isVerySmallScreen ? 36 : 40,
    borderRadius: isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 10 : 12,
  },
  accountActionContent: {
    flex: 1,
  },
  accountActionTitle: {
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  accountActionSubtitle: {
    lineHeight: 16,
  },

  // App Info Footer
  appInfoSection: {
    borderRadius: isVerySmallScreen ? 12 : 16,
    padding: isVerySmallScreen ? 20 : 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  appName: {
    fontSize: isVerySmallScreen ? 20 : 24,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  appVersion: {
    fontSize: isVerySmallScreen ? 12 : 14,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: isVerySmallScreen ? 12 : 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});