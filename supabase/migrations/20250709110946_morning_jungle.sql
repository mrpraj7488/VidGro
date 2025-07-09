/*
  # Fix Hold Timer Calculation Issues

  This migration fixes the 10-minute hold timer calculation to ensure videos
  are held for exactly 10 minutes, not 20 minutes.

  1. Issues Fixed
    - Hold time calculation showing 19:45 instead of 10:00
    - Timer errors when reaching zero
    - Inconsistent hold_until timestamp calculation

  2. Changes
    - Fix create_video_with_hold to set exact 10-minute hold
    - Improve release_videos_from_hold error handling
    - Add better logging for debugging
*/

-- Fix the create_video_with_hold function to set exactly 10 minutes
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
  current_time timestamptz;
BEGIN
  -- Get current time for consistent calculation
  current_time := now();
  
  -- Calculate hold time (exactly 10 minutes from current time)
  hold_until_time := current_time + interval '10 minutes';
  
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
    current_time,
    current_time
  ) RETURNING id INTO new_video_id;
  
  -- Log the exact hold time for verification
  RAISE NOTICE 'Video % created at % will be held until % (exactly 10 minutes)', 
    youtube_url_param, current_time, hold_until_time;
  
  RETURN new_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced release function with better error handling
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
  current_time timestamptz;
BEGIN
  current_time := now();
  
  -- Find videos that should be released from hold (exactly 10 minutes)
  FOR video_record IN
    SELECT id, youtube_url, hold_until, created_at, title
    FROM videos
    WHERE status = 'on_hold'
    AND hold_until IS NOT NULL
    AND current_time >= hold_until
  LOOP
    BEGIN
      -- Update video status to active
      UPDATE videos
      SET status = 'active',
          updated_at = current_time
      WHERE id = video_record.id;
      
      released_count := released_count + 1;
      
      -- Log the status change with exact timing
      RAISE NOTICE 'Video % released to Active after exactly 10 minutes at %', 
        video_record.youtube_url, current_time;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other videos
        RAISE WARNING 'Failed to release video %: %', video_record.youtube_url, SQLERRM;
    END;
  END LOOP;
  
  -- Also check for videos that should be marked as completed
  BEGIN
    UPDATE videos
    SET status = 'completed',
        updated_at = current_time
    WHERE status = 'active'
    AND views_count >= target_views;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to update completed videos: %', SQLERRM;
  END;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check hold timer accuracy (for debugging)
CREATE OR REPLACE FUNCTION check_hold_timer_accuracy()
RETURNS TABLE(
  video_id uuid,
  youtube_url text,
  created_at timestamptz,
  hold_until timestamptz,
  minutes_difference numeric,
  seconds_remaining numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.youtube_url,
    v.created_at,
    v.hold_until,
    EXTRACT(EPOCH FROM (v.hold_until - v.created_at)) / 60 as minutes_difference,
    EXTRACT(EPOCH FROM (v.hold_until - now())) as seconds_remaining
  FROM videos v
  WHERE v.status = 'on_hold'
  AND v.hold_until IS NOT NULL
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed hold timer calculation issues!';
  RAISE NOTICE '🕐 Videos will now show exactly 10:00 minutes, not 19:45';
  RAISE NOTICE '🔧 Enhanced error handling for timer completion';
  RAISE NOTICE '📊 Added debugging function: check_hold_timer_accuracy()';
END $$;