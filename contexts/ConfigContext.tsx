import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import RootCheck from 'react-native-root-check';

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
  refreshConfig: () => Promise<void>;
  validateSecurity: () => Promise<boolean>;
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
        setError('Security validation failed. App cannot continue.');
        setLoading(false);
        return;
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
        },
      });

      if (!response.data || !isValidConfigStructure(response.data)) {
        throw new Error('Invalid config structure received from server');
      }

      const freshConfig = response.data as RuntimeConfig;
      
      // Validate config integrity (optional HMAC check)
      const configHash = await generateConfigHash(freshConfig);
      
      // Cache the fresh config
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(freshConfig));
      await AsyncStorage.setItem(CONFIG_HASH_KEY, configHash);

      setConfig(freshConfig);
      setIsConfigValid(true);
      setError(null);

      console.log('📱 Runtime config loaded successfully');
      console.log('📱 Features enabled:', freshConfig.features);
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

  const validateSecurity = async (): Promise<boolean> => {
    try {
      // Check for rooted/jailbroken devices
      if (Platform.OS !== 'web') {
        const isRooted = await RootCheck.isDeviceRooted();
        if (isRooted) {
          console.warn('🔒 Rooted/jailbroken device detected');
          // For now, just log - you can decide to block or allow
          // return false;
        }
      }

      // Check for emulator (basic detection)
      if (Platform.OS === 'android') {
        // Basic emulator detection - you can enhance this
        const isEmulator = Platform.constants?.Brand === 'google' && 
                          Platform.constants?.Model?.includes('sdk');
        if (isEmulator) {
          console.warn('🔒 Emulator detected');
          // For now, just log - you can decide to block or allow
        }
      }

      // App signature validation (placeholder)
      // In production, you'd validate the app's signature here
      
      return true;
    } catch (error) {
      console.error('Security validation error:', error);
      return false;
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
    refreshConfig,
    validateSecurity,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}