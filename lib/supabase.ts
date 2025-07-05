import { createClient } from '@supabase/supabase-js';

// Provide fallback values to prevent undefined errors during development
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Warn if environment variables are not set
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables are not set. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
    };
  };
};