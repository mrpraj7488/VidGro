import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { DollarSign, Crown, Gift, CircleStop as StopCircle, Star, Menu, User, Share2, FileText, Shield, Globe, Settings, MessageCircle, LogOut, Trash2 } from 'lucide-react-native';

interface MenuOption {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  color?: string;
}

export default function OthersTab() {
  const { user, profile, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleBuyCoins = () => {
    Alert.alert('Buy Coins', 'This would open the coin purchase screen');
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

  const menuOptions: MenuOption[] = [
    {
      icon: <Share2 color="#FF4757" size={20} />,
      title: 'Refer a Friend',
      onPress: handleReferFriend,
    },
    {
      icon: <FileText color="#FF4757" size={20} />,
      title: 'Consent',
      onPress: () => Alert.alert('Consent', 'User consent information'),
    },
    {
      icon: <Shield color="#FF4757" size={20} />,
      title: 'Privacy policy',
      onPress: () => Alert.alert('Privacy Policy', 'Privacy policy information'),
    },
    {
      icon: <Globe color="#FF4757" size={20} />,
      title: 'Languages',
      onPress: () => Alert.alert('Languages', 'Language selection coming soon'),
    },
    {
      icon: <Settings color="#FF4757" size={20} />,
      title: 'Configure Ads',
      onPress: () => Alert.alert('Configure Ads', 'Ad configuration options'),
    },
    {
      icon: <MessageCircle color="#FF4757" size={20} />,
      title: 'Contact us',
      onPress: () => Alert.alert('Contact Us', 'support@vidgro.com'),
    },
    {
      icon: <LogOut color="#FF4757" size={20} />,
      title: 'Log out',
      onPress: handleLogout,
    },
    {
      icon: <Trash2 color="#FF4757" size={20} />,
      title: 'Delete Account',
      onPress: handleDeleteAccount,
      color: '#FF4757',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => setShowMenu(true)}
          style={styles.menuButton}
        >
          <Menu color="white" size={24} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Video Promoter</Text>
        
        <View style={styles.coinDisplay}>
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
          <DollarSign color="white" size={20} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Buy Coins */}
          <TouchableOpacity 
            style={[styles.card, styles.buyCoinsCard]}
            onPress={handleBuyCoins}
          >
            <View style={styles.cardIcon}>
              <DollarSign color="white" size={32} />
            </View>
            <Text style={styles.cardTitle}>Buy Coins</Text>
            <View style={styles.cardIconRight}>
              <DollarSign color="#FF4757" size={24} />
            </View>
          </TouchableOpacity>

          {/* Become VIP */}
          <TouchableOpacity 
            style={[styles.card, styles.vipCard]}
            onPress={handleBecomeVIP}
          >
            <View style={styles.cardIcon}>
              <Crown color="#FFA726" size={32} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Become VIP</Text>
              <Text style={styles.cardSubtitle}>Go Ad-Free and get off on all promotions</Text>
            </View>
            <View style={styles.cardIconRight}>
              <Crown color="#FFA726" size={24} />
            </View>
          </TouchableOpacity>

          {/* Free Coins */}
          <TouchableOpacity 
            style={[styles.card, styles.freeCoinsCard]}
            onPress={handleFreeCoins}
          >
            <View style={styles.cardIcon}>
              <Gift color="white" size={32} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Free Coins</Text>
              <Text style={styles.cardSubtitle}>Watch 30-45 seconds of ads to earn 150-400 coins</Text>
            </View>
            <View style={styles.cardIconRight}>
              <DollarSign color="#4ECDC4" size={24} />
            </View>
          </TouchableOpacity>

          {/* Stop Ads */}
          <TouchableOpacity 
            style={[styles.card, styles.stopAdsCard]}
            onPress={handleStopAds}
          >
            <View style={styles.cardIcon}>
              <StopCircle color="white" size={32} />
            </View>
            <Text style={styles.cardTitle}>Stop ads for as long as 6 hours</Text>
            <View style={styles.cardIconRight}>
              <StopCircle color="#FF4757" size={24} />
            </View>
          </TouchableOpacity>

          {/* Rate Us */}
          <TouchableOpacity 
            style={[styles.card, styles.rateCard]}
            onPress={handleRateUs}
          >
            <View style={styles.cardIcon}>
              <Star color="#FFA726" size={32} />
            </View>
            <Text style={styles.cardTitle}>Rate Us</Text>
            <View style={styles.cardIconRight}>
              <Star color="#FFA726" size={24} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Side Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.sideMenu}>
            {/* User Profile */}
            <View style={styles.userProfile}>
              <View style={styles.avatar}>
                <User color="#FF4757" size={32} />
              </View>
              <Text style={styles.userName}>{profile?.username || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>

            {/* Menu Options */}
            <ScrollView style={styles.menuOptions}>
              {menuOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuOption}
                  onPress={() => {
                    setShowMenu(false);
                    option.onPress();
                  }}
                >
                  {option.icon}
                  <Text style={[
                    styles.menuOptionText,
                    option.color && { color: option.color }
                  ]}>
                    {option.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinCount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  buyCoinsCard: {
    backgroundColor: '#FFE5E7',
  },
  vipCard: {
    backgroundColor: '#FFF4E6',
  },
  freeCoinsCard: {
    backgroundColor: '#E6FFF9',
  },
  stopAdsCard: {
    backgroundColor: '#FFE5E7',
  },
  rateCard: {
    backgroundColor: '#FFF4E6',
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  cardIconRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    width: '80%',
    backgroundColor: 'white',
    paddingTop: 50,
  },
  userProfile: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuOptions: {
    flex: 1,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
});