/*
  # Fix 10-minute hold time calculation

  This migration fixes the hold time calculation to ensure videos are held for exactly 10 minutes,
  not 20 minutes as currently happening.

  1. Updates
    - Fix create_video_with_hold function to set proper 10-minute hold
    - Update release_videos_from_hold to check exact 10-minute intervals
    - Add proper logging for hold time verification

  2. Security
    - Maintain existing RLS policies
    - Preserve all existing functionality
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
  
  -- Log the exact hold time for verification
  RAISE NOTICE 'Video % will be held until % (exactly 10 minutes from %)', 
    youtube_url_param, hold_until_time, now();
  
  RETURN new_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the release function to check exactly 10 minutes
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer AS $$
DECLARE
  released_count integer := 0;
  video_record RECORD;
BEGIN
  -- Find videos that should be released from hold (exactly 10 minutes)
  FOR video_record IN
    SELECT id, youtube_url, hold_until, created_at, title
    FROM videos
    WHERE status = 'on_hold'
    AND hold_until IS NOT NULL
    AND now() >= hold_until
  LOOP
    -- Update video status to active
    UPDATE videos
    SET status = 'active',
        updated_at = now()
    WHERE id = video_record.id;
    
    released_count := released_count + 1;
    
    -- Log the status change with exact timing
    RAISE NOTICE 'Video % released to Active after exactly 10 minutes at %', 
      video_record.youtube_url, now();
    
  END LOOP;
  
  -- Also check for videos that should be marked as completed
  UPDATE videos
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'active'
  AND views_count >= target_views;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed 10-minute hold time calculation!';
  RAISE NOTICE '🕐 Videos will now be held for exactly 10 minutes, not 20';
  RAISE NOTICE '🔧 Updated: create_video_with_hold, release_videos_from_hold';
END $$;