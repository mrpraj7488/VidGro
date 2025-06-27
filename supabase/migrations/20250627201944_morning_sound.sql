/*
  # Add status column to promoted_videos table

  1. Schema Updates
    - Add status column to promoted_videos table with default value 'active'
    - Update existing records to have 'active' status
    - Add index for better query performance

  2. Data Migration
    - Set all existing promoted_videos to 'active' status
    - Ensure no NULL values in status column

  3. Performance
    - Add index on status column for faster filtering
*/

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promoted_videos' AND column_name = 'status'
  ) THEN
    ALTER TABLE promoted_videos ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Update existing records to have 'active' status
UPDATE promoted_videos 
SET status = 'active' 
WHERE status IS NULL;

-- Add constraint to ensure status is not null
ALTER TABLE promoted_videos 
ALTER COLUMN status SET NOT NULL;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'promoted_videos_status_check'
  ) THEN
    ALTER TABLE promoted_videos 
    ADD CONSTRAINT promoted_videos_status_check 
    CHECK (status IN ('active', 'paused', 'completed'));
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_promoted_videos_status_active 
ON promoted_videos(status) WHERE status = 'active';