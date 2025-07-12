import { Platform } from 'react-native';

// Platform-specific imports to avoid Metro errors on web
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // Use eval to prevent Metro's static analysis from bundling on web
    const GoogleMobileAds = eval('require')('react-native-google-mobile-ads');
    RewardedAd = GoogleMobileAds.RewardedAd;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    TestIds = GoogleMobileAds.TestIds;
  } catch (error) {
    console.warn('Google Mobile Ads not available:', error);
  }
}

export { RewardedAd, RewardedAdEventType, TestIds };