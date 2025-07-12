import { Platform } from 'react-native';

// Platform-specific imports to avoid Metro errors on web
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // Direct import for native platforms
    const GoogleMobileAds = require('react-native-google-mobile-ads');
    RewardedAd = GoogleMobileAds.RewardedAd;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    TestIds = GoogleMobileAds.TestIds;
  } catch (error) {
    console.warn('Google Mobile Ads not available:', error);
    // Provide fallback objects to prevent crashes
    RewardedAd = null;
    RewardedAdEventType = {};
    TestIds = {
      REWARDED: 'ca-app-pub-3940256099942544/5224354917'
    };
  }
} else {
  // Web platform - provide mock implementations
  RewardedAd = null;
  RewardedAdEventType = {
    LOADED: 'loaded',
    EARNED_REWARD: 'earned_reward',
    CLOSED: 'closed',
    ERROR: 'error'
  };
  TestIds = {
    REWARDED: 'ca-app-pub-3940256099942544/5224354917'
  };
}

export { RewardedAd, RewardedAdEventType, TestIds };