import { Platform } from 'react-native';

// Lightweight ad module for cross-platform compatibility
export const isAdSupportedPlatform = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Mock implementations for web compatibility
export const RewardedAdEventType = {
  LOADED: 'loaded',
  EARNED_REWARD: 'earned_reward',
  CLOSED: 'closed',
  ERROR: 'error'
} as const;

export const TestIds = {
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'
} as const;

export const initialize = () => Promise.resolve();
export const setRequestConfiguration = () => {};
export const RewardedAd = null;

export default {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  initialize,
  setRequestConfiguration,
  isAdSupportedPlatform
};