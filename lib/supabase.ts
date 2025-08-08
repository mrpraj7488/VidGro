import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from '../contexts/ConfigContext';

// Dynamic Supabase client that will be initialized with runtime config
let supabaseClient: any = null;

export const initializeSupabase = (url: string, anonKey: string) => {
  if (supabaseClient) {
    console.log('📱 Supabase already initialized');
    return supabaseClient;
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
    throw new Error('Supabase not initialized. Call initializeSupabase first.');
  }
  return supabaseClient;
};

// For backward compatibility, export as supabase
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabase();
    return client[prop];
  }
});

// Remove old awardCoinsForVideo function and replace with new watchVideo
export const watchVideo = async (userId, videoId, watchDuration, fullyWatched = false) => {
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
export async function getUserProfile(userId: string) {
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
export async function getVideoQueue(userId: string) {
  if (!userId) return null;

  try {
    const { data, error } = await getSupabase().rpc('get_video_queue_for_user', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error fetching video queue:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getVideoQueue error:', error);
    throw error;
  }
}

// Create video promotion
export const createVideoPromotion = async (coinCost, coinReward, duration, targetViews, title, userId, youtubeUrl) => {
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
export const repromoteVideo = async (videoId, userId, additionalCost = 0) => {
  const { data, error } = await getSupabase().rpc('repromote_video', {
    video_uuid: videoId,
    user_uuid: userId,
    additional_coin_cost: additionalCost
  });
  return { data, error };
};

// Delete video
export const deleteVideo = async (videoId, userId) => {
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

    if (error) {
      console.error('Error fetching user analytics:', error);
      return { data: null, error };
    }

    return { data, error: null };
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

    if (error) {
      console.error('Error fetching user videos:', error);
      return { data: null, error };
    }

    return { data, error: null };
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