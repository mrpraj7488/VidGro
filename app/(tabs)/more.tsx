import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { DollarSign, Crown, ShieldOff, Star, Share2, Shield, FileText, Globe, Settings, MessageCircle, LogOut, Trash2, User, X, ChartBar as BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function MoreTab() {
  const { user, profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const menuItems = [
    { icon: DollarSign, title: 'Buy Coins', subtitle: 'Unlock Rewards', route: '/buy-coins' },
    { icon: Crown, title: 'Become VIP', subtitle: 'Premium Access', route: '/become-vip' },
    { icon: ShieldOff, title: 'Stop Ads', subtitle: '5 Hours Ad-Free', route: '/configure-ads' },
    { icon: Star, title: 'Rate Us', subtitle: 'Get 100 Coins', route: '/rate-us' },
    { icon: BarChart3, title: 'System Monitor', subtitle: 'System Statistics', route: '/balance-monitor' },
  ];

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Always navigate to login after signOut attempt
    router.replace('/(auth)/login');
  };

  const handleItemPress = (item: any) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.route) {
      router.push(item.route);
    }
  };

  const renderSideMenu = () => (
    <View style={[styles.sideMenu, { left: menuVisible ? 0 : -300, backgroundColor: colors.surface }]}>
      <View style={[styles.sideMenuHeader, { backgroundColor: colors.primary }]}>
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
      
      <ScrollView style={[styles.sideMenuContent, { backgroundColor: colors.surface }]}>
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
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="More" 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      {renderSideMenu()}
      
      {menuVisible && (
        <TouchableOpacity 
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        />
      )}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { backgroundColor: colors.surface },
                item.action === 'tap' && styles.menuItemTap
              ]}
              onPress={() => handleItemPress(item)}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: colors.primary + '20' }]}>
                <item.icon size={24} color={colors.accent} />
              </View>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuGrid: {
    gap: 16,
  },
  menuItem: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flex: 1,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 300,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sideMenuHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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