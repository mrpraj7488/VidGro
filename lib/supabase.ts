import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic Supabase client that will be initialized with runtime config
let supabaseClient: any = null;
let isInitialized = false;

export const initializeSupabase = (url: string, anonKey: string) => {
  if (supabaseClient && isInitialized) {
    console.log('📱 Supabase already initialized');
    return supabaseClient;
  }

  console.log('📱 Initializing Supabase with runtime config');
  console.log('📱 Supabase URL:', url);
  console.log('📱 Anon Key length:', anonKey.length);

  try {
    supabaseClient = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
      global: {
        headers: {
          'X-Client-Info': 'vidgro-mobile',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    isInitialized = true;
    console.log('📱 Supabase client created successfully');
    
    // Test the connection
    testSupabaseConnection();
    
    return supabaseClient;
  } catch (error) {
    console.error('📱 Supabase initialization failed:', error);
    throw new Error(`Failed to initialize Supabase: ${error}`);
  }
};

const testSupabaseConnection = async () => {
  try {
    if (!supabaseClient) return;
    
    // Simple connection test
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.warn('📱 Supabase connection test warning:', error.message);
    } else {
      console.log('📱 Supabase connection test successful');
    }
  } catch (error) {
    console.warn('📱 Supabase connection test failed:', error);
  }
};

export const getSupabase = () => {
  if (!supabaseClient || !isInitialized) {
    throw new Error('Supabase not initialized. Call initializeSupabase first with runtime config.');
  }
  return supabaseClient;
};

// For backward compatibility, export as supabase with proper error handling
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!supabaseClient || !isInitialized) {
      throw new Error('Supabase not initialized. Ensure ConfigLoader has completed initialization.');
    }
    return supabaseClient[prop];
  }
});

// Enhanced video watching function with better error handling
export const watchVideo = async (userId: string, videoId: string, watchDuration: number, fullyWatched = false) => {
  try {
    if (!userId || !videoId) {
      throw new Error('Missing required parameters: userId or videoId');
    }

    console.log('📹 Calling watch_video_and_earn_coins:', {
      userId,
      videoId,
      watchDuration,
      fullyWatched
    });

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

    console.log('📹 Watch video result:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in watchVideo:', err);
    return { data: null, error: err };
  }
};

// Get user profile with enhanced error handling
export async function getUserProfile(userId: string) {
  if (!userId) {
    console.error('getUserProfile: userId is required');
    return null;
  }

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

    console.log('📱 User profile loaded successfully');
    return data;
  } catch (error) {
    console.error('Profile fetch failed:', error);
    return null;
  }
}

// Get video queue with enhanced error handling
export async function getVideoQueue(userId: string) {
  if (!userId) {
    throw new Error('getUserQueue: userId is required');
  }

  try {
    console.log('📹 Fetching video queue for user:', userId);
    
    const { data, error } = await getSupabase().rpc('get_video_queue_for_user', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error fetching video queue:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('📹 Video queue fetched:', data?.length || 0, 'videos');
    return data || [];
  } catch (error) {
    console.error('getVideoQueue error:', error);
    throw error;
  }
}

// Create video promotion with enhanced validation
export const createVideoPromotion = async (
  coinCost: number, 
  coinReward: number, 
  duration: number, 
  targetViews: number, 
  title: string, 
  userId: string, 
  youtubeUrl: string
) => {
  try {
    // Validate inputs
    if (!userId || !youtubeUrl || !title) {
      throw new Error('Missing required parameters');
    }

    if (coinCost <= 0 || coinReward <= 0 || duration <= 0 || targetViews <= 0) {
      throw new Error('Invalid numeric parameters');
    }

    console.log('📹 Creating video promotion:', {
      coinCost,
      coinReward,
      duration,
      targetViews,
      title: title.substring(0, 50) + '...',
      userId,
      youtubeUrl: youtubeUrl.substring(0, 50) + '...'
    });

    const { data, error } = await getSupabase().rpc('create_video_promotion', {
      coin_cost_param: coinCost,
      coin_reward_param: coinReward,
      duration_seconds_param: duration,
      target_views_param: targetViews,
      title_param: title,
      user_uuid: userId,
      youtube_url_param: youtubeUrl
    });

    if (error) {
      console.error('Error creating video promotion:', error);
      return { data: null, error };
    }

    console.log('📹 Video promotion created successfully');
    return { data, error: null };
  } catch (err) {
    console.error('createVideoPromotion error:', err);
    return { data: null, error: err };
  }
};

// Repromote video with enhanced validation
export const repromoteVideo = async (videoId: string, userId: string, additionalCost = 0) => {
  try {
    if (!videoId || !userId) {
      throw new Error('Missing required parameters: videoId or userId');
    }

    console.log('📹 Repromoting video:', { videoId, userId, additionalCost });

    const { data, error } = await getSupabase().rpc('repromote_video', {
      video_uuid: videoId,
      user_uuid: userId,
      additional_coin_cost: additionalCost
    });

    if (error) {
      console.error('Error repromoting video:', error);
      return { data: null, error };
    }

    console.log('📹 Video repromoted successfully');
    return { data, error: null };
  } catch (err) {
    console.error('repromoteVideo error:', err);
    return { data: null, error: err };
  }
};

// Delete video with enhanced validation
export const deleteVideo = async (videoId: string, userId: string) => {
  try {
    if (!videoId || !userId) {
      throw new Error('Missing required parameters: videoId or userId');
    }

    console.log('📹 Deleting video:', { videoId, userId });

    const { data, error } = await getSupabase().rpc('delete_video_with_refund', {
      video_uuid: videoId,
      user_uuid: userId
    });

    if (error) {
      console.error('Error deleting video:', error);
      return { data: null, error };
    }

    console.log('📹 Video deleted successfully');
    return { data, error: null };
  } catch (err) {
    console.error('deleteVideo error:', err);
    return { data: null, error: err };
  }
};

// Get user comprehensive analytics
export const getUserComprehensiveAnalytics = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('getUserComprehensiveAnalytics: userId is required');
    }

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
    if (!userId) {
      throw new Error('getUserVideosWithAnalytics: userId is required');
    }

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
  try {
    if (!userId) {
      throw new Error('getUserRecentActivity: userId is required');
    }

    const { data, error } = await getSupabase().rpc('get_user_recent_activity', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error fetching user recent activity:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('getUserRecentActivity error:', err);
    return { data: null, error: err };
  }
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
    if (!userId || !packageId || !transactionId) {
      throw new Error('Missing required parameters for coin purchase');
    }

    console.log('💰 Recording coin purchase:', {
      userId,
      packageId,
      coinsAmount,
      bonusCoins,
      pricePaid,
      transactionId,
      platform
    });

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

    console.log('💰 Coin purchase recorded successfully');
    return { data, error: null };
  } catch (err) {
    console.error('recordCoinPurchase error:', err);
    return { data: null, error: err };
  }
};

// Get user transaction history with pagination
export const getUserTransactionHistory = async (userId: string, limit: number = 50, offset: number = 0) => {
  try {
    if (!userId) {
      throw new Error('getUserTransactionHistory: userId is required');
    }

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
      .range(offset, offset + limit - 1);

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

// Health check function to verify Supabase connectivity
export const healthCheck = async (): Promise<boolean> => {
  try {
    if (!supabaseClient || !isInitialized) {
      return false;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .limit(1);

    return !error || error.code === 'PGRST116'; // PGRST116 is "no rows returned" which is fine
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
};

// Get initialization status
export const getInitializationStatus = () => {
  return {
    isInitialized,
    hasClient: supabaseClient !== null,
  };
};