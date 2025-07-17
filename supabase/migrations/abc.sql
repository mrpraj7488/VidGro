/*
  # FIXED VidGro Database Setup - User Creation Issue Resolved
  
  This migration fixes the "relation profiles does not exist" error by:
  1. Ensuring tables are created in the correct schema (public)
  2. Adding proper error handling and validation
  3. Creating a more robust user creation trigger
  4. Adding comprehensive logging for debugging
  5. Fixing RLS policies for trigger functions
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENSURE TABLES EXIST IN PUBLIC SCHEMA
-- =============================================

-- Drop existing trigger first to avoid conflicts during table creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Profiles table (main user data) - EXPLICITLY in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  coins integer DEFAULT 100 NOT NULL CHECK (coins >= 0),
  is_vip boolean DEFAULT false NOT NULL,
  vip_expires_at timestamptz,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Videos table (promoted videos with enhanced features)
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'on_hold', 'repromoted')),
  hold_until timestamptz,
  total_watch_time integer DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0.0,
  completion_rate decimal(5,2) DEFAULT 0.0,
  average_watch_time decimal(8,2) DEFAULT 0.0,
  repromoted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Video views table (tracking who watched what)
CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL CHECK (coins_earned >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(video_id, viewer_id)
);

-- Coin transactions table (all coin movements)
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('video_watch', 'video_promotion', 'purchase', 'referral_bonus', 'admin_adjustment', 'vip_purchase', 'ad_stop_purchase')),
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- User settings table (preferences and configurations)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ad_frequency integer DEFAULT 5 NOT NULL CHECK (ad_frequency >= 1 AND ad_frequency <= 20),
  auto_play boolean DEFAULT true NOT NULL,
  notifications_enabled boolean DEFAULT true NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  ad_stop_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- =============================================
-- VERIFY TABLES EXIST
-- =============================================

DO $$
DECLARE
  table_count integer;
BEGIN
  -- Check if all required tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'videos', 'video_views', 'coin_transactions', 'user_settings');
  
  IF table_count < 5 THEN
    RAISE EXCEPTION 'Not all required tables were created. Found % tables, expected 5', table_count;
  END IF;
  
  RAISE NOTICE '✅ All % required tables verified in public schema', table_count;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_vip_status ON public.profiles(is_vip, vip_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_coins_update ON public.profiles(id, coins, updated_at);

-- Videos table indexes
CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON public.videos(status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status_views ON public.videos(status, views_count, target_views);
CREATE INDEX IF NOT EXISTS idx_videos_hold_status ON public.videos(status, hold_until) WHERE status = 'on_hold';
CREATE INDEX IF NOT EXISTS idx_videos_engagement ON public.videos(engagement_rate, completion_rate);
CREATE INDEX IF NOT EXISTS idx_videos_user_status ON public.videos(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_queue_management ON public.videos(status, views_count, target_views, updated_at, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_videos_active_views ON public.videos(status, views_count, target_views) WHERE status = 'active';

-- Video views table indexes
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_id ON public.video_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON public.video_views(created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_completed ON public.video_views(completed);
CREATE INDEX IF NOT EXISTS idx_video_views_analytics ON public.video_views(video_id, completed, coins_earned);
CREATE INDEX IF NOT EXISTS idx_video_views_realtime ON public.video_views(video_id, viewer_id, completed, coins_earned, created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_realtime_analytics ON public.video_views(video_id, completed, created_at);

-- Coin transactions table indexes
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON public.coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON public.coin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference ON public.coin_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_type ON public.coin_transactions(user_id, transaction_type, created_at);

-- User settings table indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- FIXED: Robust function to handle new user registration with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  max_attempts integer := 10;
  attempt_count integer := 0;
  new_username text;
  final_username text;
  username_suffix integer := 1;
  profiles_exists boolean;
BEGIN
  -- Log the start of user creation for debugging
  RAISE LOG 'Starting user profile creation for user ID: %', NEW.id;
  
  -- CRITICAL: Verify that profiles table exists before proceeding
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  IF NOT profiles_exists THEN
    RAISE EXCEPTION 'CRITICAL: profiles table does not exist in public schema. Migration may have failed.';
  END IF;
  
  RAISE LOG 'Profiles table verified to exist in public schema';
  
  -- Generate a unique referral code with retry logic
  LOOP
    new_referral_code := upper(substring(md5(random()::text || NEW.id::text || now()::text) from 1 for 8));
    
    -- Check if this referral code already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) THEN
      EXIT; -- Found a unique code, exit loop
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      -- Fallback to a timestamp-based code if we can't find a unique random one
      new_referral_code := upper(substring(md5(NEW.id::text || extract(epoch from now())::text) from 1 for 8));
      EXIT;
    END IF;
  END LOOP;

  -- Prepare username with better fallback handling
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Ensure username is not empty and has reasonable length
  IF new_username IS NULL OR length(trim(new_username)) = 0 THEN
    new_username := 'user';
  END IF;
  
  -- Truncate username if too long
  IF length(new_username) > 50 THEN
    new_username := substring(new_username from 1 for 50);
  END IF;
  
  final_username := new_username;

  -- Insert user profile with comprehensive error handling
  BEGIN
    -- First attempt with original username
    INSERT INTO public.profiles (
      id, 
      email, 
      username, 
      referral_code,
      coins,
      is_vip,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      final_username,
      new_referral_code,
      100, -- Default starting coins
      false, -- Default VIP status
      now(),
      now()
    );
    
    RAISE LOG 'Successfully created profile for user: % with username: %', NEW.id, final_username;
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle username conflicts by trying with suffixes
      LOOP
        final_username := new_username || '_' || username_suffix::text;
        
        BEGIN
          INSERT INTO public.profiles (
            id, 
            email, 
            username, 
            referral_code,
            coins,
            is_vip,
            created_at,
            updated_at
          ) VALUES (
            NEW.id,
            NEW.email,
            final_username,
            new_referral_code,
            100,
            false,
            now(),
            now()
          );
          
          RAISE LOG 'Successfully created profile for user: % with username: % (attempt %)', NEW.id, final_username, username_suffix;
          EXIT; -- Success, exit the loop
          
        EXCEPTION
          WHEN unique_violation THEN
            username_suffix := username_suffix + 1;
            IF username_suffix > 100 THEN
              -- Final fallback with timestamp
              final_username := 'user_' || extract(epoch from now())::integer::text;
              INSERT INTO public.profiles (
                id, 
                email, 
                username, 
                referral_code,
                coins,
                is_vip,
                created_at,
                updated_at
              ) VALUES (
                NEW.id,
                NEW.email,
                final_username,
                new_referral_code,
                100,
                false,
                now(),
                now()
              );
              RAISE LOG 'Created profile with timestamp username for user: %', NEW.id;
              EXIT;
            END IF;
        END;
      END LOOP;
      
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  -- Create default user settings with error handling
  BEGIN
    INSERT INTO public.user_settings (
      user_id,
      ad_frequency,
      auto_play,
      notifications_enabled,
      language,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      5, -- Default ad frequency
      true, -- Default auto play
      true, -- Default notifications
      'en', -- Default language
      now(),
      now()
    );
    
    RAISE LOG 'Successfully created user settings for user: %', NEW.id;
    
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail the entire transaction
      RAISE WARNING 'Failed to create user settings for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RAISE LOG 'User profile creation completed successfully for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with full context and re-raise it
    RAISE EXCEPTION 'Critical error in handle_new_user() for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to safely update user coins
CREATE OR REPLACE FUNCTION public.update_user_coins(
  user_uuid uuid,
  coin_amount integer,
  transaction_type_param text,
  description_param text,
  reference_uuid uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_coins integer;
  new_balance integer;
  rows_affected integer;
BEGIN
  -- Get current coin balance with row lock for consistency
  SELECT coins INTO current_coins
  FROM public.profiles
  WHERE id = user_uuid
  FOR UPDATE;
  
  -- Check if user exists
  IF current_coins IS NULL THEN
    RAISE WARNING 'User % not found for coin update', user_uuid;
    RETURN false;
  END IF;
  
  -- Check if user has enough coins for negative transactions
  IF coin_amount < 0 AND current_coins + coin_amount < 0 THEN
    RAISE WARNING 'Insufficient coins for user %: current=%, requested=%', user_uuid, current_coins, coin_amount;
    RETURN false;
  END IF;
  
  -- Calculate new balance
  new_balance := current_coins + coin_amount;
  
  -- Update user coins
  UPDATE public.profiles
  SET coins = new_balance,
      updated_at = now()
  WHERE id = user_uuid;
  
  -- Check if update was successful using ROW_COUNT
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RAISE WARNING 'Failed to update coins for user %', user_uuid;
    RETURN false;
  END IF;
  
  -- Record transaction
  BEGIN
    INSERT INTO public.coin_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      reference_id,
      created_at
    ) VALUES (
      user_uuid,
      coin_amount,
      transaction_type_param,
      description_param,
      reference_uuid,
      now()
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to record transaction for user %: %', user_uuid, SQLERRM;
      -- Don't return false here as the coin update was successful
  END;
  
  -- Log the successful update for debugging
  RAISE NOTICE 'Coins updated for user %: % -> % (change: %)', 
    user_uuid, current_coins, new_balance, coin_amount;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can watch a video
CREATE OR REPLACE FUNCTION public.can_user_watch_video(
  user_uuid uuid,
  video_uuid uuid
)
RETURNS boolean AS $$
DECLARE
  video_owner uuid;
  video_active boolean;
  already_watched boolean;
BEGIN
  -- Get video details including view limits
  SELECT 
    user_id, 
    (status = 'active' AND views_count < target_views)
  INTO video_owner, video_active
  FROM public.videos
  WHERE id = video_uuid;
  
  -- Check if video exists and is active with remaining views
  IF video_owner IS NULL OR NOT video_active THEN
    RETURN false;
  END IF;
  
  -- Users cannot watch their own videos
  IF video_owner = user_uuid THEN
    RETURN false;
  END IF;
  
  -- Check if user already watched this video
  SELECT EXISTS(
    SELECT 1 FROM public.video_views
    WHERE video_id = video_uuid AND viewer_id = user_uuid
  ) INTO already_watched;
  
  RETURN NOT already_watched;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to calculate coins based on exact duration mapping
CREATE OR REPLACE FUNCTION public.calculate_coins_by_duration_v2(duration_seconds integer)
RETURNS integer AS $$
BEGIN
  -- Exact duration-to-coin mapping as specified
  CASE 
    WHEN duration_seconds >= 540 THEN RETURN 200;  -- 540s = 200 coins
    WHEN duration_seconds >= 480 THEN RETURN 150;  -- 480s = 150 coins
    WHEN duration_seconds >= 420 THEN RETURN 130;  -- 420s = 130 coins
    WHEN duration_seconds >= 360 THEN RETURN 100;  -- 360s = 100 coins
    WHEN duration_seconds >= 300 THEN RETURN 90;   -- 300s = 90 coins
    WHEN duration_seconds >= 240 THEN RETURN 70;   -- 240s = 70 coins
    WHEN duration_seconds >= 180 THEN RETURN 55;   -- 180s = 55 coins
    WHEN duration_seconds >= 150 THEN RETURN 50;   -- 150s = 50 coins
    WHEN duration_seconds >= 120 THEN RETURN 45;   -- 120s = 45 coins
    WHEN duration_seconds >= 90 THEN RETURN 35;    -- 90s = 35 coins
    WHEN duration_seconds >= 60 THEN RETURN 25;    -- 60s = 25 coins
    WHEN duration_seconds >= 45 THEN RETURN 15;    -- 45s = 15 coins
    WHEN duration_seconds >= 30 THEN RETURN 10;    -- 30s = 10 coins
    ELSE RETURN 5;  -- Default for very short durations
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to complete video view with proper coin calculation and real-time updates
CREATE OR REPLACE FUNCTION public.enhanced_complete_video_view_v2(
  user_uuid uuid,
  video_uuid uuid,
  watch_duration integer
)
RETURNS json AS $$
DECLARE
  video_record RECORD;
  calculated_coins integer;
  is_completed boolean;
  new_view_count integer;
  target_views_count integer;
  video_completed boolean := false;
  current_time_val timestamptz;
  old_coin_balance integer;
  new_coin_balance integer;
  coin_update_success boolean := false;
BEGIN
  current_time_val := now();
  
  -- Get complete video details with row lock to prevent race conditions
  SELECT 
    v.id,
    v.user_id,
    v.title,
    v.duration_seconds,
    v.coin_reward,
    v.target_views,
    v.views_count,
    v.status
  INTO video_record
  FROM public.videos v
  WHERE v.id = video_uuid AND v.status = 'active'
  FOR UPDATE;
  
  -- Check if video exists and is still active
  IF video_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Video not found or not active',
      'coins_earned', 0,
      'view_added', false,
      'video_completed', false
    );
  END IF;
  
  -- Initialize variables from video_record
  target_views_count := video_record.target_views;
  new_view_count := video_record.views_count;
  
  -- Check if video has already reached its target views
  IF video_record.views_count >= target_views_count THEN
    -- Mark video as completed
    UPDATE public.videos
    SET status = 'completed',
        updated_at = current_time_val
    WHERE id = video_uuid;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Video has reached target views',
      'coins_earned', 0,
      'view_added', false,
      'video_completed', true,
      'should_skip', true
    );
  END IF;
  
  -- Check if user can watch this video
  IF NOT public.can_user_watch_video(user_uuid, video_uuid) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User cannot watch this video',
      'coins_earned', 0,
      'view_added', false,
      'video_completed', false
    );
  END IF;
  
  -- Get current coin balance before transaction
  SELECT coins INTO old_coin_balance
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Initialize new_coin_balance
  new_coin_balance := old_coin_balance;
  
  -- Determine if video was completed (watched full selected duration)
  is_completed := watch_duration >= video_record.duration_seconds;
  
  -- Calculate coins based on duration mapping
  calculated_coins := CASE 
    WHEN is_completed THEN public.calculate_coins_by_duration_v2(video_record.duration_seconds)
    ELSE 0 
  END;
  
  -- Insert view record FIRST
  INSERT INTO public.video_views (
    video_id,
    viewer_id,
    watched_duration,
    completed,
    coins_earned,
    created_at
  ) VALUES (
    video_uuid,
    user_uuid,
    watch_duration,
    is_completed,
    calculated_coins,
    current_time_val
  );
  
  -- Update video view count IMMEDIATELY if completed
  IF is_completed THEN
    UPDATE public.videos
    SET views_count = views_count + 1,
        updated_at = current_time_val
    WHERE id = video_uuid;
    
    -- Get the updated view count
    SELECT views_count INTO new_view_count
    FROM public.videos
    WHERE id = video_uuid;
    
    -- Check if video reached target views and mark as completed
    IF new_view_count >= target_views_count THEN
      UPDATE public.videos
      SET status = 'completed',
          updated_at = current_time_val
      WHERE id = video_uuid;
      
      video_completed := true;
    END IF;
    
    -- Update video engagement metrics immediately
    PERFORM public.update_video_engagement(video_uuid);
  END IF;
  
  -- Award coins if completed with GUARANTEED balance update
  IF is_completed AND calculated_coins > 0 THEN
    -- Update user coins with proper transaction logging
    SELECT public.update_user_coins(
      user_uuid,
      calculated_coins,
      'video_watch',
      format('Watched %ss video: %s (%s coins)', video_record.duration_seconds, video_record.title, calculated_coins),
      video_uuid
    ) INTO coin_update_success;
    
    -- Get new coin balance to verify update
    IF coin_update_success THEN
      SELECT coins INTO new_coin_balance
      FROM public.profiles
      WHERE id = user_uuid;
      
      -- FORCE immediate profile refresh by updating timestamp
      UPDATE public.profiles
      SET updated_at = current_time_val
      WHERE id = user_uuid;
    END IF;
  END IF;
  
  -- Return comprehensive result with GUARANTEED updated data
  RETURN json_build_object(
    'success', true,
    'coins_earned', calculated_coins,
    'view_added', is_completed,
    'new_view_count', new_view_count,
    'target_views', target_views_count,
    'video_completed', video_completed,
    'should_skip', video_completed,
    'watch_duration', watch_duration,
    'required_duration', video_record.duration_seconds,
    'calculated_coins', calculated_coins,
    'old_coin_balance', old_coin_balance,
    'new_coin_balance', new_coin_balance,
    'coin_balance_updated', coin_update_success AND (new_coin_balance != old_coin_balance),
    'coin_update_success', coin_update_success,
    'video_owner_id', video_record.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get next video for user (improved queue management)
CREATE OR REPLACE FUNCTION public.get_next_video_for_user_enhanced(user_uuid uuid)
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
    public.calculate_coins_by_duration_v2(v.duration_seconds) as coin_reward -- Use calculated coins
  FROM public.videos v
  WHERE v.status = 'active'
    AND v.views_count < v.target_views  -- Only videos that haven't reached target
    AND v.user_id != user_uuid          -- Can't watch own videos
    AND NOT EXISTS (
      SELECT 1 FROM public.video_views vv
      WHERE vv.video_id = v.id AND vv.viewer_id = user_uuid
    )
  ORDER BY v.updated_at DESC, v.created_at DESC
  LIMIT 10; -- Return multiple videos for better queue management
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to create video with 10-minute hold
CREATE OR REPLACE FUNCTION public.create_video_with_hold(
  user_uuid uuid,
  youtube_url_param text,
  title_param text,
  description_param text,
  duration_seconds_param integer,
  coin_cost_param integer,
  coin_reward_param integer,
  target_views_param integer
)
RETURNS uuid AS $$
DECLARE
  new_video_id uuid;
  hold_until_time timestamptz;
  current_time_val timestamptz;
BEGIN
  -- Get current time for consistent calculation
  current_time_val := now();
  
  -- Calculate hold time (exactly 10 minutes from current time)
  hold_until_time := current_time_val + interval '10 minutes';
  
  -- Insert video with on_hold status and proper hold_until timestamp
  INSERT INTO public.videos (
    user_id,
    youtube_url,
    title,
    description,
    duration_seconds,
    coin_cost,
    coin_reward,
    target_views,
    status,
    hold_until,
    views_count,
    total_watch_time,
    engagement_rate,
    completion_rate,
    average_watch_time,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    youtube_url_param,
    title_param,
    description_param,
    duration_seconds_param,
    coin_cost_param,
    coin_reward_param,
    target_views_param,
    'on_hold',
    hold_until_time,
    0,
    0,
    0.0,
    0.0,
    0.0,
    current_time_val,
    current_time_val
  ) RETURNING id INTO new_video_id;
  
  -- Log the exact hold time for verification
  RAISE NOTICE 'Video % created at % will be held until % (exactly 10 minutes)', 
    youtube_url_param, current_time_val, hold_until_time;
  
  RETURN new_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to release videos from hold with proper logging
CREATE OR REPLACE FUNCTION public.release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
  current_time_val timestamptz;
BEGIN
  current_time_val := now();
  
  -- Find videos that should be released from hold (exactly 10 minutes)
  FOR video_record IN
    SELECT id, youtube_url, hold_until, created_at, title
    FROM public.videos
    WHERE status = 'on_hold'
    AND hold_until IS NOT NULL
    AND current_time_val >= hold_until
  LOOP
    BEGIN
      -- Update video status to active
      UPDATE public.videos
      SET status = 'active',
          updated_at = current_time_val
      WHERE id = video_record.id;
      
      released_count := released_count + 1;
      
      -- Log the status change with exact timing
      RAISE NOTICE 'Video % released to Active after exactly 10 minutes at %', 
        video_record.youtube_url, current_time_val;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other videos
        RAISE WARNING 'Failed to release video %: %', video_record.youtube_url, SQLERRM;
    END;
  END LOOP;
  
  -- Also check for videos that should be marked as completed
  BEGIN
    UPDATE public.videos
    SET status = 'completed',
        updated_at = current_time_val
    WHERE status = 'active'
    AND views_count >= target_views;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to update completed videos: %', SQLERRM;
  END;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update video engagement metrics
CREATE OR REPLACE FUNCTION public.update_video_engagement(
  video_uuid uuid
)
RETURNS void AS $$
DECLARE
  total_views integer;
  completed_views integer;
  total_watch_time_calc integer;
  engagement_rate_calc decimal(5,2);
  completion_rate_calc decimal(5,2);
  average_watch_time_calc decimal(8,2);
  target_views_count integer;
  video_url text;
BEGIN
  -- Get video info
  SELECT target_views, youtube_url INTO target_views_count, video_url
  FROM public.videos
  WHERE id = video_uuid;
  
  -- Calculate metrics from video_views
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COALESCE(SUM(watched_duration), 0)
  INTO total_views, completed_views, total_watch_time_calc
  FROM public.video_views
  WHERE video_id = video_uuid;
  
  -- Calculate engagement rate (percentage of viewers who completed)
  IF total_views > 0 THEN
    engagement_rate_calc := (completed_views::decimal / total_views::decimal) * 100;
    average_watch_time_calc := total_watch_time_calc::decimal / total_views::decimal;
  ELSE
    engagement_rate_calc := 0.0;
    average_watch_time_calc := 0.0;
  END IF;
  
  -- Calculate completion rate (progress towards target)
  IF target_views_count > 0 THEN
    completion_rate_calc := (total_views::decimal / target_views_count::decimal) * 100;
  ELSE
    completion_rate_calc := 0.0;
  END IF;
  
  -- Update video with calculated metrics
  UPDATE public.videos
  SET total_watch_time = total_watch_time_calc,
      engagement_rate = engagement_rate_calc,
      completion_rate = completion_rate_calc,
      average_watch_time = average_watch_time_calc,
      views_count = total_views,
      updated_at = now()
  WHERE id = video_uuid;
  
  -- Auto-complete video if target reached and log it
  IF total_views >= target_views_count AND target_views_count > 0 THEN
    UPDATE public.videos
    SET status = 'completed',
        updated_at = now()
    WHERE id = video_uuid AND status = 'active';
    
    -- Log the completion
    RAISE NOTICE 'Video % marked as Complete - target views reached', video_url;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time analytics for a video
CREATE OR REPLACE FUNCTION public.get_video_analytics_realtime_v2(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS json AS $$
DECLARE
  video_data RECORD;
  analytics_result json;
  fresh_view_count integer;
BEGIN
  -- Get FRESH video data with immediate view count
  SELECT 
    v.id,
    v.title,
    v.youtube_url,
    v.views_count,
    v.target_views,
    v.status,
    v.duration_seconds,
    v.coin_cost,
    v.created_at,
    v.updated_at,
    v.hold_until
  INTO video_data
  FROM public.videos v
  WHERE v.id = video_uuid AND v.user_id = user_uuid;
  
  -- Check if video exists and user owns it
  IF video_data.id IS NULL THEN
    RETURN json_build_object('error', 'Video not found or access denied');
  END IF;
  
  -- Get REAL-TIME view count directly from video_views table
  SELECT COUNT(*)::integer INTO fresh_view_count
  FROM public.video_views
  WHERE video_id = video_uuid AND completed = true;
  
  -- Update video view count if it's different (sync issue fix)
  IF fresh_view_count != video_data.views_count THEN
    UPDATE public.videos
    SET views_count = fresh_view_count,
        updated_at = now()
    WHERE id = video_uuid;
    
    -- Update our local data
    video_data.views_count := fresh_view_count;
  END IF;
  
  -- Build comprehensive analytics result with REAL-TIME data
  analytics_result := json_build_object(
    'id', video_data.id,
    'title', video_data.title,
    'youtube_url', video_data.youtube_url,
    'views_count', video_data.views_count,
    'target_views', video_data.target_views,
    'progress_percentage', CASE 
      WHEN video_data.target_views > 0 
      THEN ROUND((video_data.views_count::decimal / video_data.target_views::decimal) * 100, 2)
      ELSE 0 
    END,
    'status', video_data.status,
    'duration_seconds', video_data.duration_seconds,
    'coin_cost', video_data.coin_cost,
    'created_at', video_data.created_at,
    'updated_at', now(), -- Always return current timestamp for freshness
    'hold_until', video_data.hold_until,
    'display_views_count', video_data.views_count,
    'progress_text', video_data.views_count || '/' || video_data.target_views,
    'completion_rate', CASE 
      WHEN video_data.target_views > 0 
      THEN ROUND((video_data.views_count::decimal / video_data.target_views::decimal) * 100, 2)
      ELSE 0 
    END,
    'fresh_data', true -- Indicator that this is fresh data
  );
  
  RETURN analytics_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get filtered recent activities (excluding queue video earnings)
CREATE OR REPLACE FUNCTION public.get_filtered_recent_activities(
  user_uuid uuid,
  activity_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount integer,
  transaction_type text,
  description text,
  reference_id uuid,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.user_id,
    ct.amount,
    ct.transaction_type::text,
    ct.description,
    ct.reference_id,
    ct.created_at
  FROM public.coin_transactions ct
  WHERE ct.user_id = user_uuid
  AND ct.transaction_type != 'video_watch'  -- Exclude queue video earnings
  ORDER BY ct.created_at DESC
  LIMIT activity_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION public.get_user_analytics_summary(
  user_uuid uuid
)
RETURNS TABLE(
  total_videos_promoted integer,
  total_coins_earned integer,
  total_coins_spent integer,
  total_views_received integer,
  total_watch_time integer,
  average_engagement_rate decimal(5,2),
  active_videos integer,
  completed_videos integer,
  on_hold_videos integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(v.id)::integer as total_videos_promoted,
    -- Calculate total coins earned from non-video_watch transactions only
    COALESCE((
      SELECT SUM(ct.amount) 
      FROM public.coin_transactions ct 
      WHERE ct.user_id = user_uuid 
      AND ct.amount > 0 
      AND ct.transaction_type != 'video_watch'
    ), 0)::integer as total_coins_earned,
    -- Calculate total coins spent
    COALESCE((
      SELECT SUM(ABS(ct.amount)) 
      FROM public.coin_transactions ct 
      WHERE ct.user_id = user_uuid 
      AND ct.amount < 0
    ), 0)::integer as total_coins_spent,
    COALESCE(SUM(v.views_count), 0)::integer as total_views_received,
    COALESCE(SUM(v.total_watch_time), 0)::integer as total_watch_time,
    COALESCE(AVG(v.engagement_rate), 0)::decimal(5,2) as average_engagement_rate,
    COUNT(v.id) FILTER (WHERE v.status = 'active')::integer as active_videos,
    COUNT(v.id) FILTER (WHERE v.status = 'completed')::integer as completed_videos,
    COUNT(v.id) FILTER (WHERE v.status = 'on_hold')::integer as on_hold_videos
  FROM public.videos v
  WHERE v.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VIP System Functions

-- Function to check if user has active VIP
CREATE OR REPLACE FUNCTION public.is_user_vip(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  vip_status boolean;
  vip_expires timestamptz;
BEGIN
  SELECT is_vip, vip_expires_at
  INTO vip_status, vip_expires
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Return true if user is VIP and subscription hasn't expired
  RETURN vip_status AND (vip_expires IS NULL OR vip_expires > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate VIP subscription
CREATE OR REPLACE FUNCTION public.activate_vip_subscription(
  user_uuid uuid,
  duration_days integer,
  plan_type text
)
RETURNS boolean AS $$
DECLARE
  expires_at timestamptz;
BEGIN
  -- Calculate expiration date
  expires_at := now() + (duration_days || ' days')::interval;
  
  -- Update user profile
  UPDATE public.profiles
  SET is_vip = true,
      vip_expires_at = expires_at,
      updated_at = now()
  WHERE id = user_uuid;
  
  -- Record transaction
  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    user_uuid,
    0, -- No coins involved
    'vip_purchase',
    'VIP ' || plan_type || ' subscription activated for ' || duration_days || ' days',
    null
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to force refresh user profile data
CREATE OR REPLACE FUNCTION public.force_refresh_user_profile(user_uuid uuid)
RETURNS json AS $$
DECLARE
  user_data RECORD;
BEGIN
  -- Get fresh user data with row lock to ensure consistency
  SELECT 
    coins, 
    is_vip, 
    vip_expires_at,
    updated_at
  INTO user_data
  FROM public.profiles
  WHERE id = user_uuid
  FOR UPDATE;
  
  IF user_data IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  -- Force update timestamp to trigger frontend refresh
  UPDATE public.profiles
  SET updated_at = now()
  WHERE id = user_uuid;
  
  RETURN json_build_object(
    'coins', user_data.coins,
    'is_vip', user_data.is_vip,
    'vip_expires_at', user_data.vip_expires_at,
    'updated_at', now(),
    'force_refreshed', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger function for automatic engagement updates
CREATE OR REPLACE FUNCTION public.trigger_update_video_engagement()
RETURNS TRIGGER AS $$
DECLARE
  affected_video_id uuid;
BEGIN
  -- Get the affected video ID
  affected_video_id := CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.video_id
    ELSE NEW.video_id
  END;
  
  -- Update engagement metrics immediately
  PERFORM public.update_video_engagement(affected_video_id);
  
  -- Force update the video's updated_at timestamp for real-time sync
  UPDATE public.videos
  SET updated_at = now()
  WHERE id = affected_video_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DROP EXISTING TRIGGERS BEFORE RECREATING
-- =============================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_videos_updated_at ON public.videos;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_engagement_on_view_change ON public.video_views;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for video engagement updates
CREATE TRIGGER update_engagement_on_view_change
  AFTER INSERT OR UPDATE OR DELETE ON public.video_views
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_video_engagement();

-- =============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES BEFORE RECREATING
-- =============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view active videos" ON public.videos;
DROP POLICY IF EXISTS "Users can create videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;

DROP POLICY IF EXISTS "Users can read own views" ON public.video_views;
DROP POLICY IF EXISTS "Video owners can read their video views" ON public.video_views;
DROP POLICY IF EXISTS "Users can create views" ON public.video_views;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.coin_transactions;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can create settings" ON public.user_settings;

-- =============================================
-- CREATE RLS POLICIES WITH PROPER PERMISSIONS
-- =============================================

-- Profiles table policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CRITICAL: Allow trigger function to insert profiles (bypasses RLS for trigger)
CREATE POLICY "Trigger can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Videos table policies
CREATE POLICY "Users can view active videos" ON public.videos
  FOR SELECT USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create videos" ON public.videos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (user_id = auth.uid());

-- Video views table policies
CREATE POLICY "Users can read own views" ON public.video_views
  FOR SELECT USING (viewer_id = auth.uid());

CREATE POLICY "Video owners can read their video views" ON public.video_views
  FOR SELECT USING (video_id IN (SELECT id FROM public.videos WHERE user_id = auth.uid()));

CREATE POLICY "Users can create views" ON public.video_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- Coin transactions table policies
CREATE POLICY "Users can read own transactions" ON public.coin_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions" ON public.coin_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User settings table policies
CREATE POLICY "Users can read own settings" ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create settings" ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- CREATE THE USER CREATION TRIGGER (LAST STEP)
-- =============================================

-- Create the trigger for new user registration (after all tables and policies are ready)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FINAL VERIFICATION
-- =============================================

DO $$
DECLARE
  table_count integer;
  function_count integer;
  trigger_count integer;
BEGIN
  -- Verify all tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'videos', 'video_views', 'coin_transactions', 'user_settings');
  
  -- Verify all functions exist
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_new_user', 'update_user_coins', 'can_user_watch_video');
  
  -- Verify trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name = 'on_auth_user_created';
  
  IF table_count < 5 THEN
    RAISE EXCEPTION 'Missing tables! Found % tables, expected 5', table_count;
  END IF;
  
  IF function_count < 3 THEN
    RAISE EXCEPTION 'Missing functions! Found % functions, expected at least 3', function_count;
  END IF;
  
  IF trigger_count < 1 THEN
    RAISE EXCEPTION 'Missing trigger! User creation trigger not found';
  END IF;
  
  RAISE NOTICE '✅ VERIFICATION PASSED: % tables, % functions, % trigger', table_count, function_count, trigger_count;
END $$;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '🎉 FIXED VidGro database setup completed successfully!';
  RAISE NOTICE '🔧 Fixed "relation profiles does not exist" error';
  RAISE NOTICE '📊 All tables explicitly created in public schema';
  RAISE NOTICE '⚙️  All functions created with proper schema references';
  RAISE NOTICE '🔒 RLS policies configured to allow trigger operations';
  RAISE NOTICE '🚀 User creation trigger properly configured';
  RAISE NOTICE '✅ User signup should now work without database errors!';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Try creating a new user account now';
END $$;