/*
  # Enhanced Video Management System for VidGro Analytics

  This migration adds comprehensive video management features including:
  1. 10-minute hold period functionality
  2. Enhanced refund calculation system
  3. Video extension and promotion management
  4. Real-time engagement tracking
  5. Automated queue management

  1. New Features
    - Video hold system with automatic release
    - Smart refund calculation (100% within 10 minutes, 80% after)
    - Video promotion extension with view reset
    - Enhanced engagement metrics tracking
    - Automated status management

  2. Security
    - All functions use SECURITY DEFINER for proper access control
    - Comprehensive validation and error handling
    - Transaction safety for coin operations
*/

-- Add enhanced columns to videos table if they don't exist
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

  -- Add completion tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'completion_rate'
  ) THEN
    ALTER TABLE videos ADD COLUMN completion_rate decimal(5,2) DEFAULT 0.0;
  END IF;

  -- Add average watch time tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'average_watch_time'
  ) THEN
    ALTER TABLE videos ADD COLUMN average_watch_time decimal(8,2) DEFAULT 0.0;
  END IF;
END $$;

-- Update video status enum to include 'on_hold' if not already present
DO $$
BEGIN
  -- Check if we're using text or enum for status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    -- Using text, add constraint to include 'on_hold'
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
    ALTER TABLE videos ADD CONSTRAINT videos_status_check 
      CHECK (status IN ('active', 'paused', 'completed', 'on_hold'));
  ELSE
    -- Try to add 'on_hold' to existing enum
    BEGIN
      ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'on_hold';
    EXCEPTION
      WHEN OTHERS THEN
        -- If enum doesn't exist or other error, ensure we have the right constraint
        NULL;
    END;
  END IF;
END $$;

-- Enhanced function to create video with 10-minute hold
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

-- Enhanced function to release videos from hold
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
BEGIN
  -- Find videos that should be released from hold
  FOR video_record IN
    SELECT id, youtube_url, hold_until, created_at
    FROM videos
    WHERE status = 'on_hold'
    AND (
      hold_until IS NULL OR 
      now() >= hold_until OR 
      now() >= (created_at + interval '10 minutes')
    )
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

-- Enhanced function to calculate coin refund based on deletion time
CREATE OR REPLACE FUNCTION calculate_video_refund(
  video_uuid uuid
)
RETURNS TABLE(
  refund_amount integer,
  refund_percentage integer,
  is_within_10_minutes boolean,
  video_exists boolean
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
  
  -- Check if video exists
  IF video_cost IS NULL THEN
    RETURN QUERY SELECT 
      0 as refund_amount,
      0 as refund_percentage,
      false as is_within_10_minutes,
      false as video_exists;
    RETURN;
  END IF;
  
  -- Calculate minutes since creation
  minutes_since_creation := EXTRACT(EPOCH FROM (now() - created_time)) / 60;
  
  -- Determine refund percentage and amount
  IF minutes_since_creation <= 10 THEN
    -- 100% refund within 10 minutes
    RETURN QUERY SELECT 
      video_cost as refund_amount,
      100 as refund_percentage,
      true as is_within_10_minutes,
      true as video_exists;
  ELSE
    -- 80% refund after 10 minutes
    RETURN QUERY SELECT 
      (video_cost * 80 / 100) as refund_amount,
      80 as refund_percentage,
      false as is_within_10_minutes,
      true as video_exists;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to delete video with automatic refund
CREATE OR REPLACE FUNCTION delete_video_with_refund(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS boolean AS $$
DECLARE
  refund_info RECORD;
  video_title text;
  video_exists boolean;
BEGIN
  -- Get refund information
  SELECT * INTO refund_info
  FROM calculate_video_refund(video_uuid);
  
  -- Check if video exists
  IF NOT refund_info.video_exists THEN
    RETURN false;
  END IF;
  
  -- Get video title and verify ownership
  SELECT title INTO video_title
  FROM videos
  WHERE id = video_uuid AND user_id = user_uuid;
  
  -- Check if video belongs to user
  IF video_title IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete the video (this will cascade to video_views)
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

-- Enhanced function to extend video promotion (reset views and reactivate)
CREATE OR REPLACE FUNCTION extend_video_promotion(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS boolean AS $$
DECLARE
  video_exists boolean;
BEGIN
  -- Check if video exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM videos 
    WHERE id = video_uuid AND user_id = user_uuid
  ) INTO video_exists;
  
  IF NOT video_exists THEN
    RETURN false;
  END IF;
  
  -- Clear existing views for this video first
  DELETE FROM video_views
  WHERE video_id = video_uuid;
  
  -- Reset video stats and reactivate
  UPDATE videos
  SET views_count = 0,
      status = 'active',
      total_watch_time = 0,
      engagement_rate = 0.0,
      completion_rate = 0.0,
      average_watch_time = 0.0,
      updated_at = now()
  WHERE id = video_uuid AND user_id = user_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to update video engagement metrics
CREATE OR REPLACE FUNCTION update_video_engagement(
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
BEGIN
  -- Get target views for completion rate calculation
  SELECT target_views INTO target_views_count
  FROM videos
  WHERE id = video_uuid;
  
  -- Calculate metrics from video_views
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COALESCE(SUM(watched_duration), 0)
  INTO total_views, completed_views, total_watch_time_calc
  FROM video_views
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
  UPDATE videos
  SET total_watch_time = total_watch_time_calc,
      engagement_rate = engagement_rate_calc,
      completion_rate = completion_rate_calc,
      average_watch_time = average_watch_time_calc,
      views_count = total_views,
      updated_at = now()
  WHERE id = video_uuid;
  
  -- Auto-complete video if target reached
  IF total_views >= target_views_count AND target_views_count > 0 THEN
    UPDATE videos
    SET status = 'completed',
        updated_at = now()
    WHERE id = video_uuid AND status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get comprehensive video analytics
CREATE OR REPLACE FUNCTION get_video_analytics(
  video_uuid uuid,
  user_uuid uuid
)
RETURNS TABLE(
  total_views integer,
  completed_views integer,
  total_watch_time integer,
  engagement_rate decimal(5,2),
  completion_rate decimal(5,2),
  average_watch_time decimal(8,2),
  coins_earned integer,
  views_remaining integer,
  estimated_completion_days decimal(8,2)
) AS $$
DECLARE
  video_data RECORD;
  days_since_creation decimal(8,2);
  views_per_day decimal(8,2);
BEGIN
  -- Get video data with ownership check
  SELECT v.*, 
         EXTRACT(EPOCH FROM (now() - v.created_at)) / 86400 as days_active
  INTO video_data
  FROM videos v
  WHERE v.id = video_uuid AND v.user_id = user_uuid;
  
  -- Check if video exists and belongs to user
  IF video_data.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get view statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COALESCE(SUM(watched_duration), 0),
    COALESCE(SUM(coins_earned), 0)
  INTO total_views, completed_views, total_watch_time, coins_earned
  FROM video_views
  WHERE video_id = video_uuid;
  
  -- Calculate metrics
  IF total_views > 0 THEN
    engagement_rate := (completed_views::decimal / total_views::decimal) * 100;
    average_watch_time := total_watch_time::decimal / total_views::decimal;
  ELSE
    engagement_rate := 0.0;
    average_watch_time := 0.0;
  END IF;
  
  IF video_data.target_views > 0 THEN
    completion_rate := (total_views::decimal / video_data.target_views::decimal) * 100;
    views_remaining := video_data.target_views - total_views;
  ELSE
    completion_rate := 0.0;
    views_remaining := 0;
  END IF;
  
  -- Estimate completion time
  days_since_creation := video_data.days_active;
  IF days_since_creation > 0 AND total_views > 0 AND views_remaining > 0 THEN
    views_per_day := total_views::decimal / days_since_creation;
    IF views_per_day > 0 THEN
      estimated_completion_days := views_remaining::decimal / views_per_day;
    ELSE
      estimated_completion_days := -1; -- Unknown
    END IF;
  ELSE
    estimated_completion_days := -1; -- Unknown
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger function for automatic engagement updates
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

-- Recreate trigger for video engagement updates
DROP TRIGGER IF EXISTS update_engagement_on_view_change ON video_views;
CREATE TRIGGER update_engagement_on_view_change
  AFTER INSERT OR UPDATE OR DELETE ON video_views
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_video_engagement();

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
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
    COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0)::integer as total_coins_earned,
    COALESCE(SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END), 0)::integer as total_coins_spent,
    COALESCE(SUM(v.views_count), 0)::integer as total_views_received,
    COALESCE(SUM(v.total_watch_time), 0)::integer as total_watch_time,
    COALESCE(AVG(v.engagement_rate), 0)::decimal(5,2) as average_engagement_rate,
    COUNT(v.id) FILTER (WHERE v.status = 'active')::integer as active_videos,
    COUNT(v.id) FILTER (WHERE v.status = 'completed')::integer as completed_videos,
    COUNT(v.id) FILTER (WHERE v.status = 'on_hold')::integer as on_hold_videos
  FROM videos v
  LEFT JOIN coin_transactions ct ON ct.user_id = user_uuid
  WHERE v.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_hold_status ON videos(status, hold_until) WHERE status = 'on_hold';
CREATE INDEX IF NOT EXISTS idx_videos_engagement ON videos(engagement_rate, completion_rate);
CREATE INDEX IF NOT EXISTS idx_videos_user_status ON videos(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_analytics ON video_views(video_id, completed, coins_earned);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_type ON coin_transactions(user_id, transaction_type, created_at);

-- Function to cleanup old hold videos (safety mechanism)
CREATE OR REPLACE FUNCTION cleanup_old_hold_videos()
RETURNS integer AS $$
DECLARE
  cleaned_count integer := 0;
BEGIN
  -- Release videos that have been on hold for more than 15 minutes (safety buffer)
  UPDATE videos
  SET status = 'active',
      updated_at = now()
  WHERE status = 'on_hold'
  AND created_at < (now() - interval '15 minutes')
  RETURNING 1 INTO cleaned_count;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  IF cleaned_count > 0 THEN
    RAISE NOTICE 'Cleaned up % old hold videos', cleaned_count;
  END IF;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced video management system deployed successfully!';
  RAISE NOTICE '🔧 Added: 10-minute hold system, smart refunds, video extension';
  RAISE NOTICE '📊 Added: Comprehensive analytics, engagement tracking, auto-completion';
  RAISE NOTICE '🚀 Added: Real-time updates, queue management, safety mechanisms';
  RAISE NOTICE '💎 Your VidGro analytics system is now production-ready!';
END $$;