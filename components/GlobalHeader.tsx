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
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { MoveVertical as MoreVertical, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, User, Coins } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
  const menuScale = useSharedValue(0);

  const handleMenuPress = () => {
    setMenuVisible(true);
    menuScale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const handleCloseMenu = () => {
    menuScale.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
    setTimeout(() => setMenuVisible(false), 200);
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

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuScale.value,
  }));

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          
          <View style={styles.rightSection}>
            {showCoinDisplay && (
              <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
                <Coins color="#FFD700" size={isSmallScreen ? 16 : 18} />
                <Text style={styles.coinCount}>{profile?.coins?.toLocaleString() || '0'}</Text>
              </Animated.View>
            )}
            
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <MoreVertical color="white" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseMenu}>
          <Animated.View style={[styles.menuContainer, menuAnimatedStyle]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* User Profile Section */}
              <View style={styles.userSection}>
                <View style={styles.avatar}>
                  <User color="#800080" size={isSmallScreen ? 24 : 28} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{profile?.username || 'User'}</Text>
                  <Text style={styles.userEmail}>{user?.email || ''}</Text>
                </View>
              </View>

              <View style={styles.divider} />

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
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#800080',
    height: 60,
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    minHeight: Platform.OS === 'ios' ? 100 : 90,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  leftSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 16,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 90,
    paddingRight: 10,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: isSmallScreen ? 250 : 280,
    maxWidth: screenWidth - 40,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  avatar: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: '#E8E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  menuScrollView: {
    maxHeight: 400,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: isSmallScreen ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  destructiveText: {
    color: '#E74C3C',
  },
});