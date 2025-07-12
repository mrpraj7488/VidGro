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
      <View style={styles.header}>
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
      </View>

      {menuVisible && (
        <Animated.View style={[styles.modalOverlay, overlayAnimatedStyle]}>
          <Pressable style={styles.overlayPressable} onPress={handleCloseMenu} />
          <Animated.View style={[styles.slideMenu, slideAnimatedStyle]}>
            <SafeAreaView style={styles.menuContainer}>
              {/* Purple Header Section with User Info */}
              <View style={styles.menuHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseMenu} activeOpacity={0.7}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.userSection}>
                  <View style={styles.avatar}>
                    <User color="white" size={isSmallScreen ? 24 : 28} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{profile?.username || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                  </View>
                </View>
              </View>

              {/* White Menu Section */}
              <View style={styles.menuContent}>
                <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuItemsContainer}>
                    {menuItems.map((item, index) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.menuItem,
                          index === menuItems.length - 1 && styles.lastMenuItem
                        ]}
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
              </View>
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
    backgroundColor: '#800080', // Bold purple color
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    width: isSmallScreen ? 280 : 320,
    height: '100%',
    backgroundColor: 'white',
    ...Platform.select({
      ios: { 
        shadowColor: '#000', 
        shadowOffset: { width: 2, height: 0 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 12 
      },
      android: { 
        elevation: 16 
      },
      web: { 
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.25)' 
      },
    }),
  },
  menuContainer: {
    flex: 1,
  },
  menuHeader: {
    backgroundColor: '#800080', // Bold purple header
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 26,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingRight: 50, // Space for close button
  },
  avatar: {
    width: isSmallScreen ? 60 : 70,
    height: isSmallScreen ? 60 : 70,
    borderRadius: isSmallScreen ? 30 : 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: isSmallScreen ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuContent: {
    flex: 1,
    backgroundColor: 'white',
  },
  menuScrollView: {
    flex: 1,
  },
  menuItemsContainer: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    minHeight: 56,
  },
  lastMenuItem: {
    // No special styling needed
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