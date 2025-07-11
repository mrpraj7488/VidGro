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

  const handleLogout = () => {
    handleCloseMenu();
    setTimeout(() => signOut(), 100);
  };

  const handleDeleteAccount = () => {
    handleCloseMenu();
    setTimeout(() => router.push('/delete-account'), 100);
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
              <View style={styles.headerSection}>
                <Text style={styles.headerText}>Menu</Text>
              </View>
              <View style={styles.userSection}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseMenu} activeOpacity={0.7}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.userContent}>
                  <View style={styles.avatar}>
                    <User color="white" size={isSmallScreen ? 24 : 28} />
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
    width: isSmallScreen ? 240 : 280,
    height: '100%',
    backgroundColor: '#F8F9FA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 12 },
      web: { boxShadow: '2px 0 12px rgba(0, 0, 0, 0.15)' },
    }),
  },
  menuContainer: {
    flex: 1,
  },
  headerSection: {
    padding: isSmallScreen ? 12 : 16,
    backgroundColor: '#800080',
  },
  headerText: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  userSection: {
    padding: isSmallScreen ? 12 : 16,
    backgroundColor: '#800080',
  },
  closeButton: {
    position: 'absolute',
    top: isSmallScreen ? 12 : 16,
    right: isSmallScreen ? 12 : 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 8 : 12,
  },
  avatar: {
    width: isSmallScreen ? 50 : 60,
    height: isSmallScreen ? 50 : 60,
    borderRadius: isSmallScreen ? 25 : 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 8 : 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: isSmallScreen ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuScrollView: {
    flex: 1,
  },
  menuItemsContainer: {
    backgroundColor: 'white',
    marginHorizontal: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 12 : 16,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 20,
    paddingVertical: isSmallScreen ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
    minHeight: isSmallScreen ? 48 : 56,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: isSmallScreen ? 8 : 16,
    width: 24,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  destructiveText: {
    color: '#E74C3C',
  },
});