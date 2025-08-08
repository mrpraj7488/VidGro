import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import SecurityService from '../services/SecurityService';
import AdService from '../services/AdService';

export interface RuntimeConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  admob: {
    appId: string;
    bannerId: string;
    interstitialId: string;
    rewardedId: string;
  };
  features: {
    coinsEnabled: boolean;
    adsEnabled: boolean;
    vipEnabled: boolean;
    referralsEnabled: boolean;
    analyticsEnabled: boolean;
  };
  app: {
    minVersion: string;
    forceUpdate: boolean;
    maintenanceMode: boolean;
    apiVersion: string;
  };
  security: {
    allowEmulators: boolean;
    allowRooted: boolean;
    requireSignatureValidation: boolean;
    adBlockDetection: boolean;
  };
  metadata: {
    configVersion: string;
    lastUpdated: string;
    ttl: number; // Time to live in seconds
  };
}

interface ConfigContextType {
  config: RuntimeConfig | null;
  loading: boolean;
  error: string | null;
  isConfigValid: boolean;
  securityReport: any;
  refreshConfig: () => Promise<void>;
  validateSecurity: () => Promise<boolean>;
  handleAdBlockDetection: (detected: boolean) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

const CONFIG_CACHE_KEY = 'runtime_config_cache';
const CONFIG_HASH_KEY = 'runtime_config_hash';
const DEFAULT_TTL = 3600; // 1 hour

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [securityReport, setSecurityReport] = useState<any>(null);

  useEffect(() => {
    initializeConfig();
  }, []);

  const initializeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, perform security checks
      const securityValid = await validateSecurity();
      if (!securityValid) {
        setError('Security validation failed. Some features may be restricted.');
        setLoading(false);
        // Continue with limited functionality
      }

      // Try to load cached config first
      const cachedConfig = await loadCachedConfig();
      if (cachedConfig && isCacheValid(cachedConfig)) {
        console.log('📱 Using cached runtime config');
        setConfig(cachedConfig);
        setIsConfigValid(true);
        setLoading(false);
        
        // Fetch fresh config in background
        fetchFreshConfig();
        return;
      }

      // Fetch fresh config
      await fetchFreshConfig();
    } catch (err) {
      console.error('Config initialization error:', err);
      setError('Failed to initialize app configuration');
      setLoading(false);
    }
  };

  const loadCachedConfig = async (): Promise<RuntimeConfig | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (!cachedData) return null;

      const parsedConfig = JSON.parse(cachedData);
      
      // Validate config structure
      if (!isValidConfigStructure(parsedConfig)) {
        console.log('📱 Cached config has invalid structure, ignoring');
        return null;
      }

      return parsedConfig;
    } catch (error) {
      console.error('Error loading cached config:', error);
      return null;
    }
  };

  const isCacheValid = (cachedConfig: RuntimeConfig): boolean => {
    if (!cachedConfig.metadata?.lastUpdated || !cachedConfig.metadata?.ttl) {
      return false;
    }

    const lastUpdated = new Date(cachedConfig.metadata.lastUpdated);
    const ttl = cachedConfig.metadata.ttl * 1000; // Convert to milliseconds
    const now = new Date();

    return (now.getTime() - lastUpdated.getTime()) < ttl;
  };

  const fetchFreshConfig = async () => {
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://admin.vidgro.com/api';
      const configUrl = `${apiBaseUrl}/client-runtime-config`;

      console.log('📱 Fetching runtime config from:', configUrl);

      const response = await axios.get(configUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': `VidGro-Mobile/${Platform.OS}`,
          'X-App-Version': '1.0.0',
          'X-Platform': Platform.OS,
          'X-Device-Fingerprint': await SecurityService.getInstance().generateDeviceFingerprint(),
          'X-App-Hash': await SecurityService.getInstance().generateAppHash(),
        },
      });

      if (!response.data || !isValidConfigStructure(response.data)) {
        throw new Error('Invalid config structure received from server');
      }

      const freshConfig = response.data as RuntimeConfig;
      
      // Validate config integrity (optional HMAC check)
      const configHash = await this.generateConfigHash(freshConfig);
      const integrityValid = await SecurityService.getInstance().validateConfigIntegrity(
        freshConfig, 
        response.headers['x-config-hash']
      );
      
      if (!integrityValid) {
        console.warn('⚠️ Config integrity validation failed');
      }
      
      // Cache the fresh config
      await this.cacheConfig(freshConfig, configHash);

      setConfig(freshConfig);
      setIsConfigValid(true);
      setError(null);

      console.log('📱 Runtime config loaded successfully');
      console.log('📱 Features enabled:', freshConfig.features);
      
      // Initialize services with runtime config
      await this.initializeServicesWithConfig(freshConfig);
      
    } catch (err: any) {
      console.error('Error fetching fresh config:', err);
      
      // Try to use cached config as fallback
      const cachedConfig = await loadCachedConfig();
      if (cachedConfig) {
        console.log('📱 Using cached config as fallback');
        setConfig(cachedConfig);
        setIsConfigValid(true);
        setError('Using cached configuration');
      } else {
        setError(`Failed to load configuration: ${err.message}`);
        setIsConfigValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  private async cacheConfig(config: RuntimeConfig, hash: string) {
    try {
      // Encrypt config before caching
      const encryptedConfig = await this.encryptConfig(config);
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, encryptedConfig);
      await AsyncStorage.setItem(CONFIG_HASH_KEY, hash);
    } catch (error) {
      console.error('Error caching config:', error);
      // Fallback to unencrypted storage
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
      await AsyncStorage.setItem(CONFIG_HASH_KEY, hash);
    }
  }

  private async encryptConfig(config: RuntimeConfig): Promise<string> {
    try {
      // Simple encryption using device-specific key
      const deviceKey = await SecurityService.getInstance().generateDeviceFingerprint();
      const configString = JSON.stringify(config);
      
      // In production, use proper encryption library
      // For now, just base64 encode with device key
      const combined = `${deviceKey}:${configString}`;
      return Buffer.from(combined).toString('base64');
    } catch (error) {
      console.error('Config encryption error:', error);
      return JSON.stringify(config);
    }
  }

  private async decryptConfig(encryptedConfig: string): Promise<RuntimeConfig | null> {
    try {
      const deviceKey = await SecurityService.getInstance().generateDeviceFingerprint();
      const decoded = Buffer.from(encryptedConfig, 'base64').toString();
      const [storedKey, configString] = decoded.split(':');
      
      if (storedKey !== deviceKey) {
        console.warn('⚠️ Device key mismatch, config may be from different device');
        return null;
      }
      
      return JSON.parse(configString);
    } catch (error) {
      console.error('Config decryption error:', error);
      // Try to parse as unencrypted JSON
      try {
        return JSON.parse(encryptedConfig);
      } catch {
        return null;
      }
    }
  }

  private async initializeServicesWithConfig(config: RuntimeConfig) {
    try {
      // Initialize AdMob with ad block detection callback
      if (config.features.adsEnabled) {
        const adService = AdService.getInstance();
        await adService.initialize(
          config.admob,
          config.security.adBlockDetection,
          this.handleAdBlockDetection
        );
      }
      
      console.log('📱 All services initialized with runtime config');
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  }

  const validateSecurity = async (): Promise<boolean> => {
    try {
      const securityService = SecurityService.getInstance();
      const securityResult = await securityService.performSecurityChecks({
        security: {
          allowRooted: false,
          allowEmulators: true,
          requireSignatureValidation: false,
          adBlockDetection: true,
        }
      });
      
      setSecurityReport(securityService.getSecurityReport());
      
      if (securityResult.warnings.length > 0) {
        console.warn('🔒 Security warnings:', securityResult.warnings);
      }
      
      if (securityResult.errors.length > 0) {
        console.error('🔒 Security errors:', securityResult.errors);
        return false;
      }
      
      return securityResult.isValid;
    } catch (error) {
      console.error('Security validation error:', error);
      return true; // Don't block app if security check fails
    }
  };

  const handleAdBlockDetection = (detected: boolean) => {
    if (detected) {
      console.warn('🚫 Ad blocking detected by AdService');
      // You can implement user notification or feature restrictions here
      // For example:
      // Alert.alert('Ad Blocker Detected', 'Please disable ad blocking to earn coins');
    } else {
      console.log('✅ Ads working normally');
    }
  };

  private generateConfigHash = async (config: RuntimeConfig): Promise<string> => {
    try {
      const configString = JSON.stringify(config);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        configString
      );
      return hash;
    } catch (error) {
      console.error('Error generating config hash:', error);
      return '';
    }
  };

  const isValidConfigStructure = (config: any): boolean => {
    return (
      config &&
      config.supabase &&
      config.supabase.url &&
      config.supabase.anonKey &&
      config.admob &&
      config.features &&
      config.app &&
      config.security &&
      config.metadata
    );
  };

  const refreshConfig = async () => {
    await fetchFreshConfig();
  };

  const value: ConfigContextType = {
    config,
    loading,
    error,
    isConfigValid,
    securityReport,
    refreshConfig,
    validateSecurity,
    handleAdBlockDetection,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}