import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { DollarSign, Crown, Zap } from 'lucide-react-native';

interface CoinPackage {
  id: string;
  coins: number;
  price: string;
  bonus?: number;
  popular?: boolean;
}

interface CoinPurchaseProps {
  onPurchase?: (packageId: string, coins: number) => void;
}

const coinPackages: CoinPackage[] = [
  { id: 'starter', coins: 100, price: '$0.99' },
  { id: 'basic', coins: 500, price: '$4.99', bonus: 50 },
  { id: 'popular', coins: 1200, price: '$9.99', bonus: 200, popular: true },
  { id: 'premium', coins: 2500, price: '$19.99', bonus: 500 },
  { id: 'ultimate', coins: 5500, price: '$39.99', bonus: 1500 },
];

export default function CoinPurchase({ onPurchase }: CoinPurchaseProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pkg: CoinPackage) => {
    setLoading(pkg.id);
    
    try {
      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const totalCoins = pkg.coins + (pkg.bonus || 0);
      onPurchase?.(pkg.id, totalCoins);
      
      Alert.alert(
        'Purchase Successful!',
        `You received ${totalCoins} coins!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Please try again later.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Buy Coins</Text>
        <Text style={styles.subtitle}>Choose a package to get started</Text>
      </View>

      <View style={styles.packagesContainer}>
        {coinPackages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              pkg.popular && styles.popularCard,
              loading === pkg.id && styles.loadingCard
            ]}
            onPress={() => handlePurchase(pkg)}
            disabled={loading !== null}
          >
            {pkg.popular && (
              <View style={styles.popularBadge}>
                <Crown color="white" size={16} />
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            )}
            
            <View style={styles.packageHeader}>
              <View style={[styles.coinIcon, pkg.popular && styles.popularCoinIcon]}>
                <DollarSign color="white" size={24} />
              </View>
              <View style={styles.packageInfo}>
                <Text style={[styles.coinAmount, pkg.popular && styles.popularCoinAmount]}>
                  {pkg.coins.toLocaleString()} Coins
                </Text>
                {pkg.bonus && (
                  <View style={styles.bonusContainer}>
                    <Zap color="#FFA726" size={14} />
                    <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.packageFooter}>
              <Text style={[styles.price, pkg.popular && styles.popularPrice]}>
                {pkg.price}
              </Text>
              <Text style={styles.purchaseButton}>
                {loading === pkg.id ? 'Processing...' : 'Purchase'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Secure payments powered by your device's app store
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  packagesContainer: {
    paddingHorizontal: 16,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: '#FF4757',
    backgroundColor: '#FFF8F8',
  },
  loadingCard: {
    opacity: 0.6,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FF4757',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  popularCoinIcon: {
    backgroundColor: '#FF4757',
  },
  packageInfo: {
    flex: 1,
  },
  coinAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  popularCoinAmount: {
    color: '#FF4757',
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonusText: {
    fontSize: 12,
    color: '#FFA726',
    fontWeight: '600',
    marginLeft: 4,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  popularPrice: {
    color: '#FF4757',
  },
  purchaseButton: {
    backgroundColor: '#4ECDC4',
    color: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});