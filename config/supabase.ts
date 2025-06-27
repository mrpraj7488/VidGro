import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrpmofbpimrddfmfvogs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycG1vZmJwaW1yZGRmbWZ2b2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzczODQsImV4cCI6MjA2NjYxMzM4NH0.jxg5TzvXy5O_YRpYoz-YCUjtnwQSMPhMLWUgEJDIB_c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Database types - Updated to handle both UUID and integer IDs
export interface User {
  id: string;
  email: string;
  coin_balance: number;
  is_vip: boolean;
  vip_expires_at?: string;
  ad_frequency: number;
  last_ad_shown?: string;
  stop_ads_until?: string;
  created_at: string;
  updated_at: string;
}

export interface PromotedVideo {
  id: string | number; // Support both UUID and integer IDs
  promoter_id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string;
  duration: number;
  views_requested: number;
  views_completed: number;
  cost_per_view: number;
  total_cost: number;
  coin_reward: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface WatchSession {
  id: number;
  user_id: string;
  video_id: string | number; // Support both UUID and integer IDs
  watch_duration: number;
  completion_percentage: number;
  coins_earned: number;
  completed: boolean;
  timestamp: string;
}

export interface CoinTransaction {
  id: number;
  user_id: string;
  transaction_type: 'earned' | 'spent' | 'purchased' | 'bonus';
  amount: number;
  description: string;
  reference_id?: number;
  timestamp: string;
}

export interface UserSettings {
  id: number;
  user_id: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  dark_mode: boolean;
  auto_play: boolean;
  ad_personalization: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: number;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed';
  bonus_coins: number;
  created_at: string;
  completed_at?: string;
}

export interface AdSession {
  id: number;
  user_id: string;
  ad_type: 'rewarded' | 'interstitial' | 'banner';
  coins_earned: number;
  duration: number;
  timestamp: string;
}