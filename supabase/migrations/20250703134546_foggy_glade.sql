-- =============================================
-- VidGro Database Clean Setup Script
-- This script safely sets up the database, handling existing objects
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLEAN UP EXISTING OBJECTS (IF NEEDED)
-- =============================================

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read public profiles" ON users;
DROP POLICY IF EXISTS "Users can view active videos" ON videos;
DROP POLICY IF EXISTS "Users can create videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Users can read own views" ON video_views;
DROP POLICY IF EXISTS "Video owners can read their video views" ON video_views;
DROP POLICY IF EXISTS "Users can create views" ON video_views;
DROP POLICY IF EXISTS "Users can read own transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can create settings" ON user_settings;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_user_coins(uuid, integer, transaction_type, text, uuid);
DROP FUNCTION IF EXISTS can_user_watch_video(uuid, uuid);
DROP FUNCTION IF EXISTS get_next_video_for_user(uuid);
DROP FUNCTION IF EXISTS complete_video_view(uuid, uuid, integer);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =============================================
-- CREATE CUSTOM TYPES
-- =============================================

-- Create video_status enum (drop first if exists)
DROP TYPE IF EXISTS video_status CASCADE;
CREATE TYPE video_status AS ENUM ('active', 'paused', 'completed');

-- Create transaction_type enum (drop first if exists)
DROP TYPE IF EXISTS transaction_type CASCADE;
CREATE TYPE transaction_type AS ENUM (
  'video_watch',
  'video_promotion', 
  'purchase',
  'referral_bonus',
  'admin_adjustment',
  'vip_purchase',
  'ad_stop_purchase'
);

-- =============================================
-- CREATE TABLES
-- =============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  coins integer DEFAULT 100 NOT NULL CHECK (coins >= 0),
  is_vip boolean DEFAULT false NOT NULL,
  vip_expires_at timestamptz,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Videos table (promoted videos)
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status video_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Video views table (tracking who watched what)
CREATE TABLE IF NOT EXISTS video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL CHECK (coins_earned >= 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add unique constraint for video_views if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'video_views_video_id_viewer_id_key'
  ) THEN
    ALTER TABLE video_views ADD CONSTRAINT video_views_video_id_viewer_id_key UNIQUE(video_id, viewer_id);
  END IF;
END $$;

-- Coin transactions table (all coin movements)
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type transaction_type NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- User settings table (preferences and configurations)
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ad_frequency integer DEFAULT 5 NOT NULL CHECK (ad_frequency >= 1 AND ad_frequency <= 20),
  auto_play boolean DEFAULT true NOT NULL,
  notifications_enabled boolean DEFAULT true NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  ad_stop_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add unique constraint for user_settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_settings_user_id_key'
  ) THEN
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE(user_id);
  END IF;
END $$;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Videos table indexes
CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON videos(status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status_views ON videos(status, views_count, target_views);

-- Video views table indexes
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_id ON video_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON video_views(created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_completed ON video_views(completed);

-- Coin transactions table indexes
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference ON coin_transactions(reference_id);

-- User settings table indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =============================================
-- CREATE FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  max_attempts integer := 10;
  attempt_count integer := 0;
  new_username text;
BEGIN
  -- Generate a unique referral code with retry logic
  LOOP
    new_referral_code := upper(substring(md5(random()::text || NEW.id::text || now()::text) from 1 for 8));
    
    -- Check if this referral code already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = new_referral_code) THEN
      EXIT; -- Found a unique code, exit loop
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      -- Fallback to a timestamp-based code if we can't find a unique random one
      new_referral_code := upper(substring(md5(NEW.id::text || extract(epoch from now())::text) from 1 for 8));
      EXIT;
    END IF;
  END LOOP;

  -- Prepare username
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );

  -- Insert user with proper error handling
  BEGIN
    INSERT INTO users (
      id, 
      email, 
      username, 
      referral_code
    ) VALUES (
      NEW.id,
      NEW.email,
      new_username,
      new_referral_code
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle username conflicts by appending a timestamp
      INSERT INTO users (
        id, 
        email, 
        username, 
        referral_code
      ) VALUES (
        NEW.id,
        NEW.email,
        new_username || '_' || extract(epoch from now())::integer::text,
        new_referral_code
      );
  END;
  
  -- Create default user settings
  BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail the entire transaction
      RAISE WARNING 'Failed to create user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely update user coins
CREATE OR REPLACE FUNCTION update_user_coins(
  user_uuid uuid,
  coin_amount integer,
  transaction_type_param transaction_type,
  description_param text,
  reference_uuid uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_coins integer;
BEGIN
  -- Get current coin balance with row lock
  SELECT coins INTO current_coins
  FROM users
  WHERE id = user_uuid
  FOR UPDATE;
  
  -- Check if user exists
  IF current_coins IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has enough coins for negative transactions
  IF coin_amount < 0 AND current_coins + coin_amount < 0 THEN
    RETURN false;
  END IF;
  
  -- Update user coins
  UPDATE users
  SET coins = coins + coin_amount,
      updated_at = now()
  WHERE id = user_uuid;
  
  -- Record transaction
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    user_uuid,
    coin_amount,
    transaction_type_param,
    description_param,
    reference_uuid
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can watch a video
CREATE OR REPLACE FUNCTION can_user_watch_video(
  user_uuid uuid,
  video_uuid uuid
)
RETURNS boolean AS $$
DECLARE
  video_owner uuid;
  video_active boolean;
  already_watched boolean;
BEGIN
  -- Get video details
  SELECT 
    user_id, 
    (status = 'active' AND views_count < target_views)
  INTO video_owner, video_active
  FROM videos
  WHERE id = video_uuid;
  
  -- Check if video exists and is active
  IF video_owner IS NULL OR NOT video_active THEN
    RETURN false;
  END IF;
  
  -- Users cannot watch their own videos
  IF video_owner = user_uuid THEN
    RETURN false;
  END IF;
  
  -- Check if user already watched this video
  SELECT EXISTS(
    SELECT 1 FROM video_views
    WHERE video_id = video_uuid AND viewer_id = user_uuid
  ) INTO already_watched;
  
  RETURN NOT already_watched;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next video for user
CREATE OR REPLACE FUNCTION get_next_video_for_user(user_uuid uuid)
RETURNS TABLE(
  video_id uuid,
  youtube_url text,
  title text,
  duration_seconds integer,
  coin_reward integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.youtube_url,
    v.title,
    v.duration_seconds,
    v.coin_reward
  FROM videos v
  WHERE v.status = 'active'
    AND v.views_count < v.target_views
    AND v.user_id != user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM video_views vv
      WHERE vv.video_id = v.id AND vv.viewer_id = user_uuid
    )
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete video view and award coins
CREATE OR REPLACE FUNCTION complete_video_view(
  user_uuid uuid,
  video_uuid uuid,
  watch_duration integer
)
RETURNS boolean AS $$
DECLARE
  video_reward integer;
  video_duration integer;
  video_owner uuid;
  is_completed boolean;
BEGIN
  -- Get video details
  SELECT coin_reward, duration_seconds, user_id
  INTO video_reward, video_duration, video_owner
  FROM videos
  WHERE id = video_uuid AND status = 'active';
  
  -- Check if video exists
  IF video_reward IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user can watch this video
  IF NOT can_user_watch_video(user_uuid, video_uuid) THEN
    RETURN false;
  END IF;
  
  -- Determine if video was completed (watched at least 80% or full duration)
  is_completed := watch_duration >= LEAST(video_duration, video_duration * 0.8);
  
  -- Insert view record
  INSERT INTO video_views (
    video_id,
    viewer_id,
    watched_duration,
    completed,
    coins_earned
  ) VALUES (
    video_uuid,
    user_uuid,
    watch_duration,
    is_completed,
    CASE WHEN is_completed THEN video_reward ELSE 0 END
  );
  
  -- Award coins if completed
  IF is_completed THEN
    PERFORM update_user_coins(
      user_uuid,
      video_reward,
      'video_watch',
      'Watched video: ' || (SELECT title FROM videos WHERE id = video_uuid),
      video_uuid
    );
  END IF;
  
  -- Update video view count if completed
  IF is_completed THEN
    UPDATE videos
    SET views_count = views_count + 1,
        updated_at = now()
    WHERE id = video_uuid;
    
    -- Check if video reached target views
    UPDATE videos
    SET status = 'completed',
        updated_at = now()
    WHERE id = video_uuid AND views_count >= target_views;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Users table policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read public profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Videos table policies
CREATE POLICY "Users can view active videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own videos"
  ON videos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Video views table policies
CREATE POLICY "Users can read own views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (viewer_id = auth.uid());

CREATE POLICY "Video owners can read their video views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create views"
  ON video_views
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Coin transactions table policies
CREATE POLICY "Users can read own transactions"
  ON coin_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON coin_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User settings table policies
CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '🎉 VidGro database setup completed successfully!';
  RAISE NOTICE '📊 Created tables: users, videos, video_views, coin_transactions, user_settings';
  RAISE NOTICE '⚙️  Created functions: handle_new_user, update_user_coins, can_user_watch_video, get_next_video_for_user, complete_video_view';
  RAISE NOTICE '🔒 Enabled Row Level Security with appropriate policies';
  RAISE NOTICE '🚀 Added performance indexes';
  RAISE NOTICE '✅ Your database is ready for the VidGro app!';
END $$;