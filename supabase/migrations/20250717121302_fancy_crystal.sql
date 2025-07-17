/*
  # Fix Video Timing Precision Issue
  
  This migration fixes the timing precision issue where users watch 44.x seconds
  but the system requires exactly 45 seconds, causing coin rewards to fail.
  
  Changes:
  1. Add tolerance to video completion checking
  2. Update coin awarding logic to be more forgiving with timing
  3. Ensure proper coin rewards for near-complete video watches
*/

-- Update the award_coins_for_video_completion function to be more forgiving with timing
CREATE OR REPLACE FUNCTION public.award_coins_for_video_completion(
  user_uuid uuid,
  video_uuid uuid,
  watch_duration integer
)
RETURNS json AS $$
DECLARE
  video_record RECORD;
  calculated_coins integer;
  current_balance integer;
  new_balance integer;
  existing_view_id uuid;
  current_time_val timestamptz;
  completion_threshold integer;
BEGIN
  current_time_val := now();
  
  -- Log the start of the process
  RAISE NOTICE 'Starting coin award for user % watching video % for %s', user_uuid, video_uuid, watch_duration;
  
  -- Get video details
  SELECT 
    v.id,
    v.user_id,
    v.title,
    v.duration_seconds,
    v.status,
    v.views_count,
    v.target_views
  INTO video_record
  FROM public.videos v
  WHERE v.id = video_uuid;
  
  -- Check if video exists
  IF video_record.id IS NULL THEN
    RAISE NOTICE 'Video % not found', video_uuid;
    RETURN json_build_object(
      'success', false,
      'error', 'Video not found',
      'coins_earned', 0
    );
  END IF;
  
  -- Check if video is active
  IF video_record.status != 'active' THEN
    RAISE NOTICE 'Video % is not active (status: %)', video_uuid, video_record.status;
    RETURN json_build_object(
      'success', false,
      'error', 'Video is not active',
      'coins_earned', 0
    );
  END IF;
  
  -- Check if user is trying to watch their own video
  IF video_record.user_id = user_uuid THEN
    RAISE NOTICE 'User % cannot watch their own video %', user_uuid, video_uuid;
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot watch own video',
      'coins_earned', 0
    );
  END IF;
  
  -- Check if user already watched this video
  SELECT id INTO existing_view_id
  FROM public.video_views
  WHERE video_id = video_uuid AND viewer_id = user_uuid;
  
  IF existing_view_id IS NOT NULL THEN
    RAISE NOTICE 'User % already watched video %', user_uuid, video_uuid;
    RETURN json_build_object(
      'success', false,
      'error', 'Already watched this video',
      'coins_earned', 0
    );
  END IF;
  
  -- Calculate completion threshold with tolerance (95% or 2 seconds less, whichever is more forgiving)
  completion_threshold := LEAST(
    video_record.duration_seconds - 2,  -- 2 seconds tolerance
    GREATEST(
      FLOOR(video_record.duration_seconds * 0.95),  -- 95% completion
      video_record.duration_seconds - 5  -- Maximum 5 seconds tolerance
    )
  );
  
  -- Ensure minimum threshold is reasonable
  IF completion_threshold < 10 THEN
    completion_threshold := GREATEST(video_record.duration_seconds - 2, 10);
  END IF;
  
  -- Check if user watched enough of the video (with tolerance)
  IF watch_duration < completion_threshold THEN
    RAISE NOTICE 'User % did not watch enough of video % (watched: %s, required: %s, target: %s)', 
      user_uuid, video_uuid, watch_duration, completion_threshold, video_record.duration_seconds;
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient watch time',
      'coins_earned', 0,
      'watched', watch_duration,
      'required', completion_threshold,
      'target', video_record.duration_seconds
    );
  END IF;
  
  -- Calculate coins based on duration
  calculated_coins := public.calculate_coins_by_duration_v2(video_record.duration_seconds);
  RAISE NOTICE 'Calculated % coins for %s video (watched %s, threshold %s)', 
    calculated_coins, video_record.duration_seconds, watch_duration, completion_threshold;
  
  -- Get current user balance
  SELECT coins INTO current_balance
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF current_balance IS NULL THEN
    RAISE NOTICE 'User % profile not found', user_uuid;
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found',
      'coins_earned', 0
    );
  END IF;
  
  new_balance := current_balance + calculated_coins;
  
  -- Start transaction block
  BEGIN
    -- 1. Create video view record (record the actual target duration for consistency)
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
      GREATEST(watch_duration, video_record.duration_seconds), -- Ensure we record at least target duration
      true,
      calculated_coins,
      current_time_val
    );
    
    RAISE NOTICE 'Created video view record for user % video %', user_uuid, video_uuid;
    
    -- 2. Update user coins
    UPDATE public.profiles
    SET coins = new_balance,
        updated_at = current_time_val
    WHERE id = user_uuid;
    
    RAISE NOTICE 'Updated user % coins: % -> %', user_uuid, current_balance, new_balance;
    
    -- 3. Create transaction record
    INSERT INTO public.coin_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      reference_id,
      created_at
    ) VALUES (
      user_uuid,
      calculated_coins,
      'video_watch',
      format('Watched %ss video: %s (%s coins)', video_record.duration_seconds, video_record.title, calculated_coins),
      video_uuid,
      current_time_val
    );
    
    RAISE NOTICE 'Created transaction record for user % earning % coins', user_uuid, calculated_coins;
    
    -- 4. Update video view count
    UPDATE public.videos
    SET views_count = views_count + 1,
        updated_at = current_time_val
    WHERE id = video_uuid;
    
    RAISE NOTICE 'Updated video % view count', video_uuid;
    
    -- 5. Check if video reached target views
    IF video_record.views_count + 1 >= video_record.target_views THEN
      UPDATE public.videos
      SET status = 'completed',
          updated_at = current_time_val
      WHERE id = video_uuid;
      
      RAISE NOTICE 'Video % marked as completed (reached target views)', video_uuid;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Transaction failed for user % video %: %', user_uuid, video_uuid, SQLERRM;
  END;
  
  -- Return success result
  RAISE NOTICE 'Successfully awarded % coins to user % for video % (watched %s/%s)', 
    calculated_coins, user_uuid, video_uuid, watch_duration, video_record.duration_seconds;
  
  RETURN json_build_object(
    'success', true,
    'coins_earned', calculated_coins,
    'old_balance', current_balance,
    'new_balance', new_balance,
    'video_completed', (video_record.views_count + 1 >= video_record.target_views),
    'watched_duration', watch_duration,
    'target_duration', video_record.duration_seconds,
    'completion_threshold', completion_threshold
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed video timing precision issue';
  RAISE NOTICE '🎯 Added 95% completion threshold with 2-second tolerance';
  RAISE NOTICE '⏱️ Users watching 44+ seconds of 45-second videos will now earn coins';
  RAISE NOTICE '🔧 Updated award_coins_for_video_completion function with better timing logic';
  RAISE NOTICE '🚀 Coin rewards should now work for near-complete video watches!';
END $$;