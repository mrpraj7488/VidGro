import { Platform } from 'react-native';

// Platform-specific imports to avoid Metro errors on web
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // Use non-literal string to prevent Metro's static analysis from bundling on web
    const moduleName = 'react-native-google-mobile-ads';
    const GoogleMobileAds = require(moduleName);
    RewardedAd = GoogleMobileAds.RewardedAd;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    TestIds = GoogleMobileAds.TestIds;
  } catch (error) {
    console.warn('Google Mobile Ads not available:', error);
  }
}

export { RewardedAd, RewardedAdEventType, TestIds };