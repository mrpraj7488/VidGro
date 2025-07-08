/*
  # Enhanced Video Management for VidGro Analytics

  1. Schema Updates
    - Add hold_until column to videos table for 10-minute hold functionality
    - Add engagement tracking fields
    - Update video status enum to include 'on_hold'

  2. Functions
    - Enhanced video management functions
    - Automatic hold release functionality
    - Coin refund calculations

  3. Security
    - Maintain existing RLS policies
    - Add proper validation for new features
*/

-- Add new columns to videos table if they don't exist
DO $$
BEGIN
  -- Add hold_until column for 10-minute hold functionality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'hold_until'
  ) THEN
    ALTER TABLE videos ADD COLUMN hold_until timestamptz;
  END IF;

  -- Add engagement tracking fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'total_watch_time'
  ) THEN
    ALTER TABLE videos ADD COLUMN total_watch_time integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'engagement_rate'
  ) THEN
    ALTER TABLE videos ADD COLUMN engagement_rate decimal(5,2) DEFAULT 0.0;
  END IF;
END $$;

-- Update video status to include 'on_hold' if not already present
DO $$
BEGIN
  -- Check if 'on_hold' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'on_hold' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'video_status')
  ) THEN
    -- Add 'on_hold' to the enum
    ALTER TYPE video_status ADD VALUE 'on_hold';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If video_status enum doesn't exist, create it
    CREATE TYPE video_status AS ENUM ('active', 'paused', 'completed', 'on_hold');
    
    -- Update videos table to use the enum if it's using text
    ALTER TABLE videos ALTER COLUMN status TYPE video_status USING status::video_status;
END $$;

-- Function to create video with 10-minute hold
CREATE OR REPLACE FUNCTION create_video_with_hold(
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
BEGIN
  -- Calculate hold time (10 minutes from now)
  hold_until_time := now() + interval '10 minutes';
  
  -- Insert video with on_hold status
  INSERT INTO videos (
    user_id,
    youtube_url,
    title,
    description,
    duration_seconds,
    coin_cost,
    coin_reward,
    target_views,
    status,
    hold_until
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
    hold_until_time
  ) RETURNING id INTO new_video_id;
  
  -- Log the hold status
  RAISE NOTICE 'Video % on hold for 10 minutes until %', youtube_url_param, hold_until_time;
  
  RETURN new_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release videos from hold
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
BEGIN
  -- Find videos that should be released from hold
  FOR video_record IN
    SELECT id, youtube_url, hold_until
    FROM videos
    WHERE status = 'on_hold'
    AND (hold_until IS NULL OR now() >= hold_until)
  LOOP
    -- Update video status to active
    UPDATE videos
    SET status = 'active',
        updated_at = now()
    WHERE id = video_record.id;
    
    released_count := released_count + 1;
    
    RAISE NOTICE 'Video % released to queue after hold period', video_record.youtube_url;
  END LOOP;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate coin refund based on deletion time
CREATE OR REPLACE FUNCTION calculate_video_refund(
  video_uuid uuid
)
RETURNS TABLE(
  refund_amount integer,
  refund_percentage integer,
  is_within_10_minutes boolean
) AS $$
DECLARE
  video_cost integer;
  created_time timestamptz;
  minutes_since_creation numeric;
BEGIN
  -- Get video details
  SELECT coin_cost, created_at
  INTO video_cost, created_time
  FROM videos
  WHERE id = video_uuid;
  
  -- Calculate minutes since creation
  minutes_since_creation := EXTRACT(EPOCH FROM (now() - created_time)) / 60;
  
  -- Determine refund percentage and amount
  IF minutes_since_creation <= 10 THEN
    -- 100% refund within 10 minutes
    RETURN QUERY SELECT 
      video_cost as refund_amount,
      100 as refund_percentage,
      true as is_within_10_minutes;
  ELSE
    -- 80% refund after 10 minutes
    RETURN QUERY SELECT 
      (video_cost * 80 / 100) as refund_amount,
      80 as refund_percentage,
      false as is_within_10_minutes;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete video with automatic refund
CREATE OR REPLACE FUNCTION delete_video_with_refund(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS boolean AS $$
DECLARE
  refund_info RECORD;
  video_title text;
BEGIN
  -- Get refund information
  SELECT * INTO refund_info
  FROM calculate_video_refund(video_uuid);
  
  -- Get video title for transaction description
  SELECT title INTO video_title
  FROM videos
  WHERE id = video_uuid AND user_id = user_uuid;
  
  -- Check if video exists and belongs to user
  IF video_title IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete the video
  DELETE FROM videos
  WHERE id = video_uuid AND user_id = user_uuid;
  
  -- Process refund if there's an amount to refund
  IF refund_info.refund_amount > 0 THEN
    PERFORM update_user_coins(
      user_uuid,
      refund_info.refund_amount,
      'admin_adjustment',
      format('Refund for deleted video: %s (%s%%)', video_title, refund_info.refund_percentage),
      video_uuid
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend video promotion (reset views and reactivate)
CREATE OR REPLACE FUNCTION extend_video_promotion(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS boolean AS $$
BEGIN
  -- Check if video exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM videos 
    WHERE id = video_uuid AND user_id = user_uuid
  ) THEN
    RETURN false;
  END IF;
  
  -- Reset video stats and reactivate
  UPDATE videos
  SET views_count = 0,
      status = 'active',
      total_watch_time = 0,
      engagement_rate = 0.0,
      updated_at = now()
  WHERE id = video_uuid AND user_id = user_uuid;
  
  -- Clear existing views for this video
  DELETE FROM video_views
  WHERE video_id = video_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update video engagement metrics
CREATE OR REPLACE FUNCTION update_video_engagement(
  video_uuid uuid
)
RETURNS void AS $$
DECLARE
  total_views integer;
  completed_views integer;
  total_watch_time_calc integer;
  engagement_rate_calc decimal(5,2);
BEGIN
  -- Calculate metrics from video_views
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COALESCE(SUM(watched_duration), 0)
  INTO total_views, completed_views, total_watch_time_calc
  FROM video_views
  WHERE video_id = video_uuid;
  
  -- Calculate engagement rate
  IF total_views > 0 THEN
    engagement_rate_calc := (completed_views::decimal / total_views::decimal) * 100;
  ELSE
    engagement_rate_calc := 0.0;
  END IF;
  
  -- Update video with calculated metrics
  UPDATE videos
  SET total_watch_time = total_watch_time_calc,
      engagement_rate = engagement_rate_calc,
      updated_at = now()
  WHERE id = video_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update engagement metrics when video_views change
CREATE OR REPLACE FUNCTION trigger_update_video_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update engagement metrics for the affected video
  PERFORM update_video_engagement(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.video_id
      ELSE NEW.video_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_engagement_on_view_change ON video_views;
CREATE TRIGGER update_engagement_on_view_change
  AFTER INSERT OR UPDATE OR DELETE ON video_views
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_video_engagement();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_hold_status ON videos(status, hold_until) WHERE status = 'on_hold';
CREATE INDEX IF NOT EXISTS idx_videos_engagement ON videos(engagement_rate, total_watch_time);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced video management features added successfully!';
  RAISE NOTICE '🔧 Added: 10-minute hold functionality, engagement tracking, automatic refunds';
  RAISE NOTICE '📊 Added: Video analytics, extend promotion, enhanced deletion logic';
  RAISE NOTICE '🚀 Your enhanced analytics tab is ready!';
END $$;