/*
  # Fix Missing Database Functions

  This migration adds the missing database functions that are required for the application to work properly.
  Specifically, it adds the complete_video_view, update_user_coins, can_user_watch_video, and get_next_video_for_user functions.

  1. Functions Added
    - update_user_coins: Safely update user coin balance with transaction logging
    - can_user_watch_video: Check if a user can watch a specific video
    - get_next_video_for_user: Get the next available video for a user to watch
    - complete_video_view: Complete a video view and award coins

  2. Security
    - All functions use SECURITY DEFINER for proper access control
    - Functions include proper validation and error handling
*/

-- Function to safely update user coins
CREATE OR REPLACE FUNCTION update_user_coins(
  user_uuid uuid,
  coin_amount integer,
  transaction_type_param text,
  description_param text,
  reference_uuid uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_coins integer;
BEGIN
  -- Get current coin balance with row lock
  SELECT coins INTO current_coins
  FROM profiles
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
  UPDATE profiles
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
  id uuid,
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Missing database functions have been restored!';
  RAISE NOTICE '🔧 Added functions: update_user_coins, can_user_watch_video, get_next_video_for_user, complete_video_view';
  RAISE NOTICE '🚀 Your app should now work properly!';
END $$;