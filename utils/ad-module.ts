import { Platform } from 'react-native';

// Platform-specific imports to avoid Metro errors on web
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let initialize: any = null;
let setRequestConfiguration: any = null;

if (Platform.OS === 'web') {
  // Web platform - use mock implementations
  RewardedAd = null;
  RewardedAdEventType = {
    LOADED: 'loaded',
    EARNED_REWARD: 'earned_reward',
    CLOSED: 'closed',
    ERROR: 'error'
  };
  TestIds = {
    REWARDED: 'ca-app-pub-3940256099942544/5224354917',
    BANNER: 'ca-app-pub-3940256099942544/6300978111',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'
  };
  initialize = () => Promise.resolve();
  setRequestConfiguration = () => {};
} else {
  // Native platforms - import the actual module
  try {
    const GoogleMobileAds = require('react-native-google-mobile-ads');
    RewardedAd = GoogleMobileAds.RewardedAd;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    TestIds = GoogleMobileAds.TestIds;
    initialize = GoogleMobileAds.default?.initialize;
    setRequestConfiguration = GoogleMobileAds.default?.setRequestConfiguration;
  } catch (error) {
    console.warn('Google Mobile Ads not available on this platform:', error);
    // Provide fallback objects to prevent crashes
    RewardedAd = null;
    RewardedAdEventType = {
      LOADED: 'loaded',
      EARNED_REWARD: 'earned_reward',
      CLOSED: 'closed',
      ERROR: 'error'
    };
    TestIds = {
      REWARDED: 'ca-app-pub-3940256099942544/5224354917',
      BANNER: 'ca-app-pub-3940256099942544/6300978111',
      INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'
    };
    initialize = () => Promise.resolve();
    setRequestConfiguration = () => {};
  }
}

export { 
  RewardedAd, 
  RewardedAdEventType, 
  TestIds, 
  initialize, 
  setRequestConfiguration 
};