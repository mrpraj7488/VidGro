import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Menu, X, User, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;

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

  const renderSideMenu = () => (
    <View style={[
      styles.sideMenu, 
      { 
        left: menuVisible ? 0 : -Math.min(300, screenWidth * 0.8), 
        backgroundColor: colors.surface,
        width: Math.min(300, screenWidth * 0.8)
      }
    ]}>
      <View style={[styles.sideMenuHeader, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.sideMenuHeaderContent}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={[styles.profileAvatar, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.2)' }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <User size={isVerySmallScreen ? 24 : 28} color="white" />
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
                <Text style={[
                  styles.profileName, 
                  { 
                    color: 'white',
                    fontSize: isVerySmallScreen ? 14 : 16
                  }
                ]} numberOfLines={1}>
                  {profile?.username || 'User'}
                </Text>
                <Text style={[
                  styles.profileEmail, 
                  { 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: isVerySmallScreen ? 11 : 13
                  }
                ]} numberOfLines={1}>
                  {profile?.email || 'user@example.com'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
              onPress={handleEditProfile}
            >
              <Edit3 size={isVerySmallScreen ? 14 : 16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={[styles.sideMenuContent, { backgroundColor: colors.surface }]}>
        {/* Dark Mode Toggle Section - Moved above Refer a Friend */}
        <View style={[styles.themeSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.themeSectionContent}>
            <Text style={[styles.themeLabel, { color: colors.text }]}>Dark Mode</Text>
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
                paddingVertical: isVerySmallScreen ? 12 : 14
              }
            ]}
            onPress={() => handleItemPress(item)}
          >
            <item.icon size={isVerySmallScreen ? 16 : 18} color={item.color || colors.primary} />
            <Text style={[
              styles.sideMenuText, 
              { 
                color: item.color || colors.text,
                fontSize: isVerySmallScreen ? 13 : 15
              }
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Simplified App Version at the bottom - Responsive */}
        <View style={[styles.versionSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[
            styles.appName, 
            { 
              color: colors.text,
              fontSize: isVerySmallScreen ? 16 : 18
            }
          ]}>
            VidGro
          </Text>
          <Text style={[
            styles.appVersion, 
            { 
              color: colors.textSecondary,
              fontSize: isVerySmallScreen ? 11 : 12
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
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Menu size={isVerySmallScreen ? 20 : 24} color="white" />
            </TouchableOpacity>
            <Text style={[
              styles.brandTitle,
              { fontSize: isVerySmallScreen ? 18 : 22 }
            ]}>
              VidGro
            </Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && profile && (
              <View style={styles.coinDisplay}>
                <View style={[styles.coinBadge, { 
                  backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: isDark ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  paddingHorizontal: isVerySmallScreen ? 6 : 10,
                  paddingVertical: isVerySmallScreen ? 4 : 6
                }]}>
                  <Text style={[styles.coinIcon, { fontSize: isVerySmallScreen ? 10 : 12 }]}>🪙</Text>
                  <Text style={[
                    styles.coinText,
                    { fontSize: isVerySmallScreen ? 12 : 14 }
                  ]}>
                    {profile.coins.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
      
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
    justifyContent: 'space-between',
    alignItems: 'center',
    height: isVerySmallScreen ? 32 : 36,
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
    marginRight: isVerySmallScreen ? 8 : 12,
    padding: 4,
    width: isVerySmallScreen ? 28 : 32,
    height: isVerySmallScreen ? 28 : 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
    flex: 1,
  },
  coinDisplay: {
    flexShrink: 0,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isVerySmallScreen ? 14 : 16,
    borderWidth: 1,
    minWidth: isVerySmallScreen ? 50 : 60,
    justifyContent: 'center',
  },
  coinIcon: {
    marginRight: isVerySmallScreen ? 3 : 4,
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
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  sideMenuHeader: {
    paddingTop: 50,
    paddingBottom: isVerySmallScreen ? 12 : 16,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
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
    padding: isVerySmallScreen ? 6 : 8,
    borderRadius: isVerySmallScreen ? 14 : 16,
    width: isVerySmallScreen ? 28 : 32,
    height: isVerySmallScreen ? 28 : 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeSection: {
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingVertical: isVerySmallScreen ? 10 : 12,
    borderBottomWidth: 1,
  },
  themeSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabel: {
    fontSize: isVerySmallScreen ? 13 : 15,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: isVerySmallScreen ? 36 : 40,
    height: isVerySmallScreen ? 36 : 40,
    borderRadius: isVerySmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isVerySmallScreen ? 8 : 10,
    flexShrink: 0,
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
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    borderBottomWidth: 1,
  },
  sideMenuText: {
    marginLeft: isVerySmallScreen ? 10 : 12,
    fontWeight: '500',
  },
  versionSection: {
    marginTop: 'auto',
    paddingTop: isVerySmallScreen ? 10 : 12,
    paddingHorizontal: isVerySmallScreen ? 12 : 16,
    paddingBottom: isVerySmallScreen ? 10 : 12,
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