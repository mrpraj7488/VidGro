import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { 
  DollarSign, 
  Crown, 
  Gift, 
  Star, 
  User, 
  Coins,
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';

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


export default function OthersTab() {
  const { user, profile, signOut } = useAuth();
  
  // Menu state for GlobalHeader - use ref to prevent unwanted state changes
  const [menuVisible, setMenuVisible] = useState(false);
  const menuStateRef = useRef(false);
  
  // Prevent menu state changes during operations
  const handleSetMenuVisible = useCallback((visible: boolean) => {
    if (menuStateRef.current !== visible) {
      menuStateRef.current = visible;
      setMenuVisible(visible);
    }
  }, []);

  const handleBuyCoins = () => {
    router.push('/buy-coins');
  };

  const handleBecomeVIP = () => {
    Alert.alert('Become VIP', 'VIP subscription coming soon!');
  };

  const handleFreeCoins = () => {
    Alert.alert('Free Coins', 'Watch a 30-45 second ad to earn 150-400 coins');
  };


  const quickActions: QuickAction[] = [
    {
      id: 'buy-coins',
      title: 'Buy Coins',
      subtitle: 'Get more coins instantly',
      icon: <DollarSign color="white" size={24} />,
      color: '#800080',
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
  ];

  return (
    <View style={styles.container}>
      <GlobalHeader title="More" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={setMenuVisible} />
      <GlobalHeader title="More" showCoinDisplay={true} menuVisible={menuVisible} setMenuVisible={handleSetMenuVisible} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
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
              <Text style={styles.statValue}>🪙{profile?.coins || 0}</Text>
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

        {/* Note about menu functions */}
        <View style={styles.menuNote}>
          <Text style={styles.menuNoteTitle}>Menu Functions</Text>
          <Text style={styles.menuNoteText}>
            All menu functions (Refer Friend, Privacy Policy, Settings, etc.) are now available 
            in the 3-dot menu at the top right of every screen.
          </Text>
        </View>

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
  menuNote: {
    backgroundColor: 'white',
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#800080',
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
  menuNoteTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#800080',
    marginBottom: 8,
  },
  menuNoteText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    lineHeight: 20,
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