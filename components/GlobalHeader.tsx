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
  withSpring,
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
  
  // Animation values
  const coinBounce = useSharedValue(1);

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
  };

  const handleLogout = () => {
    handleCloseMenu();
    setTimeout(() => {
      signOut();
    }, 100);
  };

  const handleDeleteAccount = () => {
    handleCloseMenu();
    setTimeout(() => {
      router.push('/delete-account');
    }, 100);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'refer-friend',
      title: 'Refer a Friend',
      icon: <Share2 color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/refer-friend'), 100);
      },
    },
    {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      icon: <Shield color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/privacy-policy'), 100);
      },
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: <FileText color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/terms'), 100);
      },
    },
    {
      id: 'languages',
      title: 'Languages',
      icon: <Globe color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/languages'), 100);
      },
    },
    {
      id: 'configure-ads',
      title: 'Configure Ads',
      icon: <Settings color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/configure-ads'), 100);
      },
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      icon: <MessageCircle color="#800080" size={20} />,
      onPress: () => {
        handleCloseMenu();
        setTimeout(() => router.push('/contact-support'), 100);
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
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseMenu}
        statusBarTranslucent={true}
        presentationStyle={Platform.OS === 'android' ? 'overFullScreen' : 'fullScreen'}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={Platform.OS === 'android' ? 'rgba(128, 0, 128, 0.9)' : '#800080'} 
            translucent={Platform.OS === 'android'}
          />
          
          {/* User Profile Section */}
          <LinearGradient colors={['#800080', '#9B59B6']} style={styles.userSection}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseMenu}
              activeOpacity={0.7}
            >
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
          </LinearGradient>
          
          {/* Menu Items */}
          <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.menuItemsContainer}>
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
                    item.destructive && styles.destructiveText,
                  ]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? 'rgba(248, 249, 250, 0.95)' : '#F8F9FA',
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 0,
    }),
  },
  userSection: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    ...(Platform.OS === 'android' && {
      marginTop: -1, // Prevent gap on Android
    }),
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    ...(Platform.OS === 'android' && {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    }),
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: isSmallScreen ? 60 : 70,
    height: isSmallScreen ? 60 : 70,
    borderRadius: isSmallScreen ? 30 : 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...(Platform.OS === 'android' && {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    }),
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    ...(Platform.OS === 'android' && {
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    }),
  },
  userEmail: {
    fontSize: isSmallScreen ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'android' && {
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    }),
  },
  menuScrollView: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? 'transparent' : '#F8F9FA',
  },
  menuItemsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: isSmallScreen ? 16 : 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
    ...(Platform.OS === 'android' && {
      minHeight: 56, // Ensure consistent touch target size on Android
    }),
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