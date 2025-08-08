import { Platform, Alert } from 'react-native';

interface AdConfig {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
}

interface AdBlockStatus {
  detected: boolean;
  failureCount: number;
  lastFailureTime?: string;
  consecutiveFailures: number;
}

class AdService {
  private static instance: AdService;
  private admobModule: any = null;
  private isInitialized = false;
  private config: AdConfig | null = null;
  private adBlockStatus: AdBlockStatus = {
    detected: false,
    failureCount: 0,
    consecutiveFailures: 0,
  };
  private readonly maxConsecutiveFailures = 3;
  private readonly maxTotalFailures = 10;
  private adBlockCallback: ((detected: boolean) => void) | null = null;
  private detectionEnabled = true;

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(
    config: AdConfig, 
    enableAdBlockDetection = true, 
    onAdBlockDetected?: (detected: boolean) => void
  ): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 AdMob already initialized');
      return true;
    }

    try {
      this.config = config;
      this.adBlockCallback = onAdBlockDetected || null;
      this.detectionEnabled = enableAdBlockDetection;

      console.log('📱 Initializing AdMob with config:', {
        appId: config.appId,
        adsEnabled: true,
        detectionEnabled: enableAdBlockDetection
      });

      // Only initialize on native platforms
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          // Dynamically import AdMob
          const AdMob = await import('expo-ads-admob');
          this.admobModule = AdMob;

          // Initialize AdMob with runtime config
          await AdMob.setTestDeviceIDAsync(AdMob.AdMobTestDeviceID.DEVICE);
          
          console.log('📱 AdMob initialized successfully with app ID:', config.appId);
          this.isInitialized = true;

          // Set up ad block detection
          if (enableAdBlockDetection) {
            this.setupAdBlockDetection();
          }

          return true;
        } catch (admobError) {
          console.error('📱 AdMob initialization failed:', admobError);
          this.isInitialized = false;
          return false;
        }
      } else {
        console.log('📱 AdMob not available on web platform - using fallback');
        this.isInitialized = true;
        return true;
      }
    } catch (error) {
      console.error('AdMob initialization error:', error);
      return false;
    }
  }

  private setupAdBlockDetection() {
    console.log('📱 Setting up enhanced ad block detection');
    
    // Reset detection state
    this.adBlockStatus = {
      detected: false,
      failureCount: 0,
      consecutiveFailures: 0,
    };

    // Periodic ad block testing
    if (this.detectionEnabled) {
      this.startPeriodicAdBlockTesting();
    }
  }

  private startPeriodicAdBlockTesting() {
    // Test ad loading capability every 5 minutes
    setInterval(async () => {
      if (this.detectionEnabled && this.config) {
        await this.testAdLoadingCapability();
      }
    }, 5 * 60 * 1000);
  }

  private async testAdLoadingCapability(): Promise<boolean> {
    try {
      if (!this.admobModule || !this.config) {
        return false;
      }

      // Try to load a banner ad to test if ads are working
      await this.admobModule.AdMobBanner.setAdUnitID(this.config.bannerId);
      
      // If we reach here, ads are likely working
      this.onAdSuccess();
      return true;
    } catch (error) {
      console.warn('📱 Ad loading test failed:', error);
      this.onAdFailure('test_load_failure');
      return false;
    }
  }

  private onAdFailure(reason: string = 'unknown') {
    this.adBlockStatus.consecutiveFailures++;
    this.adBlockStatus.failureCount++;
    this.adBlockStatus.lastFailureTime = new Date().toISOString();
    
    console.warn(`🚫 Ad failure (${reason}): ${this.adBlockStatus.consecutiveFailures}/${this.maxConsecutiveFailures} consecutive, ${this.adBlockStatus.failureCount} total`);
    
    // Detect ad blocking based on consecutive failures
    if (this.adBlockStatus.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.adBlockStatus.detected = true;
      console.warn('🚫 Ad blocking detected - consecutive failures exceeded threshold');
      
      if (this.adBlockCallback) {
        this.adBlockCallback(true);
      }
      
      // Show user notification about ad blocking
      this.notifyAdBlockDetection();
    }
    
    // Also check total failure count for persistent issues
    if (this.adBlockStatus.failureCount >= this.maxTotalFailures) {
      this.adBlockStatus.detected = true;
      console.warn('🚫 Ad blocking detected - total failures exceeded threshold');
      
      if (this.adBlockCallback) {
        this.adBlockCallback(true);
      }
    }
  }

  private onAdSuccess() {
    if (this.adBlockStatus.consecutiveFailures > 0) {
      console.log('✅ Ad loaded successfully - resetting consecutive failure count');
    }
    
    // Reset consecutive failures but keep total count for tracking
    this.adBlockStatus.consecutiveFailures = 0;
    
    // Only mark as not detected if we had previously detected blocking
    if (this.adBlockStatus.detected) {
      this.adBlockStatus.detected = false;
      console.log('✅ Ad blocking appears to be resolved');
      
      if (this.adBlockCallback) {
        this.adBlockCallback(false);
      }
    }
  }

  private notifyAdBlockDetection() {
    // Don't spam the user with notifications
    if (this.adBlockStatus.consecutiveFailures === this.maxConsecutiveFailures) {
      Alert.alert(
        'Ad Blocker Detected',
        'It appears you have ad blocking software enabled. This may prevent you from earning free coins through ads.',
        [
          { text: 'OK' },
          { 
            text: 'Learn More', 
            onPress: () => {
              Alert.alert(
                'About Ad Blocking',
                'VidGro uses ads to provide free coins to users. Ad blocking software prevents these ads from loading, which affects the free coin feature.\n\nTo earn free coins, please consider disabling ad blocking for VidGro.',
                [{ text: 'Understood' }]
              );
            }
          }
        ]
      );
    }
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number }> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      this.onAdFailure('service_not_initialized');
      return { success: false };
    }

    if (Platform.OS === 'web') {
      // Web fallback - simulate ad watching with realistic timing
      return new Promise((resolve) => {
        console.log('📱 Simulating rewarded ad on web platform');
        setTimeout(() => {
          this.onAdSuccess();
          resolve({ success: true, reward: 100 });
        }, 3000);
      });
    }

    try {
      if (!this.admobModule) {
        this.onAdFailure('admob_module_unavailable');
        return { success: false };
      }

      console.log('📱 Loading rewarded ad...');
      
      // Load and show rewarded ad
      await this.admobModule.AdMobRewarded.setAdUnitID(this.config.rewardedId);
      await this.admobModule.AdMobRewarded.requestAdAsync();
      await this.admobModule.AdMobRewarded.showAdAsync();

      console.log('📱 Rewarded ad completed successfully');
      this.onAdSuccess();
      return { success: true, reward: 100 };
    } catch (error) {
      console.error('Rewarded ad error:', error);
      this.onAdFailure('rewarded_ad_error');
      return { success: false };
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      this.onAdFailure('service_not_initialized');
      return false;
    }

    if (Platform.OS === 'web') {
      // Web fallback - simulate ad
      console.log('📱 Simulating interstitial ad on web platform');
      this.onAdSuccess();
      return true;
    }

    try {
      if (!this.admobModule) {
        this.onAdFailure('admob_module_unavailable');
        return false;
      }

      console.log('📱 Loading interstitial ad...');
      
      await this.admobModule.AdMobInterstitial.setAdUnitID(this.config.interstitialId);
      await this.admobModule.AdMobInterstitial.requestAdAsync();
      await this.admobModule.AdMobInterstitial.showAdAsync();

      console.log('📱 Interstitial ad completed successfully');
      this.onAdSuccess();
      return true;
    } catch (error) {
      console.error('Interstitial ad error:', error);
      this.onAdFailure('interstitial_ad_error');
      return false;
    }
  }

  async showBannerAd(): Promise<boolean> {
    if (!this.isInitialized || !this.config) {
      console.error('AdService not initialized');
      this.onAdFailure('service_not_initialized');
      return false;
    }

    if (Platform.OS === 'web') {
      // Web fallback
      console.log('📱 Simulating banner ad on web platform');
      this.onAdSuccess();
      return true;
    }

    try {
      if (!this.admobModule) {
        this.onAdFailure('admob_module_unavailable');
        return false;
      }

      console.log('📱 Loading banner ad...');
      
      await this.admobModule.AdMobBanner.setAdUnitID(this.config.bannerId);
      
      console.log('📱 Banner ad loaded successfully');
      this.onAdSuccess();
      return true;
    } catch (error) {
      console.error('Banner ad error:', error);
      this.onAdFailure('banner_ad_error');
      return false;
    }
  }

  isAdBlockDetected(): boolean {
    return this.adBlockStatus.detected;
  }

  getConfig(): AdConfig | null {
    return this.config;
  }

  getAdBlockStatus(): AdBlockStatus {
    return { ...this.adBlockStatus };
  }

  resetAdBlockDetection() {
    this.adBlockStatus = {
      detected: false,
      failureCount: 0,
      consecutiveFailures: 0,
    };
    console.log('🔄 Ad block detection reset');
    
    if (this.adBlockCallback) {
      this.adBlockCallback(false);
    }
  }

  // Enable/disable ad block detection
  setAdBlockDetection(enabled: boolean) {
    this.detectionEnabled = enabled;
    console.log(`📱 Ad block detection ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get detailed ad service status
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      hasConfig: this.config !== null,
      platform: Platform.OS,
      adBlockStatus: this.adBlockStatus,
      detectionEnabled: this.detectionEnabled,
      moduleAvailable: this.admobModule !== null,
    };
  }
}

export default AdService;