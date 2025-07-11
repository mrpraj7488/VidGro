import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, User } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface GlobalHeaderProps {
  title: string;
  showCoinDisplay?: boolean;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

export default function GlobalHeader({ title, showCoinDisplay = true, menuVisible, setMenuVisible }: GlobalHeaderProps) {
  const { user, profile, signOut } = useAuth();

  const slideX = useSharedValue(-screenWidth);
  const overlayOpacity = useSharedValue(0);

  const handleMenuPress = () => {
    setMenuVisible(true);
    slideX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
  };

  const handleCloseMenu = () => {
    slideX.value = withTiming(-screenWidth, { duration: 300, easing: Easing.in(Easing.quad) });
    overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) });
    setTimeout(() => setMenuVisible(false), 300);
  };

  const handleReferFriend = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/refer-friend'), 100);
  };

  const handlePrivacyPolicy = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/privacy-policy'), 100);
  };

  const handleTerms = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/terms'), 100);
  };

  const handleLanguages = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/languages'), 100);
  };

  const handleConfigureAds = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/configure-ads'), 100);
  };

  const handleContactSupport = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/contact-support'), 100);
  };

  const handleLogout = () => {
    handleCloseMenu();
    setTimeout(() => signOut(), 100);
  };

  const handleDeleteAccount = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/delete-account'), 100);
  };

  const menuItems = [
    { id: 'refer-friend', title: 'Refer a Friend', icon: <Share2 color="#800080" size={20} />, onPress: handleReferFriend },
    { id: 'privacy-policy', title: 'Privacy Policy', icon: <Shield color="#800080" size={20} />, onPress: handlePrivacyPolicy },
    { id: 'terms', title: 'Terms of Service', icon: <FileText color="#800080" size={20} />, onPress: handleTerms },
    { id: 'languages', title: 'Languages', icon: <Globe color="#800080" size={20} />, onPress: handleLanguages },
    { id: 'configure-ads', title: 'Configure Ads', icon: <Settings color="#800080" size={20} />, onPress: handleConfigureAds },
    { id: 'contact-support', title: 'Contact Support', icon: <MessageCircle color="#800080" size={20} />, onPress: handleContactSupport },
    { id: 'logout', title: 'Log Out', icon: <LogOut color="#E74C3C" size={20} />, onPress: handleLogout, destructive: true },
    { id: 'delete-account', title: 'Delete Account', icon: <Trash2 color="#E74C3C" size={20} />, onPress: handleDeleteAccount, destructive: true },
  ];

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <>
      <LinearGradient colors={['#800080', '#9B59B6']} style={styles.header}>
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.leftSection}>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress} activeOpacity={0.7}>
              <View style={styles.hamburgerIcon}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          {showCoinDisplay && (
            <View style={styles.coinDisplay}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinCount}>{profile?.coins?.toLocaleString() || '0'}</Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {menuVisible && (
        <Animated.View style={[styles.modalOverlay, overlayAnimatedStyle]}>
          <Pressable style={styles.overlayPressable} onPress={handleCloseMenu} />
          <Animated.View style={[styles.slideMenu, slideAnimatedStyle]}>
            <SafeAreaView style={styles.menuContainer}>
              <View style={styles.userSection}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseMenu} activeOpacity={0.7}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.userContent}>
                  <View style={styles.avatar}>
                    <User color="#800080" size={isSmallScreen ? 20 : 24} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{profile?.username || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                  </View>
                </View>
              </View>
              <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.menuItemsContainer}>
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.menuItem, index === menuItems.length - 1 && styles.lastMenuItem]}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemIcon}>{item.icon}</View>
                      <Text style={[styles.menuItemText, item.destructive && styles.destructiveText]}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 16,
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
    padding: isSmallScreen ? 6 : 8,
    marginRight: isSmallScreen ? 8 : 12,
  },
  hamburgerIcon: {
    width: isSmallScreen ? 20 : 24,
    height: isSmallScreen ? 15 : 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: isSmallScreen ? 16 : 20,
    height: isSmallScreen ? 1.5 : 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 4 : 8,
    borderRadius: 16,
  },
  coinEmoji: {
    fontSize: isSmallScreen ? 14 : 18,
    marginRight: isSmallScreen ? 2 : 4,
  },
  coinCount: {
    color: 'white',
    fontSize: isSmallScreen ? 12 : 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 2000,
    elevation: 2000,
  },
  overlayPressable: {
    flex: 1,
  },
  slideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: isSmallScreen ? 200 : 280, // Narrower for small screens
    height: '100%',
    backgroundColor: 'white',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 12 },
      web: { boxShadow: '2px 0 12px rgba(0, 0, 0, 0.15)' },
    }),
  },
  menuContainer: {
    flex: 1,
  },
  userSection: {
    padding: isSmallScreen ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    position: 'absolute',
    top: isSmallScreen ? 8 : 16,
    right: isSmallScreen ? 8 : 16,
    width: isSmallScreen ? 32 : 40,
    height: isSmallScreen ? 32 : 40,
    borderRadius: 16,
    backgroundColor: '#800080',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 4 : 12,
  },
  avatar: {
    width: isSmallScreen ? 40 : 60,
    height: isSmallScreen ? 40 : 60,
    borderRadius: isSmallScreen ? 20 : 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 6 : 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 14 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: isSmallScreen ? 10 : 14,
    color: '#666',
  },
  menuScrollView: {
    flex: 1,
  },
  menuItemsContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 8 : 20,
    paddingVertical: isSmallScreen ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: isSmallScreen ? 6 : 16,
    width: 24,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: isSmallScreen ? 12 : 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  destructiveText: {
    color: '#E74C3C',
  },
});