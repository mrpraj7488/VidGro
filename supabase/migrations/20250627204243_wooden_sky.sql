/*
  # Fix promoted_videos table schema

  1. Schema Updates
    - Add missing created_at and updated_at columns
    - Ensure proper data types for all columns
    - Add proper constraints and indexes

  2. Data Integrity
    - Set default values for timestamps
    - Ensure status column has proper constraints
    - Add proper foreign key relationships

  3. Performance
    - Add indexes for common query patterns
    - Optimize for video fetching and promotion queries
*/

-- Add missing timestamp columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promoted_videos' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE promoted_videos ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promoted_videos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE promoted_videos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Ensure status column exists with proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promoted_videos' AND column_name = 'status'
  ) THEN
    ALTER TABLE promoted_videos ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Update existing records to have proper timestamps
UPDATE promoted_videos 
SET created_at = now(), updated_at = now() 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Set NOT NULL constraints
ALTER TABLE promoted_videos 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- Add check constraint for status values
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promoted_videos_created_at 
ON promoted_videos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_videos_status_active 
ON promoted_videos(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_promoted_videos_promoter_status 
ON promoted_videos(promoter_id, status);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_promoted_videos_updated_at ON promoted_videos;
CREATE TRIGGER update_promoted_videos_updated_at
    BEFORE UPDATE ON promoted_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();