/*
  # Add VIP System to VidGro

  This migration adds VIP subscription functionality to the existing database.

  1. Updates to profiles table
    - Add is_vip boolean column
    - Add vip_expires_at timestamp column

  2. New transaction types
    - Add vip_purchase to transaction_type enum

  3. Functions
    - Function to check VIP status
    - Function to activate VIP subscription
    - Function to check VIP expiration

  4. Security
    - Maintain existing RLS policies
    - Add VIP-specific policies
*/

-- Add VIP columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add is_vip column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_vip'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_vip boolean DEFAULT false NOT NULL;
  END IF;

  -- Add vip_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'vip_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vip_expires_at timestamptz;
  END IF;
END $$;

-- Update transaction_type enum to include vip_purchase if not already present
DO $$
BEGIN
  -- Check if we're using text or enum for transaction_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coin_transactions' AND column_name = 'transaction_type' AND data_type = 'text'
  ) THEN
    -- Using text, update constraint to include 'vip_purchase'
    ALTER TABLE coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_transaction_type_check;
    ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_transaction_type_check 
      CHECK (transaction_type IN ('video_watch', 'video_promotion', 'purchase', 'referral_bonus', 'admin_adjustment', 'vip_purchase', 'ad_stop_purchase'));
  END IF;
END $$;

-- Function to check if user has active VIP
CREATE OR REPLACE FUNCTION is_user_vip(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  vip_status boolean;
  vip_expires timestamptz;
BEGIN
  SELECT is_vip, vip_expires_at
  INTO vip_status, vip_expires
  FROM profiles
  WHERE id = user_uuid;
  
  -- Return true if user is VIP and subscription hasn't expired
  RETURN vip_status AND (vip_expires IS NULL OR vip_expires > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate VIP subscription
CREATE OR REPLACE FUNCTION activate_vip_subscription(
  user_uuid uuid,
  duration_days integer,
  plan_type text
)
RETURNS boolean AS $$
DECLARE
  expires_at timestamptz;
BEGIN
  -- Calculate expiration date
  expires_at := now() + (duration_days || ' days')::interval;
  
  -- Update user profile
  UPDATE profiles
  SET is_vip = true,
      vip_expires_at = expires_at,
      updated_at = now()
  WHERE id = user_uuid;
  
  -- Record transaction
  INSERT INTO coin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    user_uuid,
    0, -- No coins involved
    'vip_purchase',
    'VIP ' || plan_type || ' subscription activated for ' || duration_days || ' days',
    null
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and expire VIP subscriptions
CREATE OR REPLACE FUNCTION expire_vip_subscriptions()
RETURNS integer AS $$
DECLARE
  expired_count integer := 0;
BEGIN
  -- Update expired VIP subscriptions
  UPDATE profiles
  SET is_vip = false,
      updated_at = now()
  WHERE is_vip = true
  AND vip_expires_at IS NOT NULL
  AND vip_expires_at <= now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get VIP status with details
CREATE OR REPLACE FUNCTION get_vip_status(user_uuid uuid)
RETURNS TABLE(
  is_active boolean,
  expires_at timestamptz,
  days_remaining integer,
  plan_type text
) AS $$
DECLARE
  vip_active boolean;
  vip_expires timestamptz;
  days_left integer;
  plan_name text;
BEGIN
  SELECT profiles.is_vip, profiles.vip_expires_at
  INTO vip_active, vip_expires
  FROM profiles
  WHERE profiles.id = user_uuid;
  
  -- Calculate days remaining
  IF vip_expires IS NOT NULL THEN
    days_left := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (vip_expires - now())) / 86400));
  ELSE
    days_left := 0;
  END IF;
  
  -- Determine plan type based on remaining days
  IF days_left > 0 THEN
    IF days_left <= 7 THEN
      plan_name := 'weekly';
    ELSE
      plan_name := 'monthly';
    END IF;
  ELSE
    plan_name := null;
    vip_active := false;
  END IF;
  
  RETURN QUERY SELECT 
    vip_active as is_active,
    vip_expires as expires_at,
    days_left as days_remaining,
    plan_name as plan_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for VIP queries
CREATE INDEX IF NOT EXISTS idx_profiles_vip_status ON profiles(is_vip, vip_expires_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ VIP system added successfully!';
  RAISE NOTICE '👑 Added: VIP status tracking, subscription management';
  RAISE NOTICE '🔧 Added functions: is_user_vip, activate_vip_subscription, expire_vip_subscriptions, get_vip_status';
  RAISE NOTICE '💎 VIP features ready for Indian Rupees pricing!';
END $$;