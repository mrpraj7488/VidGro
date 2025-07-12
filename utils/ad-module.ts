import { Platform } from 'react-native';

// Simple mock implementations for all platforms
// This ensures consistent behavior and no bundling issues

export const RewardedAd = null;

export const RewardedAdEventType = {
  LOADED: 'loaded',
  EARNED_REWARD: 'earned_reward',
  CLOSED: 'closed',
  ERROR: 'error'
};

export const TestIds = {
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'
};

// Mock functions that work on all platforms
export const initialize = () => {
  console.log('Ad module initialized (mock)');
  return Promise.resolve();
};

export const setRequestConfiguration = () => {
  console.log('Ad request configuration set (mock)');
};

// Check if platform supports ads (for future native implementation)
export const isAdSupportedPlatform = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Default export for compatibility
export default {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  initialize,
  setRequestConfiguration,
  isAdSupportedPlatform
};