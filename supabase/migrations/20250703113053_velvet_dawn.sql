/*
  # Create coin_transactions table

  1. New Tables
    - `coin_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - user who made the transaction
      - `amount` (integer) - coin amount (positive for earning, negative for spending)
      - `transaction_type` (enum) - type of transaction
      - `description` (text) - transaction description
      - `reference_id` (uuid) - reference to related record (video, purchase, etc.)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `coin_transactions` table
    - Add policy for users to read their own transactions
*/

-- Create transaction type enum
CREATE TYPE transaction_type AS ENUM (
  'video_watch',
  'video_promotion',
  'purchase',
  'referral_bonus',
  'admin_adjustment',
  'vip_purchase',
  'ad_stop_purchase'
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type transaction_type NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
  ON coin_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own transactions (for tracking)
CREATE POLICY "Users can create transactions"
  ON coin_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(transaction_type);