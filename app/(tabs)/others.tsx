import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { 
  DollarSign, 
  Crown, 
  Gift, 
  CircleStop as StopCircle, 
  Star, 
  User, 
  Share2, 
  FileText, 
  Shield, 
  Globe, 
  Settings, 
  MessageCircle, 
  LogOut, 
  Trash2, 
  RefreshCw,
  ChevronRight,
  Coins,
  Menu
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
  featured?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

export default function OthersTab() {
  const { user, profile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleBuyCoins = () => {
    router.push('/buy-coins');
  };

  const handleBecomeVIP = () => {
    Alert.alert('Become VIP', 'VIP subscription coming soon!');
  };

  const handleFreeCoins = () => {
    Alert.alert('Free Coins', 'Watch a 30-45 second ad to earn 150-400 coins');
  };

  const handleStopAds = () => {
    Alert.alert('Stop Ads', 'Spend coins to stop ads for 6 hours');
  };

  const handleRateUs = () => {
    Alert.alert('Rate Us', 'Thank you for using VidGro!');
  };

  const handleReferFriend = () => {
    if (profile?.referral_code) {
      Alert.alert(
        'Refer a Friend',
        `Share your referral code: ${profile.referral_code}`
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => signOut()
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => Alert.alert('Account Deletion', 'Account deletion feature coming soon')
        },
      ]
    );
  };

  const handleCleanup = () => {
    Alert.alert('App Cleanup', 'App cleanup feature coming soon!');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'buy-coins',
      title: 'Buy Coins',
      subtitle: 'Get more coins instantly',
      icon: <DollarSign color="white" size={24} />,
      color: '#FF4757',
      onPress: handleBuyCoins,
      featured: true,
    },
    {
      id: 'become-vip',
      title: 'Become VIP',
      subtitle: 'Go Ad-Free & get discounts',
      icon: <Crown color="white" size={24} />,
      color: '#FFA726',
      onPress: handleBecomeVIP,
      featured: true,
    },
    {
      id: 'free-coins',
      title: 'Free Coins',
      subtitle: 'Watch ads to earn coins',
      icon: <Gift color="white" size={24} />,
      color: '#4ECDC4',
      onPress: handleFreeCoins,
    },
    {
      id: 'stop-ads',
      title: 'Stop Ads',
      subtitle: 'Ad-free for 6 hours',
      icon: <StopCircle color="white" size={24} />,
      color: '#9B59B6',
      onPress: handleStopAds,
    },
  ];

  const menuSections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'refer-friend',
          title: 'Refer a Friend',
          subtitle: 'Share and earn rewards',
          icon: <Share2 color="#FF4757" size={20} />,
          onPress: handleReferFriend,
        },
        {
          id: 'rate-us',
          title: 'Rate Us',
          subtitle: 'Help us improve',
          icon: <Star color="#FFA726" size={20} />,
          onPress: handleRateUs,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'languages',
          title: 'Languages',
          subtitle: 'Change app language',
          icon: <Globe color="#4ECDC4" size={20} />,
          onPress: () => Alert.alert('Languages', 'Language selection coming soon'),
        },
        {
          id: 'configure-ads',
          title: 'Configure Ads',
          subtitle: 'Manage ad preferences',
          icon: <Settings color="#9B59B6" size={20} />,
          onPress: () => Alert.alert('Configure Ads', 'Ad configuration options'),
        },
        {
          id: 'app-cleanup',
          title: 'App Cleanup',
          subtitle: 'Clear cache & optimize',
          icon: <RefreshCw color="#2ECC71" size={20} />,
          onPress: handleCleanup,
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          id: 'consent',
          title: 'Consent',
          subtitle: 'User consent information',
          icon: <FileText color="#6C7B7F" size={20} />,
          onPress: () => Alert.alert('Consent', 'User consent information'),
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          subtitle: 'How we protect your data',
          icon: <Shield color="#6C7B7F" size={20} />,
          onPress: () => Alert.alert('Privacy Policy', 'Privacy policy information'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'contact-us',
          title: 'Contact Us',
          subtitle: 'Get help and support',
          icon: <MessageCircle color="#3498DB" size={20} />,
          onPress: () => Alert.alert('Contact Us', 'support@vidgro.com'),
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Log Out',
          subtitle: 'Sign out of your account',
          icon: <LogOut color="#E74C3C" size={20} />,
          onPress: handleLogout,
          destructive: true,
        },
        {
          id: 'delete-account',
          title: 'Delete Account',
          subtitle: 'Permanently delete account',
          icon: <Trash2 color="#E74C3C" size={20} />,
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Menu color="white" size={24} />
          <Text style={styles.headerTitle}>More</Text>
          <View style={styles.coinDisplay}>
            <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
            <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <User color="#FF4757" size={isSmallScreen ? 28 : 32} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{profile?.username || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
              {profile?.is_vip && (
                <View style={styles.vipBadge}>
                  <Crown color="#FFA726" size={14} />
                  <Text style={styles.vipText}>VIP Member</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.coins || 0}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.referral_code || 'N/A'}</Text>
              <Text style={styles.statLabel}>Referral Code</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  action.featured && styles.featuredAction,
                  { backgroundColor: action.color }
                ]}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIcon}>
                  {action.icon}
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === section.items.length - 1 && styles.menuItemLast
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[
                      styles.menuItemIcon,
                      item.destructive && styles.destructiveIcon
                    ]}>
                      {item.icon}
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={[
                        styles.menuItemTitle,
                        item.destructive && styles.destructiveText
                      ]}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight 
                    color={item.destructive ? "#E74C3C" : "#C7C7CC"} 
                    size={16} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>VidGro - Watch & Earn</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: isSmallScreen ? 60 : 70,
    height: isSmallScreen ? 60 : 70,
    borderRadius: isSmallScreen ? 30 : 35,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    marginBottom: 8,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  vipText: {
    fontSize: 12,
    color: '#FFA726',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 8 : 12,
  },
  quickActionCard: {
    width: (screenWidth - 48) / 2,
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    alignItems: 'center',
    minHeight: isSmallScreen ? 120 : 140,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  featuredAction: {
    transform: [{ scale: 1.02 }],
  },
  quickActionIcon: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 16,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: '#FFE5E5',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#E74C3C',
  },
  menuItemSubtitle: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  appInfoText: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
  },
});