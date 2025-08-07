import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { Menu, X, User, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTinyScreen = screenWidth < 320;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface GlobalHeaderProps {
  title: string;
  showCoinDisplay?: boolean;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
}

export default function GlobalHeader({ 
  title, 
  showCoinDisplay = true,
  menuVisible, 
  setMenuVisible 
}: GlobalHeaderProps) {
  const { profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Animation values
  const menuScale = useSharedValue(1);
  const coinScale = useSharedValue(1);

  const sideMenuItems = [
    { icon: Share2, title: 'Refer a Friend', route: '/refer-friend' },
    { icon: Shield, title: 'Privacy Policy', route: '/privacy-policy' },
    { icon: FileText, title: 'Terms of Service', route: '/terms' },
    { icon: Globe, title: 'Languages', route: '/languages' },
    { icon: MessageCircle, title: 'Contact Support', route: '/contact-support' },
    { icon: LogOut, title: 'Log Out', action: 'logout', color: '#E74C3C' },
    { icon: Trash2, title: 'Delete Account', route: '/delete-account', color: '#E74C3C' },
  ];

  const handleItemPress = async (item: any) => {
    if (item.action === 'logout') {
      await handleLogout();
    } else if (item.route) {
      router.push(item.route);
      setMenuVisible(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
    setMenuVisible(false);
  };

  const handleLogout = async (): Promise<void> => {
    setMenuVisible(false);
    
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    router.replace('/(auth)/login');
  };

  const handleMenuPress = () => {
    menuScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      menuScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 100);
    setMenuVisible(!menuVisible);
  };

  const handleCoinPress = () => {
    coinScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      coinScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 100);
    router.push('/transaction-history');
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
  }));

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

  const renderSideMenu = () => (
    <View style={[
      styles.sideMenu, 
      { 
        left: menuVisible ? 0 : -Math.min(300, screenWidth * 0.8), 
        backgroundColor: colors.surface,
        width: Math.min(280, screenWidth * 0.85)
      }
    ]}>
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#9B59B6']}
        style={styles.sideMenuHeader}
      >
        <View style={styles.sideMenuHeaderContent}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={[styles.profileAvatar, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.25)' : 'rgba(255, 255, 255, 0.25)' }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <User size={isTinyScreen ? 20 : isVerySmallScreen ? 24 : 28} color="white" />
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
                <Text style={[
                  styles.profileName, 
                  { 
                    color: 'white',
                    fontSize: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16
                  }
                ]} numberOfLines={1}>
                  {profile?.username || 'User'}
                </Text>
                <Text style={[
                  styles.profileEmail, 
                  { 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 11 : 13
                  }
                ]} numberOfLines={1}>
                  {profile?.email || 'user@example.com'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={handleEditProfile}
            >
              <Edit3 size={isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      <View style={[styles.sideMenuContent, { backgroundColor: colors.surface }]}>
        {/* Dark Mode Toggle Section - Moved above Refer a Friend */}
        <View style={[styles.themeSection, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(128, 0, 128, 0.1)', borderBottomColor: colors.border }]}>
          <View style={styles.themeSectionContent}>
            <Text style={[styles.themeLabel, { color: colors.text }]}>🌙 Dark Mode</Text>
            <ThemeToggle />
          </View>
        </View>

        {/* Menu Items */}
        {sideMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sideMenuItem, 
              { 
                borderBottomColor: colors.border,
                paddingVertical: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14
              }
            ]}
            onPress={() => handleItemPress(item)}
          >
            <item.icon size={isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18} color={item.color || colors.primary} />
            <Text style={[
              styles.sideMenuText, 
              { 
                color: item.color || colors.text,
                fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 13 : 15
              }
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Simplified App Version at the bottom - Responsive */}
        <View style={[styles.versionSection, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(128, 0, 128, 0.1)', borderTopColor: colors.border }]}>
          <Text style={[
            styles.appName, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 14 : isVerySmallScreen ? 16 : 18
            }
          ]}>
            VidGro
          </Text>
          <Text style={[
            styles.appVersion, 
            { 
              color: colors.textSecondary,
              fontSize: isTinyScreen ? 9 : isVerySmallScreen ? 11 : 12
            }
          ]}>
            Version 1.0.0
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#9B59B6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <AnimatedTouchableOpacity 
              style={[styles.menuButton, menuAnimatedStyle]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Menu size={isTinyScreen ? 18 : isVerySmallScreen ? 20 : 24} color="white" />
            </AnimatedTouchableOpacity>
            <Text style={[
              styles.brandTitle,
              { fontSize: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 22 }
            ]}>
              VidGro
            </Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && profile && (
              <AnimatedTouchableOpacity 
                style={[styles.coinDisplay, coinAnimatedStyle]}
                onPress={handleCoinPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(74, 144, 226, 0.3)', 'rgba(74, 144, 226, 0.15)'] : ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                  style={[styles.coinBadge, {
                    borderColor: isDark ? 'rgba(74, 144, 226, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                    paddingHorizontal: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 10,
                    paddingVertical: isTinyScreen ? 3 : isVerySmallScreen ? 4 : 6
                  }]}
                >
                  <Text style={[styles.coinIcon, { fontSize: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12 }]}>🪙</Text>
                  <Text style={[
                    styles.coinText,
                    { fontSize: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 14 }
                  ]}>
                    {profile.coins.toLocaleString()}
                  </Text>
                </LinearGradient>
              </AnimatedTouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
      
      {renderSideMenu()}
      
      {menuVisible && (
        <TouchableOpacity 
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 8 : isVerySmallScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: isTinyScreen ? 28 : isVerySmallScreen ? 32 : 36,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuButton: {
    marginRight: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 12,
    padding: isTinyScreen ? 2 : 4,
    width: isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32,
    height: isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
    flex: 1,
  },
  coinDisplay: {
    flexShrink: 0,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    overflow: 'hidden',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    borderWidth: 1,
    minWidth: isTinyScreen ? 40 : isVerySmallScreen ? 50 : 60,
    justifyContent: 'center',
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
  coinIcon: {
    marginRight: isTinyScreen ? 2 : isVerySmallScreen ? 3 : 4,
  },
  coinText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  sideMenuHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
  },
  sideMenuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexShrink: 0,
  },
  editButton: {
    padding: isTinyScreen ? 4 : isVerySmallScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 12 : isVerySmallScreen ? 14 : 16,
    width: isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32,
    height: isTinyScreen ? 24 : isVerySmallScreen ? 28 : 32,
    justifyContent: 'center',
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
  themeSection: {
    paddingHorizontal: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    paddingVertical: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    borderBottomWidth: 1,
  },
  themeSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabel: {
    fontSize: isTinyScreen ? 11 : isVerySmallScreen ? 13 : 15,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    height: isTinyScreen ? 32 : isVerySmallScreen ? 36 : 40,
    borderRadius: isTinyScreen ? 16 : isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTinyScreen ? 6 : isVerySmallScreen ? 8 : 10,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileEmail: {
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    borderBottomWidth: 1,
  },
  sideMenuText: {
    marginLeft: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    fontWeight: '500',
  },
  versionSection: {
    marginTop: 'auto',
    paddingTop: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 10 : isVerySmallScreen ? 12 : 16,
    paddingBottom: isTinyScreen ? 8 : isVerySmallScreen ? 10 : 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  appName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appVersion: {
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});