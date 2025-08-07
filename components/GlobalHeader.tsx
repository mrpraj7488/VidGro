import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Menu, X, User, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

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
    <View style={[styles.sideMenu, { left: menuVisible ? 0 : -300, backgroundColor: colors.surface }]}>
      <View style={[styles.sideMenuHeader, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.sideMenuHeaderContent}>
          <View style={styles.profileSection}>
            <View style={[styles.profileAvatar, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.2)' }]}>
              <User size={28} color="white" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: 'white' }]}>{profile?.username || 'User'}</Text>
              <Text style={[styles.profileEmail, { color: 'rgba(255, 255, 255, 0.8)' }]}>{profile?.email || 'user@example.com'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setMenuVisible(false)}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={[styles.themeToggleRow, { backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(255, 255, 255, 0.1)' }]}>
          <Text style={styles.themeLabel}>Dark Mode</Text>
          <ThemeToggle />
        </View>
      </View>
      
      <View style={[styles.sideMenuContent, { backgroundColor: colors.surface }]}>
        {sideMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.sideMenuItem, { borderBottomColor: colors.border }]}
            onPress={() => handleItemPress(item)}
          >
            <item.icon size={20} color={item.color || colors.primary} />
            <Text style={[styles.sideMenuText, { color: item.color || colors.text }]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* App Version at the bottom */}
        <View style={[styles.versionSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.text }]}>VidGro</Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            Watch videos, earn coins, promote content
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
              {menuVisible ? (
                <X size={24} color="white" />
              ) : (
                <Menu size={24} color="white" />
              )}
            </TouchableOpacity>
            <Text style={styles.brandTitle}>VidGro</Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && profile && (
              <View style={styles.coinDisplay}>
                <View style={[styles.coinBadge, { 
                  backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: isDark ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.2)'
                }]}>
                  <Text style={styles.coinIcon}>🪙</Text>
                  <Text style={styles.coinText}>{profile.coins.toLocaleString()}</Text>
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
    paddingHorizontal: 20,
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
    height: 40,
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
    marginRight: 16,
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 24,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: 'center',
  },
  coinIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  coinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: Math.min(300, screenWidth * 0.8),
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  sideMenuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 12,
  },
  themeLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  sideMenuText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  versionSection: {
    marginTop: 'auto',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  appVersion: {
    fontSize: 12,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
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