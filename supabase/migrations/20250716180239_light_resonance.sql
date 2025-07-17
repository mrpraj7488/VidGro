/*
  # Disable Email Confirmation Completely
  
  This migration completely disables email confirmation requirements:
  1. Updates existing users to bypass email confirmation
  2. Ensures the trigger works without email validation
  3. Removes any email confirmation dependencies
*/

-- Update existing users to mark them as email confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at),
    confirmation_token = NULL,
    email_change_token_new = NULL,
    email_change_token_current = NULL
WHERE email_confirmed_at IS NULL OR confirmation_token IS NOT NULL;

-- Update the handle_new_user function to work without any email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  max_attempts integer := 10;
  attempt_count integer := 0;
  new_username text;
  final_username text;
  username_suffix integer := 1;
BEGIN
  -- Log user creation (no email confirmation required)
  RAISE LOG 'Creating profile for user: % (email confirmation disabled)', NEW.id;
  
  -- Generate unique referral code
  LOOP
    new_referral_code := upper(substring(md5(random()::text || NEW.id::text || now()::text) from 1 for 8));
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code) THEN
      EXIT;
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      new_referral_code := upper(substring(md5(NEW.id::text || extract(epoch from now())::text) from 1 for 8));
      EXIT;
    END IF;
  END LOOP;

  -- Prepare username
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  IF new_username IS NULL OR length(trim(new_username)) = 0 THEN
    new_username := 'user';
  END IF;
  
  IF length(new_username) > 50 THEN
    new_username := substring(new_username from 1 for 50);
  END IF;
  
  final_username := new_username;

  -- Create profile immediately (no email confirmation needed)
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
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle username conflicts
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
          
          RAISE LOG 'Profile created with suffix username: %', final_username;
          EXIT;
          
        EXCEPTION
          WHEN unique_violation THEN
            username_suffix := username_suffix + 1;
            IF username_suffix > 100 THEN
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
              EXIT;
            END IF;
        END;
      END LOOP;
  END;
  
  -- Create user settings
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
      5,
      true,
      true,
      'en',
      now(),
      now()
    );
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS allows profile creation by trigger
DROP POLICY IF EXISTS "Allow profile creation by trigger" ON public.profiles;
CREATE POLICY "Allow profile creation by trigger" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Email confirmation completely disabled';
  RAISE NOTICE '🚀 Users are immediately active upon signup';
  RAISE NOTICE '📧 No email validation or confirmation required';
  RAISE NOTICE '⚡ Database triggers work without email dependencies';
END $$;