import { Platform } from 'react-native';

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
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
  private adBlockCallback: ((detected: boolean) => void) | null = null;

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(config: AdConfig, enableAdBlockDetection = true, onAdBlockDetected?: (detected: boolean) => void): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 AdMob already initialized');
      return true;
    }

    try {
      this.config = config;
      this.adBlockCallback = onAdBlockDetected || null;

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
    console.log('📱 Setting up ad block detection');
    // Detection is now handled in individual ad methods
  }

  private onAdFailure() {
    this.consecutiveFailures++;
    console.warn(`🚫 Ad failure ${this.consecutiveFailures}/${this.maxFailures}`);
    
    if (this.consecutiveFailures >= this.maxFailures) {
      this.adBlockDetected = true;
      console.warn('🚫 Ad blocking detected - consecutive failures exceeded threshold');
      
      if (this.adBlockCallback) {
        this.adBlockCallback(true);
      }
    }
  }

  private onAdSuccess() {
    if (this.consecutiveFailures > 0) {
      console.log('✅ Ad loaded successfully - resetting failure count');
    }
    this.consecutiveFailures = 0;
    this.adBlockDetected = false;
    
    if (this.adBlockCallback) {
      this.adBlockCallback(false);
    }
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
        this.onAdFailure();
        return { success: false };
      }

      // Load and show rewarded ad
      await this.admobModule.AdMobRewarded.setAdUnitID(this.config.rewardedId);
      await this.admobModule.AdMobRewarded.requestAdAsync();
      await this.admobModule.AdMobRewarded.showAdAsync();

      this.onAdSuccess();
      return { success: true, reward: 100 };
    } catch (error) {
      console.error('Rewarded ad error:', error);
      this.onAdFailure();
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
        this.onAdFailure();
        return false;
      }

      await this.admobModule.AdMobInterstitial.setAdUnitID(this.config.interstitialId);
      await this.admobModule.AdMobInterstitial.requestAdAsync();
      await this.admobModule.AdMobInterstitial.showAdAsync();

      this.onAdSuccess();
      return true;
    } catch (error) {
      console.error('Interstitial ad error:', error);
      this.onAdFailure();
      return false;
    }
  }

  isAdBlockDetected(): boolean {
    return this.adBlockDetected;
  }

  getConfig(): AdConfig | null {
    return this.config;
  }

  getAdBlockStatus(): { detected: boolean; failureCount: number } {
    return {
      detected: this.adBlockDetected,
      failureCount: this.consecutiveFailures
    };
  }

  resetAdBlockDetection() {
    this.consecutiveFailures = 0;
    this.adBlockDetected = false;
    console.log('🔄 Ad block detection reset');
  }
}

export default AdService;