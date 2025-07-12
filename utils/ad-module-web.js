// Web-only fallback for react-native-google-mobile-ads
// This file provides mock implementations for web platform

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

// Mock functions for web
export const initialize = () => Promise.resolve();
export const setRequestConfiguration = () => {};

// Default export for compatibility
export default {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  initialize,
  setRequestConfiguration
};