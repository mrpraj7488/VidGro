import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Gift } from 'lucide-react-native';

interface AdManagerProps {
  onRewardEarned?: (coins: number) => void;
  onAdShown?: () => void;
}

export default function AdManager({ onRewardEarned, onAdShown }: AdManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [adAvailable, setAdAvailable] = useState(true);

  const showRewardedAd = async () => {
    if (Platform.OS === 'web') {
      // Web simulation
      setIsLoading(true);
      onAdShown?.();
      
      // Simulate ad duration
      setTimeout(() => {
        const rewardCoins = Math.floor(Math.random() * (400 - 150 + 1)) + 150;
        onRewardEarned?.(rewardCoins);
        setIsLoading(false);
        setAdAvailable(false);
        
        // Make ad available again after 30 seconds
        setTimeout(() => setAdAvailable(true), 30000);
      }, 3000);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.adButton, (!adAvailable || isLoading) && styles.adButtonDisabled]}
      onPress={showRewardedAd}
      disabled={!adAvailable || isLoading}
    >
      <Gift color="white" size={24} style={styles.adIcon} />
      <View style={styles.adContent}>
        <Text style={styles.adTitle}>
          {isLoading ? 'Loading Ad...' : !adAvailable ? 'Ad Not Available' : 'Watch Ad for Coins'}
        </Text>
        <Text style={styles.adSubtitle}>
          {isLoading ? 'Please wait' : !adAvailable ? 'Try again in 30s' : 'Earn 150-400 coins'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  adButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  adButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  adIcon: {
    marginRight: 12,
  },
  adContent: {
    flex: 1,
  },
  adTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  adSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});