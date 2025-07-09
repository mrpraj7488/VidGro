/*
  # Fix 10-Minute Hold System and Video Status Management

  This migration ensures the 10-minute hold system works correctly and videos
  transition properly from PENDING -> ACTIVE -> COMPLETED status.

  1. Enhanced Functions
    - Fix create_video_with_hold to properly set hold_until timestamp
    - Improve release_videos_from_hold with better logging
    - Add automatic status completion when target views reached

  2. Status Management
    - Ensure proper status transitions
    - Add logging for status changes
    - Fix hold period calculation

  3. Queue Management
    - Proper integration with video queue system
    - Automatic completion when target reached
*/

-- Enhanced function to create video with proper 10-minute hold
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
  -- Calculate hold time (exactly 10 minutes from now)
  hold_until_time := now() + interval '10 minutes';
  
  -- Insert video with on_hold status and proper hold_until timestamp
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
    hold_until,
    views_count,
    total_watch_time,
    engagement_rate,
    completion_rate,
    average_watch_time
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
    0.0
  ) RETURNING id INTO new_video_id;
  
  -- Log the hold status
  RAISE NOTICE 'Video % status changed to Pending - hold until %', youtube_url_param, hold_until_time;
  
  RETURN new_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to release videos from hold with proper logging
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
BEGIN
  -- Find videos that should be released from hold
  FOR video_record IN
    SELECT id, youtube_url, hold_until, created_at, title
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
    
    -- Log the status change
    RAISE NOTICE 'Video % released to Active after 10 minutes', video_record.youtube_url;
    
  END LOOP;
  
  -- Also check for videos that should be marked as completed
  UPDATE videos
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'active'
  AND views_count >= target_views;
  
  -- Log completed videos
  FOR video_record IN
    SELECT youtube_url FROM videos 
    WHERE status = 'completed' 
    AND updated_at >= (now() - interval '1 minute')
  LOOP
    RAISE NOTICE 'Video % marked as Complete', video_record.youtube_url;
  END LOOP;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to update video engagement and auto-complete
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
  video_url text;
BEGIN
  -- Get video info
  SELECT target_views, youtube_url INTO target_views_count, video_url
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
  
  -- Auto-complete video if target reached and log it
  IF total_views >= target_views_count AND target_views_count > 0 THEN
    UPDATE videos
    SET status = 'completed',
        updated_at = now()
    WHERE id = video_uuid AND status = 'active';
    
    -- Log the completion
    RAISE NOTICE 'Video % marked as Complete - target views reached', video_url;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update video statuses (can be called periodically)
CREATE OR REPLACE FUNCTION check_video_statuses()
RETURNS TABLE(
  status_changes integer,
  completed_videos integer,
  released_videos integer
) AS $$
DECLARE
  released_count integer := 0;
  completed_count integer := 0;
  total_changes integer := 0;
BEGIN
  -- Release videos from hold
  SELECT release_videos_from_hold() INTO released_count;
  
  -- Count completed videos in this check
  SELECT COUNT(*) INTO completed_count
  FROM videos
  WHERE status = 'active' AND views_count >= target_views;
  
  -- Mark videos as completed if they reached target views
  UPDATE videos
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'active' AND views_count >= target_views;
  
  total_changes := released_count + completed_count;
  
  RETURN QUERY SELECT total_changes, completed_count, released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an index to optimize hold status queries
CREATE INDEX IF NOT EXISTS idx_videos_hold_status_time ON videos(status, hold_until, created_at) 
WHERE status = 'on_hold';

-- Create an index to optimize completion checks
CREATE INDEX IF NOT EXISTS idx_videos_active_views ON videos(status, views_count, target_views) 
WHERE status = 'active';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ 10-minute hold system fixed successfully!';
  RAISE NOTICE '🔧 Enhanced: create_video_with_hold, release_videos_from_hold, status management';
  RAISE NOTICE '📊 Added: Automatic completion detection, proper logging';
  RAISE NOTICE '🚀 Status flow: PENDING (10 min) → ACTIVE (in queue) → COMPLETED (target reached)';
  RAISE NOTICE '💡 Videos will now properly transition through all status phases!';
END $$;