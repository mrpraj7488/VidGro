/*
  # Create database functions and triggers

  1. Functions
    - Function to handle new user registration
    - Function to update user coins safely
    - Function to check if user can watch video

  2. Triggers
    - Trigger to create user profile on auth signup
    - Trigger to create default user settings
*/

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a unique referral code
  INSERT INTO users (id, email, username, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    upper(substring(md5(random()::text) from 1 for 8))
  );
  
  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
  -- Get current coin balance
  SELECT coins INTO current_coins
  FROM users
  WHERE id = user_uuid;
  
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
  already_watched boolean;
BEGIN
  -- Get video owner
  SELECT user_id INTO video_owner
  FROM videos
  WHERE id = video_uuid AND status = 'active';
  
  -- Check if video exists and is active
  IF video_owner IS NULL THEN
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