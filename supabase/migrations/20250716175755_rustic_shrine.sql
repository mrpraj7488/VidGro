/*
  # Remove Email Confirmation Requirements
  
  This migration ensures that:
  1. Email confirmation is not required for user registration
  2. Users are immediately active upon signup
  3. Database triggers work without email confirmation dependencies
*/

-- Update any existing users to mark them as email confirmed (if needed)
-- This ensures existing users aren't locked out
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;

-- Ensure the handle_new_user trigger works for all users regardless of email confirmation
-- The trigger should create profiles immediately upon user creation
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
  RAISE LOG 'Starting user profile creation for user ID: % (email confirmation not required)', NEW.id;
  
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

  -- Insert user profile immediately (no email confirmation required)
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
    
    RAISE LOG 'Successfully created profile for user: % with username: % (no email confirmation required)', NEW.id, final_username;
    
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
  
  RAISE LOG 'User profile creation completed successfully for user: % (no email confirmation required)', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with full context and re-raise it
    RAISE EXCEPTION 'Critical error in handle_new_user() for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a policy to allow the trigger to insert profiles (bypasses RLS for system operations)
DROP POLICY IF EXISTS "Trigger can insert profiles" ON public.profiles;
CREATE POLICY "Trigger can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Email confirmation has been completely removed from VidGro';
  RAISE NOTICE '🚀 Users will be immediately active upon signup';
  RAISE NOTICE '📧 No email verification required';
  RAISE NOTICE '⚡ Database triggers work immediately without email confirmation dependencies';
  RAISE NOTICE '🔧 Updated handle_new_user() function to work without email confirmation';
END $$;