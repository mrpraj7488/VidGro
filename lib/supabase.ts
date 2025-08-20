import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from '../contexts/ConfigContext';

// Type definitions
export interface RuntimeConfig {
  supabase: {
    url: string;
    anonKey?: string;
  };
  admob: {
    appId?: string;
    bannerId?: string;
    interstitialId?: string;
    rewardedId?: string;
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
    ttl: number;
  };
}

// Dynamic Supabase client that will be initialized with runtime config

let supabaseClient: any = null;

// Keep track of initialization attempts
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Helper: Initialize Supabase with config if possible
const tryInitializeWithConfig = (config: RuntimeConfig | null): boolean => {
  if (!config?.supabase?.url) {
    console.warn('⚠️ Cannot initialize Supabase: missing URL in config');
    return false;
  }

  // For public endpoint, use fallback key if anonKey is missing
  const anonKey = config.supabase.anonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.warn('⚠️ Cannot initialize Supabase: missing anonKey in config and no fallback available');
    return false;
  }

  const client = initializeSupabase(config.supabase.url, anonKey);
  return !!client;
};


export const initializeSupabase = (url: string, anonKey: string | null | undefined) => {
  if (supabaseClient) {
    console.log('📱 Supabase already initialized');
    return supabaseClient;
  }
  if (!url || !anonKey) {
    console.warn('⚠️ Cannot initialize Supabase: missing url or anonKey');
    return null;
  }
  console.log('📱 Initializing Supabase with runtime config');
  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
  return supabaseClient;
};

export const getSupabase = () => {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase accessed before initialization, returning null');
    return null;
  }
  return supabaseClient;
};

// For backward compatibility, export as supabase
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabase();
    if (!client) {
      console.warn('⚠️ Supabase accessed before initialization');
      return () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') });
    }
    return client[prop];
  }
});

// Remove old awardCoinsForVideo function and replace with new watchVideo
export const watchVideo = async (
  userId: string,
  videoId: string,
  watchDuration: number,
  fullyWatched: boolean = false
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await getSupabase().rpc('watch_video_and_earn_coins', {
      user_uuid: userId,
      video_uuid: videoId,
      watch_duration: watchDuration,
      video_fully_watched: fullyWatched
    });

    if (error) {
      console.error('Error calling watch_video_and_earn_coins:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in watchVideo:', err);
    return { data: null, error: err };
  }
};

// Get user profile
export async function getUserProfile(userId: string): Promise<any> {
  if (!userId) return null;

  try {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Profile fetch failed:', error);
    return null;
  }
}

// Get video queue
export async function getVideoQueue(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client.rpc('get_video_queue_for_user', {
      user_uuid: userId
    });

    if (!error) {
      return (data || []).map((v: any) => ({
        video_id: v.video_id ?? v.id,
        youtube_url: v.youtube_url ?? v.video_url ?? '',
        title: v.title,
        duration_seconds: Number(v.duration_seconds || 0),
        coin_reward: Number(v.coin_reward ?? 0),
        views_count: Number(v.views_count ?? 0),
        target_views: Number(v.target_views ?? 0),
        status: v.status,
        user_id: v.user_id,
        completed: v.completed ?? false,
        total_watch_time: Number(v.total_watch_time ?? 0),
        completion_rate: Number(v.completion_rate ?? 0),
      }));
    }

    console.warn('RPC get_video_queue_for_user failed, falling back to direct query:', error?.message);

    // Fallback: fetch watchable videos (active OR on_hold expired), not completed, not owned by requester
    const nowIso = new Date().toISOString();
    const { data: fallback, error: fallbackError } = await client
      .from('videos')
      .select(`
        id, youtube_url, video_url, title, duration_seconds, coin_reward,
        views_count, target_views, status, user_id, completed,
        total_watch_time, completion_rate, created_at, hold_until, repromoted_at
      `)
      .neq('user_id', userId)
      .eq('completed', false)
      .or(`status.eq.active,status.eq.on_hold.and.hold_until.lte.${nowIso}`)
      .order('repromoted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (fallbackError) {
      console.error('Fallback video query failed:', fallbackError);
      return [];
    }

    // Map to expected shape
    const fallbackMapped = (fallback || []).map((v: any) => ({
      video_id: v.id,
      youtube_url: v.youtube_url || v.video_url,
      title: v.title,
      duration_seconds: Number(v.duration_seconds || 0),
      coin_reward: Number(v.coin_reward ?? 0),
      views_count: Number(v.views_count ?? 0),
      target_views: Number(v.target_views ?? 0),
      status: v.status,
      user_id: v.user_id,
      completed: v.completed ?? false,
      total_watch_time: Number(v.total_watch_time ?? 0),
      completion_rate: Number(v.completion_rate ?? 0),
    }));

    console.log('🎬 Fallback video query returned:', fallbackMapped.length);
    return fallbackMapped;
  } catch (error) {
    console.error('getVideoQueue error:', error);
    throw error;
  }
}

// Create video promotion
export const createVideoPromotion = async (
  coinCost: number,
  coinReward: number,
  duration: number,
  targetViews: number,
  title: string,
  userId: string,
  youtubeUrl: string
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().rpc('create_video_promotion', {
    coin_cost_param: coinCost,
    coin_reward_param: coinReward,
    duration_seconds_param: duration,
    target_views_param: targetViews,
    title_param: title,
    user_uuid: userId,
    youtube_url_param: youtubeUrl
  });
  return { data, error };
};

// Repromote video
export const repromoteVideo = async (
  videoId: string,
  userId: string,
  additionalCost: number = 0
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().rpc('repromote_video', {
    video_uuid: videoId,
    user_uuid: userId,
    additional_coin_cost: additionalCost
  });
  return { data, error };
};

// Delete video
export const deleteVideo = async (
  videoId: string,
  userId: string
): Promise<{ data: any; error: any }> => {
  const { data, error } = await getSupabase().rpc('delete_video_with_refund', {
    video_uuid: videoId,
    user_uuid: userId
  });
  return { data, error };
};

// Get user comprehensive analytics
export const getUserComprehensiveAnalytics = async (userId: string) => {
  try {
    const { data, error } = await getSupabase().rpc('get_user_comprehensive_analytics', {
      user_uuid: userId
    });

    if (!error) {
      return { data, error: null };
    }

    console.warn('RPC get_user_comprehensive_analytics failed, using fallback:', error?.message);
    
    // Fallback: calculate analytics from videos table
    const { data: videos, error: videosError } = await getSupabase()
      .from('videos')
      .select('*')
      .eq('user_id', userId);

    if (videosError) {
      console.error('Fallback analytics query failed:', videosError);
      return { data: null, error: videosError };
    }

    const analytics = {
      total_videos_promoted: videos?.length || 0,
      active_videos: videos?.filter((v: any) => v.status === 'active').length || 0,
      completed_videos: videos?.filter((v: any) => v.status === 'completed').length || 0,
      on_hold_videos: videos?.filter((v: any) => v.status === 'on_hold').length || 0,
      total_views_received: videos?.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0) || 0,
      total_watch_time_received: videos?.reduce((sum: number, v: any) => sum + (v.total_watch_time || 0), 0) || 0,
      total_coins_distributed: videos?.reduce((sum: number, v: any) => sum + (v.coins_earned_total || 0), 0) || 0,
      average_completion_rate: videos?.length > 0 ? videos.reduce((sum: number, v: any) => sum + (v.completion_rate || 0), 0) / videos.length : 0,
      current_coins: 0, // Would need to fetch from profiles table
      total_coins_earned: videos?.reduce((sum: number, v: any) => sum + (v.coins_earned_total || 0), 0) || 0
    };

    return { data: analytics, error: null };
  } catch (err) {
    console.error('getUserComprehensiveAnalytics error:', err);
    return { data: null, error: err };
  }
};

// Get user videos with analytics
export const getUserVideosWithAnalytics = async (userId: string) => {
  try {
    const { data, error } = await getSupabase().rpc('get_user_videos_with_analytics', {
      user_uuid: userId
    });

    if (!error) {
      return { data, error: null };
    }

    console.warn('RPC get_user_videos_with_analytics failed, using fallback:', error?.message);
    
    // Fallback: fetch videos directly from videos table
    const { data: videos, error: videosError } = await getSupabase()
      .from('videos')
      .select(`
        id as video_id,
        title,
        views_count,
        target_views,
        status,
        created_at,
        coin_cost,
        completion_rate,
        completed,
        total_watch_time,
        coins_earned_total
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (videosError) {
      console.error('Fallback videos query failed:', videosError);
      return { data: null, error: videosError };
    }

    return { data: videos || [], error: null };
  } catch (err) {
    console.error('getUserVideosWithAnalytics error:', err);
    return { data: null, error: err };
  }
};

export const getUserRecentActivity = async (userId: string) => {
  const { data, error } = await getSupabase().rpc('get_user_recent_activity', {
    user_uuid: userId
  });
  return { data, error };
};

// Record coin purchase transaction
export const recordCoinPurchase = async (
  userId: string,
  packageId: string,
  coinsAmount: number,
  bonusCoins: number,
  pricePaid: number,
  transactionId: string,
  platform: string = 'unknown'
) => {
  try {
    const { data, error } = await getSupabase().rpc('record_coin_purchase', {
      user_uuid: userId,
      package_id: packageId,
      coins_amount: coinsAmount,
      bonus_coins: bonusCoins,
      price_paid: pricePaid,
      transaction_id: transactionId,
      purchase_platform: platform
    });

    if (error) {
      console.error('Error recording coin purchase:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('recordCoinPurchase error:', err);
    return { data: null, error: err };
  }
};

// Get user transaction history
export const getUserTransactionHistory = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await getSupabase()
      .from('coin_transactions')
      .select(`
        id,
        amount,
        transaction_type,
        description,
        reference_id,
        metadata,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transaction history:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('getUserTransactionHistory error:', err);
    return { data: null, error: err };
  }
};

// Validate runtime configuration structure
export const validateRuntimeConfig = (config: any): RuntimeConfig | null => {
  try {
    // Check if config has required structure
    if (!config || typeof config !== 'object') {
      console.warn('📱 Config validation failed: Invalid config object');
      return null;
    }

    // Check for required top-level fields
    const requiredFields = ['supabase', 'admob', 'features', 'app', 'security', 'metadata'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.warn('📱 Config validation failed: Missing required fields:', missingFields);
      return null;
    }

    // Validate basic structure first
    const hasAllRequiredFields = requiredFields.every(field => {
      const hasField = field in config;
      if (!hasField) {
        console.warn(`📱 Config validation failed: Missing required field: ${field}`);
      }
      return hasField;
    });

    if (!hasAllRequiredFields) {
      return null;
    }

    // Check if Supabase URL exists
    if (!config.supabase?.url) {
      console.warn('📱 Config validation failed: Missing Supabase URL');
      return null;
    }

    // Create validated config with all fields
    const validatedConfig = {
      supabase: {
        url: config.supabase.url,
        anonKey: config.supabase.anonKey || undefined
      },
      admob: config.admob || {},
      features: config.features || {},
      app: config.app || {},
      security: config.security || {},
      metadata: config.metadata || {}
    };

    // Try to initialize Supabase with the validated config
    if (!supabaseClient && initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      initializationAttempts++;
      const initialized = tryInitializeWithConfig(validatedConfig);
      if (initialized) {
        console.log('📱 Supabase initialized successfully with config');
      } else {
        console.warn(`📱 Supabase initialization attempt ${initializationAttempts} failed`);
      }
    }

    return validatedConfig;
  } catch (error) {
    console.error('📱 Config validation error:', error);
    return null;
  }
};

import SecurityService from '../services/SecurityService';
// Fetch runtime configuration from secure endpoint
export const fetchRuntimeConfig = async (): Promise<RuntimeConfig | null> => {
  try {
    console.log('📱 Fetching runtime config from secure endpoint');
    const deviceId = await SecurityService.getInstance().generateDeviceFingerprint();
    const clientId = process.env.EXPO_PUBLIC_MOBILE_CLIENT_ID || 'vidgro_mobile_2024';
    const clientSecret = process.env.EXPO_PUBLIC_MOBILE_CLIENT_SECRET || 'vidgro_secret_key_2024';

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/client-runtime-config/secure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        deviceId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📱 Server response received:', result);

    if (result.error) {
      throw new Error(result.error);
    }

    // Validate the config structure
    const validatedConfig = validateRuntimeConfig(result.data);
    if (validatedConfig) {
      return validatedConfig;
    }

    throw new Error('Invalid config structure in response data');
  } catch (error) {
    console.error('📱 Failed to fetch runtime config from secure endpoint:', error);

    // Fallback to public endpoint for backward compatibility (minimal data)
    try {
      console.log('📱 Falling back to public endpoint for minimal config');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/client-runtime-config`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📱 Public endpoint response (minimal config):', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Validate the public config structure
      const validatedConfig = validateRuntimeConfig(result.data);
      if (validatedConfig) {
        console.log('📱 Public endpoint config validated successfully');
        return validatedConfig;
      }

      throw new Error('Invalid config structure in public endpoint response');
    } catch (fallbackError) {
      console.error('📱 Both secure and public endpoints failed:', fallbackError);
      return null;
    }
  }
};
