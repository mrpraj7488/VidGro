/*
  # Fix Video Completion Function
  
  This migration adds the missing check_video_completion_status function
  and ensures proper coin balance updates after video completion.
*/

-- Create the missing check_video_completion_status function
CREATE OR REPLACE FUNCTION public.check_video_completion_status(
  video_uuid uuid
)
RETURNS json AS $$
DECLARE
  video_data RECORD;
  should_skip_video boolean := false;
  skip_reason text := '';
BEGIN
  -- Get video status and completion info
  SELECT 
    v.id,
    v.status,
    v.views_count,
    v.target_views,
    v.user_id
  INTO video_data
  FROM public.videos v
  WHERE v.id = video_uuid;
  
  -- Check if video exists
  IF video_data.id IS NULL THEN
    should_skip_video := true;
    skip_reason := 'Video not found';
  -- Check if video is completed
  ELSIF video_data.status = 'completed' THEN
    should_skip_video := true;
    skip_reason := 'Video already completed';
  -- Check if video reached target views
  ELSIF video_data.views_count >= video_data.target_views THEN
    -- Mark video as completed if it reached target views
    UPDATE public.videos
    SET status = 'completed',
        updated_at = now()
    WHERE id = video_uuid;
    
    should_skip_video := true;
    skip_reason := 'Video reached target views';
  -- Check if video is not active
  ELSIF video_data.status != 'active' THEN
    should_skip_video := true;
    skip_reason := 'Video is not active (status: ' || video_data.status || ')';
  END IF;
  
  RETURN json_build_object(
    'should_skip', should_skip_video,
    'reason', skip_reason,
    'video_status', COALESCE(video_data.status, 'not_found'),
    'views_count', COALESCE(video_data.views_count, 0),
    'target_views', COALESCE(video_data.target_views, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to ensure coin balance updates are immediate and reliable
CREATE OR REPLACE FUNCTION public.complete_video_view_with_guaranteed_coins(
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
  view_already_exists boolean := false;
BEGIN
  current_time_val := now();
  
  -- Check if user already has a view record for this video
  SELECT EXISTS(
    SELECT 1 FROM public.video_views
    WHERE video_id = video_uuid AND viewer_id = user_uuid
  ) INTO view_already_exists;
  
  IF view_already_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already watched this video',
      'coins_earned', 0,
      'view_added', false,
      'video_completed', false,
      'should_skip', true
    );
  END IF;
  
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
      'video_completed', false,
      'should_skip', true
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
      'video_completed', false,
      'should_skip', true
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
  END IF;
  
  -- Award coins if completed with GUARANTEED balance update
  IF is_completed AND calculated_coins > 0 THEN
    -- CRITICAL: Use direct coin update with immediate balance refresh
    UPDATE public.profiles
    SET coins = coins + calculated_coins,
        updated_at = current_time_val
    WHERE id = user_uuid;
    
    -- Verify the update worked
    SELECT coins INTO new_coin_balance
    FROM public.profiles
    WHERE id = user_uuid;
    
    coin_update_success := (new_coin_balance = old_coin_balance + calculated_coins);
    
    -- Record the transaction
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
    
    -- Log successful coin update
    RAISE NOTICE 'COINS UPDATED: User % earned % coins (% -> %)', 
      user_uuid, calculated_coins, old_coin_balance, new_coin_balance;
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
    'coin_balance_updated', coin_update_success,
    'coin_update_success', coin_update_success,
    'video_owner_id', video_record.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Video completion function created successfully';
  RAISE NOTICE '💰 Enhanced coin balance update function added';
  RAISE NOTICE '🔄 Coin balance should now update immediately after video completion';
END $$;