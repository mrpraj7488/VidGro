import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Menu, X, User, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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
    { icon: Settings, title: 'Configure Ads', route: '/configure-ads' },
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
      <LinearGradient
        colors={isDark ? ['#9D4EDD', '#FF6B7A'] : ['#800080', '#FF4757']}
        style={styles.sideMenuHeader}
      >
        <View style={styles.sideMenuHeaderContent}>
          <View style={styles.profileSection}>
            <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <User size={32} color="white" />
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
        <View style={styles.themeToggleRow}>
          <Text style={styles.themeLabel}>Theme</Text>
          <ThemeToggle />
        </View>
      </LinearGradient>
      
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
      </View>
    </View>
  );

  return (
    <>
      <LinearGradient
        colors={isDark ? ['#9D4EDD', '#FF6B7A'] : ['#800080', '#FF4757']}
        style={styles.header}
      >
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
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && profile && (
              <View style={styles.coinDisplay}>
                <View style={[styles.coinBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <Text style={styles.coinIcon}>🪙</Text>
                  <Text style={styles.coinText}>{profile.coins.toLocaleString()}</Text>
                </View>
              </View>
            )}
            <View style={styles.themeToggleContainer}>
              <ThemeToggle />
            </View>
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    minHeight: 90, // Fixed minimum height
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44, // Fixed height for content
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow shrinking
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Reduced gap for smaller screens
    flexShrink: 0, // Prevent shrinking
  },
  menuButton: {
    marginRight: 12, // Reduced margin
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(20, screenWidth * 0.05), // Responsive font size
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginRight: 8, // Add margin to prevent overlap
  },
  coinDisplay: {
    flexShrink: 0,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth < 380 ? 8 : 12, // Responsive padding
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: screenWidth < 380 ? 50 : 60, // Responsive min width
  },
  coinIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  coinText: {
    color: 'white',
    fontSize: screenWidth < 380 ? 12 : 14, // Responsive font size
    fontWeight: '600',
  },
  themeToggleContainer: {
    flexShrink: 0,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: Math.min(300, screenWidth * 0.8), // Responsive width
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sideMenuHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  sideMenuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  profileEmail: {
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
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