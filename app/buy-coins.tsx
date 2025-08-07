import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Coins, Crown } from 'lucide-react-native';

export default function BuyCoinsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const coinPackages = [
    { coins: 1000, price: 29, bonus: 0, popular: false },
    { coins: 2500, price: 69, bonus: 500, popular: false },
    { coins: 5000, price: 129, bonus: 1000, popular: true },
    { coins: 10000, price: 249, bonus: 2500, popular: false },
    { coins: 25000, price: 499, bonus: 7500, popular: false },
    { coins: 50000, price: 899, bonus: 20000, popular: false },
  ];

  const handlePurchase = async (packageItem: any) => {
    setLoading(true);
    
    // Simulate purchase process
    Alert.alert(
      'Purchase Confirmation',
      `Are you sure you want to purchase ${packageItem.coins}${packageItem.bonus > 0 ? ` + ${packageItem.bonus} bonus` : ''} coins for ₹${packageItem.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: async () => {
            // Here you would integrate with actual payment service
            // For now, we'll simulate successful purchase
            
            setTimeout(() => {
              Alert.alert(
                'Purchase Successful!',
                `${packageItem.coins + packageItem.bonus} coins have been added to your account.`,
                [{ text: 'OK', onPress: () => {
                  refreshProfile();
                  router.back();
                }}]
              );
            }, 1000);
          }
        }
      ]
    );
    
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#800080' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Buy Coins</Text>
          <View style={styles.currentBalance}>
            <Coins size={16} color="white" />
            <Text style={[styles.balanceText, { color: 'white' }]}>{profile?.coins || 0}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose a coin package to unlock more video promotions
        </Text>

        <View style={styles.packagesContainer}>
          {coinPackages.map((packageItem, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.packageCard,
                { backgroundColor: colors.surface },
                packageItem.popular && styles.popularPackage
              ]}
              onPress={() => handlePurchase(packageItem)}
              disabled={loading}
            >
              {packageItem.popular && (
                <View style={styles.popularBadge}>
                  <Crown size={16} color="white" />
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <Text style={[styles.coinAmount, { color: colors.text }]}>
                  {packageItem.coins.toLocaleString()} Coins
                </Text>
                {packageItem.bonus > 0 && (
                  <Text style={[styles.bonusText, { color: colors.success }]}>
                    +{packageItem.bonus.toLocaleString()} Bonus
                  </Text>
                )}
              </View>

              <View style={styles.packageDetails}>
                <Text style={[styles.totalCoins, { color: colors.textSecondary }]}>
                  Total: {(packageItem.coins + packageItem.bonus).toLocaleString()} Coins
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>₹{packageItem.price}</Text>
              </View>

              <View style={[styles.purchaseButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.purchaseButtonText, { color: 'white' }]}>
                  {loading ? 'Processing...' : 'Purchase'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose a coin package to unlock more video promotions
        </Text>

        <View style={styles.packagesContainer}>
          {coinPackages.map((packageItem, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.packageCard,
                { backgroundColor: colors.surface },
                packageItem.popular && styles.popularPackage
              ]}
              onPress={() => handlePurchase(packageItem)}
              disabled={loading}
            >
              {packageItem.popular && (
                <View style={styles.popularBadge}>
                  <Crown size={16} color="white" />
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <Text style={[styles.coinAmount, { color: colors.text }]}>
                  {packageItem.coins.toLocaleString()} Coins
                </Text>
                {packageItem.bonus > 0 && (
                  <Text style={[styles.bonusText, { color: colors.success }]}>
                    +{packageItem.bonus.toLocaleString()} Bonus
                  </Text>
                )}
              </View>

              <View style={styles.packageDetails}>
                <Text style={[styles.totalCoins, { color: colors.textSecondary }]}>
                  Total: {(packageItem.coins + packageItem.bonus).toLocaleString()} Coins
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>₹{packageItem.price}</Text>
              </View>

              <View style={[styles.purchaseButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.purchaseButtonText, { color: 'white' }]}>
                  {loading ? 'Processing...' : 'Purchase'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Why Buy Coins?</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            • Promote your YouTube videos to thousands of viewers{'\n'}
            • Increase your video views and engagement{'\n'}
            • Grow your channel faster with targeted promotion{'\n'}
            • No subscription fees - pay only for what you use
          </Text>
        </View>

        <View style={[styles.securityContainer, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.securityTitle, { color: colors.success }]}>🔒 Secure Payment</Text>
          <Text style={[styles.securityText, { color: colors.success }]}>
            Your payment information is protected with bank-level security
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  currentBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  packagesContainer: {
    gap: 16,
    marginBottom: 32,
  },
  packageCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  popularPackage: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.2,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageHeader: {
    marginBottom: 12,
  },
  coinAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalCoins: {
    fontSize: 16,
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  purchaseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  securityContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
  },
});