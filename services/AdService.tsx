import { Platform } from 'react-native';
import { useConfig } from '../contexts/ConfigContext';

interface AdConfig {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
}

class AdService {
  private static instance: AdService;
  private admobModule: any = null;
  private isInitialized = false;
  private config: AdConfig | null = null;
  private adBlockDetected = false;

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(config: AdConfig, enableAdBlockDetection = true): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 AdMob already initialized');
      return true;
    }

    try {
      this.config = config;

      // Only initialize on native platforms
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Dynamically import AdMob
        const AdMob = await import('expo-ads-admob');
        this.admobModule = AdMob;

        // Initialize AdMob with runtime config
        await AdMob.setTestDeviceIDAsync(AdMob.AdMobTestDeviceID.DEVICE);
        
        console.log('📱 AdMob initialized with app ID:', config.appId);
        this.isInitialized = true;

        // Set up ad block detection
        if (enableAdBlockDetection) {
          this.setupAdBlockDetection();
        }

        return true;
      } else {
        console.log('📱 AdMob not available on web platform');
        this.isInitialized = true;
        return true;
      }
    } catch (error) {
      console.error('AdMob initialization error:', error);
      return false;
    }
  }

  private setupAdBlockDetection() {
    // Basic ad block detection
    // In production, you'd implement more sophisticated detection
    console.log('📱 Setting up ad block detection');
    
    // Monitor ad load failures
    this.monitorAdFailures();
  }

  private monitorAdFailures() {
    // Track consecutive ad failures
    let consecutiveFailures = 0;
    const maxFailures = 3;

    // This would be called when ads fail to load
    const onAdFailure = () => {
      consecutiveFailures++;
      if (consecutiveFailures >= maxFailures) {
        this.adBlockDetected = true;
        console.warn('🚫 Potential ad blocking detected');
        // You can implement user notification or app restrictions here
      }
    };

    // Reset on successful ad load
    const onAdSuccess = () => {
      consecutiveFailures = 0;
      this.adBlockDetected = false;
    };
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number }> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      return { success: false };
    }

    if (Platform.OS === 'web') {
      // Web fallback - simulate ad watching
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, reward: 100 });
        }, 3000);
      });
    }

    try {
      if (!this.admobModule) {
        throw new Error('AdMob module not loaded');
      }

      // Load and show rewarded ad
      await this.admobModule.AdMobRewarded.setAdUnitID(this.config.rewardedId);
      await this.admobModule.AdMobRewarded.requestAdAsync();
      await this.admobModule.AdMobRewarded.showAdAsync();

      return { success: true, reward: 100 };
    } catch (error) {
      console.error('Rewarded ad error:', error);
      return { success: false };
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      return false;
    }

    if (Platform.OS === 'web') {
      // Web fallback - simulate ad
      return true;
    }

    try {
      if (!this.admobModule) {
        throw new Error('AdMob module not loaded');
      }

      await this.admobModule.AdMobInterstitial.setAdUnitID(this.config.interstitialId);
      await this.admobModule.AdMobInterstitial.requestAdAsync();
      await this.admobModule.AdMobInterstitial.showAdAsync();

      return true;
    } catch (error) {
      console.error('Interstitial ad error:', error);
      return false;
    }
  }

  isAdBlockDetected(): boolean {
    return this.adBlockDetected;
  }

  getConfig(): AdConfig | null {
    return this.config;
  }
}

export default AdService;