-- VidGro Database Setup Script
-- Run this in your Supabase SQL Editor

-- Create profiles table (main user data)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  coins integer DEFAULT 100 NOT NULL CHECK (coins >= 0),
  is_vip boolean DEFAULT false NOT NULL,
  vip_expires_at timestamptz,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create video_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL CHECK (coins_earned >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(video_id, viewer_id)
);

-- Create coin_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('video_watch', 'video_promotion', 'purchase', 'referral_bonus', 'admin_adjustment', 'vip_purchase', 'ad_stop_purchase')),
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for videos
CREATE POLICY "Users can view active videos" ON videos
  FOR SELECT USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create videos" ON videos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for video_views
CREATE POLICY "Users can read own views" ON video_views
  FOR SELECT USING (viewer_id = auth.uid());

CREATE POLICY "Video owners can read their video views" ON video_views
  FOR SELECT USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()));

CREATE POLICY "Users can create views" ON video_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- Create RLS policies for coin_transactions
CREATE POLICY "Users can read own transactions" ON coin_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions" ON coin_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  new_username text;
BEGIN
  -- Generate a unique referral code
  new_referral_code := upper(substring(md5(random()::text || NEW.id::text || now()::text) from 1 for 8));
  
  -- Prepare username
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );

  -- Insert user profile
  INSERT INTO profiles (
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
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle username conflicts by appending a timestamp
    INSERT INTO profiles (
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON videos(status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_id ON video_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'VidGro database setup completed successfully!';
  RAISE NOTICE 'Created tables: profiles, videos, video_views, coin_transactions';
  RAISE NOTICE 'Enabled Row Level Security with appropriate policies';
  RAISE NOTICE 'Your database is ready for the VidGro app!';
END $$;