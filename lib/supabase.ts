import { createClient } from '@supabase/supabase-js';

// Enhanced environment variable handling with proper fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Try multiple sources for environment variables
  const sources = [
    process.env?.[key],
    (global as any)?.importMetaEnv?.[key],
    (typeof window !== 'undefined' && (window as any).importMeta?.env?.[key]),
  ];
  
  const value = sources.find(v => v && typeof v === 'string') || fallback;
  
  if (!value && !fallback) {
    console.warn(`⚠️ Environment variable ${key} is not set`);
  }
  
  return value;
};

// Get environment variables with enhanced error handling
const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// Enhanced validation with better error messages
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error('❌ Missing Supabase environment variables:', missingVars.join(', '));
  console.error('📝 Please check your .env file and ensure these variables are set');
  
  // Provide more helpful error message
  throw new Error(
    `Missing Supabase configuration: ${missingVars.join(', ')}. ` +
    'Please check your .env file and restart the development server.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
}

// Enhanced Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    // Enhanced storage configuration
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'vidgro-app',
      'X-Client-Version': '1.0.0',
      'X-Platform': typeof window !== 'undefined' ? 'web' : 'mobile',
    }
  },
  // Enhanced database configuration
  db: {
    schema: 'public',
  },
  // Add custom fetch implementation for better compatibility
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });
  },
});

// Enhanced type definitions
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          coins: number;
          is_vip: boolean;
          vip_expires_at: string | null;
          referral_code: string;
          referred_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          coins?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          referral_code: string;
          referred_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          coins?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          youtube_url: string;
          title: string;
          description: string;
          duration_seconds: number;
          coin_cost: number;
          coin_reward: number;
          views_count: number;
          target_views: number;
          status: 'active' | 'paused' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_url: string;
          title: string;
          description?: string;
          duration_seconds: number;
          coin_cost: number;
          coin_reward: number;
          views_count?: number;
          target_views: number;
          status?: 'active' | 'paused' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          youtube_url?: string;
          title?: string;
          description?: string;
          duration_seconds?: number;
          coin_cost?: number;
          coin_reward?: number;
          views_count?: number;
          target_views?: number;
          status?: 'active' | 'paused' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };
      video_views: {
        Row: {
          id: string;
          video_id: string;
          viewer_id: string;
          watched_duration: number;
          completed: boolean;
          coins_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          viewer_id: string;
          watched_duration: number;
          completed: boolean;
          coins_earned: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          viewer_id?: string;
          watched_duration?: number;
          completed?: boolean;
          coins_earned?: number;
          created_at?: string;
        };
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type: 'video_watch' | 'video_promotion' | 'purchase' | 'referral_bonus' | 'admin_adjustment' | 'vip_purchase' | 'ad_stop_purchase';
          description: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type: 'video_watch' | 'video_promotion' | 'purchase' | 'referral_bonus' | 'admin_adjustment' | 'vip_purchase' | 'ad_stop_purchase';
          description: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          transaction_type?: 'video_watch' | 'video_promotion' | 'purchase' | 'referral_bonus' | 'admin_adjustment' | 'vip_purchase' | 'ad_stop_purchase';
          description?: string;
          reference_id?: string | null;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          ad_frequency: number;
          auto_play: boolean;
          notifications_enabled: boolean;
          language: string;
          ad_stop_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_frequency?: number;
          auto_play?: boolean;
          notifications_enabled?: boolean;
          language?: string;
          ad_stop_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_frequency?: number;
          auto_play?: boolean;
          notifications_enabled?: boolean;
          language?: string;
          ad_stop_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      update_user_coins: {
        Args: {
          user_uuid: string;
          coin_amount: number;
          transaction_type_param: 'video_watch' | 'video_promotion' | 'purchase' | 'referral_bonus' | 'admin_adjustment' | 'vip_purchase' | 'ad_stop_purchase';
          description_param: string;
          reference_uuid?: string;
        };
        Returns: boolean;
      };
      can_user_watch_video: {
        Args: {
          user_uuid: string;
          video_uuid: string;
        };
        Returns: boolean;
      };
      get_filtered_recent_activities: {
        Args: {
          user_uuid: string;
          activity_limit?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type: string;
          description: string;
          reference_id: string | null;
          created_at: string;
        }[];
      };
      get_next_video_for_user: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          video_id: string;
          youtube_url: string;
          title: string;
          duration_seconds: number;
          coin_reward: number;
        }[];
      };
      complete_video_view: {
        Args: {
          user_uuid: string;
          video_uuid: string;
          watch_duration: number;
        };
        Returns: boolean;
      };
      get_user_recent_activities: {
        Args: {
          user_uuid: string;
          limit_count?: number;
        };
        Returns: any; // JSON
      };
      get_user_analytics_summary: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          total_videos_promoted: number;
          total_coins_earned: number;
          total_coins_spent: number;
          total_views_received: number;
          total_watch_time: number;
          average_engagement_rate: number;
          active_videos: number;
          completed_videos: number;
          on_hold_videos: number;
        }[];
      };
      release_videos_from_hold: {
        Args: {};
        Returns: number;
      };
    };
  };
};

// Test connection on initialization (development only)
if (process.env?.NODE_ENV === 'development') {
  supabase.from('profiles').select('count').limit(1).then(
    ({ error }) => {
      if (error) {
        console.warn('⚠️ Supabase connection test failed:', error.message);
      } else {
        console.log('✅ Supabase connection established successfully');
      }
    }
  ).catch((error) => {
    console.warn('⚠️ Supabase connection test error:', error.message);
  });
}