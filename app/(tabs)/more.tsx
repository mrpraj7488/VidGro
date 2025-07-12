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
import { router } from 'expo-router';
import { 
  DollarSign, 
  Crown, 
  Gift, 
  ShieldOff, 
  Star,
  ChevronRight,
  Play
} from 'lucide-react-native';
import GlobalHeader from '@/components/GlobalHeader';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface MoreItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  showArrow: boolean;
  subtitle?: string;
}

export default function MoreTab() {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleBuyCoins = () => {
    router.push('/buy-coins');
  };

  const handleBecomeVIP = () => {
    router.push('/become-vip');
  };

  const handleFreeCoins = () => {
    // Show ad and award 100 coins
    Alert.alert(
      'Watch Ad for Coins',
      'Watch a short ad to earn 100 coins!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Watch Ad', 
          onPress: () => {
            // Simulate ad watching
            setTimeout(() => {
              Alert.alert('Coins Earned!', 'You received 100 coins for watching the ad!');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleStopAds = () => {
    router.push('/configure-ads');
  };

  const handleRateUs = () => {
    router.push('/rate-us');
  };

  const moreItems: MoreItem[] = [
    {
      id: 'buy-coins',
      title: 'Buy Coin',
      icon: <DollarSign color="#800080" size={24} />,
      onPress: handleBuyCoins,
      showArrow: true,
    },
    {
      id: 'become-vip',
      title: 'Become VIP',
      icon: <Crown color="#800080" size={24} />,
      onPress: handleBecomeVIP,
      showArrow: true,
    },
    {
      id: 'free-coins',
      title: 'Free Coins',
      icon: <Gift color="#800080" size={24} />,
      onPress: handleFreeCoins,
      showArrow: false,
      subtitle: 'Watch Ad',
    },
    {
      id: 'stop-ads',
      title: 'Stop Ads as Long as 5 Hours',
      icon: <ShieldOff color="#800080" size={24} />,
      onPress: handleStopAds,
      showArrow: true,
    },
    {
      id: 'rate-us',
      title: 'Rate Us and Get 400 Coins',
      icon: <Star color="#800080" size={24} />,
      onPress: handleRateUs,
      showArrow: true,
    },
  ];

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="More" 
        showCoinDisplay={true} 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {moreItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.moreItem,
                index === moreItems.length - 1 && styles.lastItem
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                  {item.icon}
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <View style={styles.subtitleContainer}>
                      <Play color="#800080" size={12} />
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {item.showArrow && (
                <ChevronRight color="#800080" size={20} />
              )}
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
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
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
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 64,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#AAAAAA',
    marginLeft: 4,
  },
});