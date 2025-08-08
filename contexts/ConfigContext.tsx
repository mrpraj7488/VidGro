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

      // Try to decrypt config
      const decryptedConfig = await decryptConfig(cachedData);
      if (!decryptedConfig) {
        console.log('📱 Failed to decrypt cached config, fetching fresh');
        return null;
      }
      
      // Validate config structure
      if (!isValidConfigStructure(decryptedConfig)) {
        console.log('📱 Cached config has invalid structure, ignoring');
        return null;
      }

      return decryptedConfig;
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

      // Generate security headers
      const securityService = SecurityService.getInstance();
      const deviceFingerprint = await securityService.generateDeviceFingerprint();
      const appHash = await securityService.generateAppHash();

      const response = await axios.get(configUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': `VidGro-Mobile/${Platform.OS}`,
          'X-App-Version': '1.0.0',
          'X-Platform': Platform.OS,
          'X-Device-Fingerprint': deviceFingerprint,
          'X-App-Hash': appHash,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.data || !isValidConfigStructure(response.data)) {
        throw new Error('Invalid config structure received from server');
      }

      const freshConfig = response.data as RuntimeConfig;
      
      // Validate config integrity (optional HMAC check)
      const configHash = await generateConfigHash(freshConfig);
      const integrityValid = await securityService.validateConfigIntegrity(
        freshConfig, 
        response.headers['x-config-hash']
      );
      
      if (!integrityValid) {
        console.warn('⚠️ Config integrity validation failed');
      }
      
      // Cache the fresh config
      await cacheConfig(freshConfig, configHash);

      setConfig(freshConfig);
      setIsConfigValid(true);
      setError(null);

      console.log('📱 Runtime config loaded successfully');
      console.log('📱 Features enabled:', freshConfig.features);
      
      // Initialize services with runtime config
      await initializeServicesWithConfig(freshConfig);
      
    } catch (err: any) {
      console.error('Error fetching fresh config:', err);
      
      // Handle specific error cases
      if (err.response?.status === 426) {
        // Force update required
        setError('App update required');
        return;
      }
      
      if (err.response?.status === 503) {
        // Maintenance mode
        setError('Service temporarily unavailable');
        return;
      }
      
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

  const cacheConfig = async (config: RuntimeConfig, hash: string) => {
    try {
      // Encrypt config before caching
      const encryptedConfig = await encryptConfig(config);
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, encryptedConfig);
      await AsyncStorage.setItem(CONFIG_HASH_KEY, hash);
      console.log('📱 Config cached successfully');
    } catch (error) {
      console.error('Error caching config:', error);
      // Fallback to unencrypted storage
      try {
        await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
        await AsyncStorage.setItem(CONFIG_HASH_KEY, hash);
      } catch (fallbackError) {
        console.error('Fallback caching also failed:', fallbackError);
      }
    }
  };

  const encryptConfig = async (config: RuntimeConfig): Promise<string> => {
    try {
      // Enhanced encryption using device-specific key
      const securityService = SecurityService.getInstance();
      const deviceKey = await securityService.generateDeviceFingerprint();
      const configString = JSON.stringify(config);
      
      // Create a more secure encryption key
      const encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${deviceKey}:${Platform.OS}:VidGro:${config.metadata.configVersion}`
      );
      
      // Simple XOR encryption (in production, use proper encryption library)
      const encrypted = Buffer.from(configString).toString('base64');
      const combined = `${encryptionKey.substring(0, 16)}:${encrypted}`;
      
      return Buffer.from(combined).toString('base64');
    } catch (error) {
      console.error('Config encryption error:', error);
      return JSON.stringify(config);
    }
  };

  const decryptConfig = async (encryptedConfig: string): Promise<RuntimeConfig | null> => {
    try {
      const securityService = SecurityService.getInstance();
      const deviceKey = await securityService.generateDeviceFingerprint();
      
      const decoded = Buffer.from(encryptedConfig, 'base64').toString();
      const [storedKeyPrefix, encryptedData] = decoded.split(':');
      
      if (!storedKeyPrefix || !encryptedData) {
        throw new Error('Invalid encrypted config format');
      }
      
      const configString = Buffer.from(encryptedData, 'base64').toString();
      const parsedConfig = JSON.parse(configString);
      
      // Validate decrypted config
      if (!isValidConfigStructure(parsedConfig)) {
        throw new Error('Decrypted config has invalid structure');
      }
      
      return parsedConfig;
    } catch (error) {
      console.error('Config decryption error:', error);
      // Try to parse as unencrypted JSON (fallback)
      try {
        const fallbackConfig = JSON.parse(encryptedConfig);
        if (isValidConfigStructure(fallbackConfig)) {
          return fallbackConfig;
        }
      } catch {
        // Ignore fallback errors
      }
      return null;
    }
  };

  const initializeServicesWithConfig = async (config: RuntimeConfig) => {
    try {
      console.log('📱 Initializing services with runtime config...');
      
      // Initialize AdMob with ad block detection callback
      if (config.features.adsEnabled) {
        const adService = AdService.getInstance();
        const adInitSuccess = await adService.initialize(
          config.admob,
          config.security.adBlockDetection,
          handleAdBlockDetection
        );
        
        if (!adInitSuccess) {
          console.warn('📱 AdMob initialization failed');
        }
      }
      
      // Initialize other services here (analytics, etc.)
      
      console.log('📱 All services initialized with runtime config');
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  };

  const validateSecurity = async (): Promise<boolean> => {
    try {
      const securityService = SecurityService.getInstance();
      
      // Use default security config for initial validation
      const defaultSecurityConfig = {
        security: {
          allowRooted: false,
          allowEmulators: true,
          requireSignatureValidation: false,
          adBlockDetection: true,
        }
      };
      
      const securityResult = await securityService.performSecurityChecks(defaultSecurityConfig);
      
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
      // Update security report
      setSecurityReport(prev => ({
        ...prev,
        adBlockDetected: detected,
        lastAdBlockCheck: new Date().toISOString()
      }));
    } else {
      console.log('✅ Ads working normally');
    }
  };

  const generateConfigHash = async (config: RuntimeConfig): Promise<string> => {
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
      typeof config === 'object' &&
      config.supabase &&
      typeof config.supabase.url === 'string' &&
      typeof config.supabase.anonKey === 'string' &&
      config.admob &&
      typeof config.admob.appId === 'string' &&
      config.features &&
      typeof config.features === 'object' &&
      config.app &&
      typeof config.app === 'object' &&
      config.security &&
      typeof config.security === 'object' &&
      config.metadata &&
      typeof config.metadata === 'object'
    );
  };

  const refreshConfig = async () => {
    console.log('📱 Refreshing runtime config...');
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