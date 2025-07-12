import { Platform } from 'react-native';

// Platform-specific imports for Android-only app
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let GoogleMobileAds: any = null;

// Only import Google Mobile Ads on Android platform
if (Platform.OS === 'android') {
  try {
    const GoogleMobileAdsModule = require('react-native-google-mobile-ads');
    RewardedAd = GoogleMobileAdsModule.RewardedAd;
    RewardedAdEventType = GoogleMobileAdsModule.RewardedAdEventType;
    TestIds = GoogleMobileAdsModule.TestIds;
    GoogleMobileAds = GoogleMobileAdsModule.default;
  } catch (error) {
    console.warn('Google Mobile Ads not available on this platform:', error);
  }
}

export { RewardedAd, RewardedAdEventType, TestIds, GoogleMobileAds };