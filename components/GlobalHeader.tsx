import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, User } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface GlobalHeaderProps {
  title: string;
  showCoinDisplay?: boolean;
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

export default function GlobalHeader({ title, showCoinDisplay = true }: GlobalHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Animation values
  const coinBounce = useSharedValue(1);
  const slideX = useSharedValue(-screenWidth);
  const overlayOpacity = useSharedValue(0);

  const handleMenuPress = () => {
    setMenuVisible(true);
    slideX.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
    overlayOpacity.value = withTiming(0.5, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  };

  const handleCloseMenu = () => {
    slideX.value = withTiming(-screenWidth, {
      duration: 300,
      easing: Easing.in(Easing.quad),
    });
    overlayOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.quad),
    });
    setTimeout(() => setMenuVisible(false), 300);
  };

  const handleLogout = () => {
    handleCloseMenu();
    setTimeout(() => {
      signOut();
    }, 300);
  };

  const handleDeleteAccount = () => {
    handleCloseMenu();
    setTimeout(() => {
      router.push('/delete-account');
    }, 300);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'refer-friend',
      title: 'Refer a Friend',
      icon: <Share2 color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/refer-friend'), 300);
      },
    },
    {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      icon: <Shield color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/privacy-policy'), 300);
      },
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: <FileText color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/terms'), 300);
      },
    },
    {
      id: 'languages',
      title: 'Languages',
      icon: <Globe color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/languages'), 300);
      },
    },
    {
      id: 'configure-ads',
      title: 'Configure Ads',
      icon: <Settings color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/configure-ads'), 300);
      },
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      icon: <MessageCircle color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/contact-support'), 300);
      },
    },
    {
      id: 'logout',
      title: 'Log Out',
      icon: <LogOut color="#E74C3C" size={20} />,
      onPress: handleLogout,
      destructive: true,
    },
    {
      id: 'delete-account',
      title: 'Delete Account',
      icon: <Trash2 color="#E74C3C" size={20} />,
      onPress: handleDeleteAccount,
      destructive: true,
    },
  ];

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <>
      <LinearGradient colors={['#800080', '#9B59B6']} style={styles.header}>
        <View style={styles.headerContent}>
          {/* Left Section - Menu + Title */}
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.hamburgerIcon}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          
          {/* Right Section - Coin Display */}
          {showCoinDisplay && (
            <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinCount}>{profile?.coins?.toLocaleString() || '0'}</Text>
            </Animated.View>
          )}
        </View>
      </LinearGradient>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseMenu}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Animated.View style={[styles.modalOverlay, overlayAnimatedStyle]}>
          <Pressable style={styles.overlayPressable} onPress={handleCloseMenu} />
          <Animated.View style={[styles.slideMenu, slideAnimatedStyle]}>
            {/* User Profile Section */}
            <LinearGradient colors={['#800080', '#9B59B6']} style={styles.userSection}>
              <View style={styles.avatar}>
                <User color="white" size={isSmallScreen ? 24 : 28} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{profile?.username || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
              </View>
            </LinearGradient>
            
            {/* Menu Items */}
            <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.lastMenuItem,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>
                    {item.icon}
                  </View>
                  <Text style={[
                    styles.menuItemText,
                    item.destructive && styles.destructiveText
                  ]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinEmoji: {
    fontSize: isSmallScreen ? 16 : 18,
    marginRight: 4,
  },
  coinCount: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  overlayPressable: {
    flex: 1,
  },
  slideMenu: {
    width: isSmallScreen ? 280 : 320,
    height: '100%',
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '2px 0 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  avatar: {
    width: isSmallScreen ? 50 : 60,
    height: isSmallScreen ? 50 : 60,
    borderRadius: isSmallScreen ? 25 : 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: isSmallScreen ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuScrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: isSmallScreen ? 16 : 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: 16,
    width: 24,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  destructiveText: {
    color: '#E74C3C',
  },
});