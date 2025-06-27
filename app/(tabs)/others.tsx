import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, DollarSign, Crown, Gift, Settings, Star, X, CreditCard, Play, CircleStop as StopCircle, Share, UserPlus, Globe, Shield, FileText, MessageCircle, LogOut, Trash2, User } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';

export default function OthersScreen() {
  const { coins, isVip, addCoins } = useUserStore();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCoinPurchase, setShowCoinPurchase] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  const coinPackages = [
    { coins: 100, price: '$0.99', popular: false },
    { coins: 500, price: '$3.99', popular: true },
    { coins: 1000, price: '$6.99', popular: false },
    { coins: 2500, price: '$14.99', popular: false },
  ];

  const handleBuyCoins = (coins: number, price: string) => {
    Alert.alert(
      'Purchase Coins',
      `Buy ${coins} coins for ${price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Buy', 
          onPress: () => {
            // In real app, this would process payment
            addCoins(coins);
            setShowCoinPurchase(false);
            Alert.alert('Success!', `${coins} coins have been added to your account! 🎉`);
          }
        }
      ]
    );
  };

  const handleFreeCoins = () => {
    Alert.alert(
      'Watch Ad for Free Coins',
      'Watch a 30-45 second ad to earn 150-400 coins?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Watch Ad', 
          onPress: () => {
            // Simulate ad watching
            const earnedCoins = Math.floor(Math.random() * 251) + 150; // 150-400 coins
            addCoins(earnedCoins);
            Alert.alert('Congratulations!', `You earned ${earnedCoins} coins! 🎉`);
          }
        }
      ]
    );
  };

  const handleVipPurchase = (type: 'monthly' | 'lifetime') => {
    const price = type === 'monthly' ? '$4.99/month' : '$19.99 lifetime';
    Alert.alert(
      'VIP Subscription',
      `Purchase VIP membership for ${price}?\n\n✅ Ad-free experience\n✅ Promotional discounts\n✅ Priority support`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: () => {
            // In real app, this would process payment
            setShowVipModal(false);
            Alert.alert('Welcome to VIP!', 'Your VIP membership is now active! 👑');
          }
        }
      ]
    );
  };

  const handleStopAds = () => {
    Alert.alert(
      'Stop Ads',
      'Stop ads for 6 hours by spending 50 coins?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            if (coins >= 50) {
              // spendCoins(50) - would implement this
              Alert.alert('Success!', 'Ads stopped for 6 hours! 🎉');
            } else {
              Alert.alert('Insufficient Coins', 'You need 50 coins to stop ads.');
            }
          }
        }
      ]
    );
  };

  const handleReferFriend = () => {
    router.push('/referral');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const renderDrawer = () => (
    <Modal
      visible={showDrawer}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDrawer(false)}
    >
      <View style={styles.drawerOverlay}>
        <TouchableOpacity 
          style={styles.drawerBackdrop} 
          onPress={() => setShowDrawer(false)}
        />
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <User size={32} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>VidGro User</Text>
                <Text style={styles.profileEmail}>user@vidgro.com</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowDrawer(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerContent}>
            <TouchableOpacity style={styles.drawerItem} onPress={handleReferFriend}>
              <Share size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Refer a Friend</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={handleSettings}>
              <Settings size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <FileText size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Consent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <Shield size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <Globe size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Languages</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <Settings size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Configure Ads</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <MessageCircle size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Contact Us</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem}>
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.drawerItemText}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.drawerItem, styles.deleteItem]}>
              <Trash2 size={20} color="#DC2626" />
              <Text style={[styles.drawerItemText, styles.deleteText]}>Delete Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCoinPurchaseModal = () => (
    <Modal
      visible={showCoinPurchase}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCoinPurchase(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Buy Coins</Text>
            <TouchableOpacity onPress={() => setShowCoinPurchase(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {coinPackages.map((pack, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.coinPackage, pack.popular && styles.popularPackage]}
                onPress={() => handleBuyCoins(pack.coins, pack.price)}
              >
                {pack.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                <View style={styles.packageContent}>
                  <View style={styles.coinIcon}>
                    <DollarSign size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.coinAmount}>{pack.coins} Coins</Text>
                    <Text style={styles.coinPrice}>{pack.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderVipModal = () => (
    <Modal
      visible={showVipModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowVipModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>VIP Membership</Text>
            <TouchableOpacity onPress={() => setShowVipModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.vipBenefits}>
              <Text style={styles.benefitsTitle}>VIP Benefits:</Text>
              <Text style={styles.benefit}>✅ Ad-free experience</Text>
              <Text style={styles.benefit}>✅ 20% discount on promotions</Text>
              <Text style={styles.benefit}>✅ Priority customer support</Text>
              <Text style={styles.benefit}>✅ Exclusive VIP badge</Text>
            </View>

            <TouchableOpacity 
              style={styles.vipOption}
              onPress={() => handleVipPurchase('monthly')}
            >
              <Text style={styles.vipOptionTitle}>Monthly Subscription</Text>
              <Text style={styles.vipOptionPrice}>$4.99/month</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.vipOption, styles.lifetimeOption]}
              onPress={() => handleVipPurchase('lifetime')}
            >
              <Text style={styles.vipOptionTitle}>Lifetime Access</Text>
              <Text style={styles.vipOptionPrice}>$19.99 once</Text>
              <Text style={styles.saveText}>Save 75%!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowDrawer(true)}>
            <Menu size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>VidGro</Text>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>{coins}</Text>
            <View style={styles.coinIcon}>
              <DollarSign size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => setShowCoinPurchase(true)}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <DollarSign size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Buy Coins</Text>
              </View>
              <View style={styles.cardArrow}>
                <DollarSign size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => setShowVipModal(true)}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <Crown size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Become VIP</Text>
                <Text style={styles.cardSubtitle}>Go Ad-Free and get off on all promotions</Text>
              </View>
              <View style={styles.cardArrow}>
                <Crown size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={handleFreeCoins}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <Gift size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Free Coins</Text>
                <Text style={styles.cardSubtitle}>Watch 30-45 seconds of ads to earn 150-400 coins</Text>
              </View>
              <View style={styles.cardArrow}>
                <Play size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={handleStopAds}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <StopCircle size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Stop ads for as long as 6 hours</Text>
              </View>
              <View style={styles.cardArrow}>
                <StopCircle size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => Alert.alert('Rate Us', 'Thank you for using VidGro! Please rate us on the app store.')}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <Star size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Rate Us</Text>
              </View>
              <View style={styles.cardArrow}>
                <Star size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {renderDrawer()}
        {renderCoinPurchaseModal()}
        {renderVipModal()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  featureCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardIcon: {
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cardArrow: {
    marginLeft: 12,
  },
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  drawerContent: {
    flex: 1,
    padding: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  deleteItem: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#DC2626',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  modalContent: {
    padding: 20,
  },
  // Coin Purchase Styles
  coinPackage: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  popularPackage: {
    borderColor: '#EF4444',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  popularText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  packageInfo: {
    flex: 1,
    marginLeft: 16,
  },
  coinAmount: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  coinPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  // VIP Modal Styles
  vipBenefits: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  benefit: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginBottom: 4,
  },
  vipOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  lifetimeOption: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  vipOptionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  vipOptionPrice: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  saveText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    marginTop: 4,
  },
});