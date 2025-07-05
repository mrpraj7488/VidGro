/*
  # Fix user registration function

  1. Updates
    - Fix handle_new_user function to handle edge cases
    - Add better error handling for referral code generation
    - Ensure unique referral codes
    - Handle potential conflicts gracefully

  2. Security
    - Maintain existing RLS policies
    - Add proper error handling
*/

-- Drop and recreate the handle_new_user function with better error handling
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  max_attempts integer := 10;
  attempt_count integer := 0;
BEGIN
  -- Generate a unique referral code with retry logic
  LOOP
    new_referral_code := upper(substring(md5(random()::text || NEW.id::text || now()::text) from 1 for 8));
    
    -- Check if this referral code already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = new_referral_code) THEN
      EXIT; -- Found a unique code, exit loop
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      -- Fallback to a timestamp-based code if we can't find a unique random one
      new_referral_code := upper(substring(md5(NEW.id::text || extract(epoch from now())::text) from 1 for 8));
      EXIT;
    END IF;
  END LOOP;

  -- Insert user with proper error handling
  BEGIN
    INSERT INTO users (
      id, 
      email, 
      username, 
      referral_code
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1)
      ),
      new_referral_code
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle username conflicts by appending a number
      INSERT INTO users (
        id, 
        email, 
        username, 
        referral_code
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
          NEW.raw_user_meta_data->>'username', 
          split_part(NEW.email, '@', 1)
        ) || '_' || extract(epoch from now())::integer::text,
        new_referral_code
      );
  END;
  
  -- Create default user settings
  BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail the entire transaction
      RAISE WARNING 'Failed to create user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add some helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);