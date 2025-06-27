/*
  # VidGro Database Schema Migration

  1. Database Schema Updates
    - Updated users table to use TEXT PRIMARY KEY for UUID compatibility
    - Updated all foreign key references to use TEXT instead of INTEGER
    - Maintained all existing functionality with proper UUID support

  2. Tables Updated
    - users: Changed id from INTEGER to TEXT for UUID support
    - promoted_videos: Updated promoter_id to TEXT
    - watch_sessions: Updated user_id and video_id references
    - ad_sessions: Updated user_id reference
    - coin_transactions: Updated user_id reference
    - user_settings: Updated user_id reference
    - referrals: Updated referrer_id and referred_id references

  3. Security
    - All existing indexes maintained
    - Foreign key constraints preserved
    - Default values and constraints maintained
*/

-- Users table with UUID support
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    coin_balance INTEGER DEFAULT 1000,
    is_vip BOOLEAN DEFAULT FALSE,
    vip_expires_at DATETIME NULL,
    ad_frequency INTEGER DEFAULT 3, -- Show ad every N videos
    last_ad_shown DATETIME NULL,
    stop_ads_until DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Promoted Videos table
CREATE TABLE IF NOT EXISTS promoted_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promoter_id TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    youtube_video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    views_requested INTEGER NOT NULL,
    views_completed INTEGER DEFAULT 0,
    cost_per_view REAL DEFAULT 1.2,
    total_cost REAL NOT NULL,
    coin_reward REAL DEFAULT 0.8, -- What viewers earn per view
    status TEXT DEFAULT 'active', -- active, paused, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promoter_id) REFERENCES users(id)
);

-- Watch Sessions table
CREATE TABLE IF NOT EXISTS watch_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    video_id INTEGER NOT NULL,
    watch_duration INTEGER NOT NULL, -- seconds watched
    completion_percentage REAL NOT NULL,
    coins_earned REAL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES promoted_videos(id)
);

-- Ad Sessions table
CREATE TABLE IF NOT EXISTS ad_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    ad_type TEXT NOT NULL, -- 'rewarded', 'interstitial'
    coins_earned INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 30, -- ad duration in seconds
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Coin Transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned', 'spent', 'purchased', 'bonus'
    amount INTEGER NOT NULL,
    description TEXT,
    reference_id INTEGER NULL, -- Reference to video_id, purchase_id, etc.
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    auto_play BOOLEAN DEFAULT TRUE,
    ad_personalization BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed
    bonus_coins INTEGER DEFAULT 500,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_promoted_videos_promoter ON promoted_videos(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoted_videos_status ON promoted_videos(status);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_user ON watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video ON watch_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);