import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, Crown, Gift, CircleStop as StopCircle, Star, UserPlus, CircleHelp as HelpCircle, X, Play } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';
import Header from '@/components/Header';

export default function OthersScreen() {
  const { coins, addCoins } = useUserStore();
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
            const earnedCoins = Math.floor(Math.random() * 251) + 150;
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
      `Purchase VIP membership for ${price}?\n\n✅ Ad-free experience\n✅ 20% discount on promotions\n✅ Priority support\n✅ Exclusive VIP badge`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: () => {
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

  const handleRateUs = () => {
    Alert.alert('Rate Us', 'Thank you for using VidGro! Please rate us on the app store.');
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How can we help you?',
      [
        { text: 'FAQ', onPress: () => Alert.alert('FAQ', 'Frequently asked questions coming soon!') },
        { text: 'Contact', onPress: () => Alert.alert('Contact', 'Contact form coming soon!') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const featureCards = [
    {
      title: 'Buy Coins',
      subtitle: 'Purchase coins for promotions',
      icon: DollarSign,
      gradient: ['#FFA500', '#FF8C00'],
      onPress: () => setShowCoinPurchase(true),
    },
    {
      title: 'Become VIP',
      subtitle: 'Go Ad-Free and get 20% off on all promotions',
      icon: Crown,
      gradient: ['#FFD700', '#FFA500'],
      onPress: () => setShowVipModal(true),
    },
    {
      title: 'Free Coins',
      subtitle: 'Watch 30-45 seconds of ads to earn 150-400 coins',
      icon: Gift,
      gradient: ['#00FF00', '#32CD32'],
      onPress: handleFreeCoins,
    },
    {
      title: 'Stop Ads',
      subtitle: 'Disable ads for 6 hours (50 coins)',
      icon: StopCircle,
      gradient: ['#FF0000', '#DC143C'],
      onPress: handleStopAds,
    },
    {
      title: 'Rate Us',
      subtitle: 'Rate VidGro on the app store',
      icon: Star,
      gradient: ['#8A2BE2', '#9370DB'],
      onPress: handleRateUs,
    },
    {
      title: 'Refer a Friend',
      subtitle: 'Share referral code and earn coins',
      icon: UserPlus,
      gradient: ['#1E90FF', '#4169E1'],
      onPress: handleReferFriend,
    },
    {
      title: 'Support',
      subtitle: 'FAQ or contact form',
      icon: HelpCircle,
      gradient: ['#6B7280', '#4B5563'],
      onPress: handleSupport,
    },
  ];

  const renderFeatureCard = (card: any, index: number) => (
    <TouchableOpacity key={index} style={styles.featureCard} onPress={card.onPress}>
      <LinearGradient
        colors={card.gradient}
        style={styles.cardGradient}
      >
        <View style={styles.cardIcon}>
          <card.icon size={28} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          {card.subtitle && (
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
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
                  <View style={styles.packageIcon}>
                    <DollarSign size={24} color="#FFA500" />
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
      <Header title="Others" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {featureCards.map(renderFeatureCard)}
        </View>
      </ScrollView>

      {renderCoinPurchaseModal()}
      {renderVipModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  cardsContainer: {
    padding: 20,
    gap: 16,
  },
  featureCard: {
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
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
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
    borderColor: '#FFA500',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFA500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  popularText: {
    fontSize: 10,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  packageIcon: {
    marginRight: 16,
  },
  packageInfo: {
    flex: 1,
  },
  coinAmount: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  coinPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#00FF00',
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
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  benefit: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
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
    borderColor: '#FFD700',
    backgroundColor: '#FFFBEB',
  },
  vipOptionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  vipOptionPrice: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#FF0000',
  },
  saveText: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    color: '#FFA500',
    marginTop: 4,
  },
});