/*
  # Create videos table

  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - who promoted this video
      - `youtube_url` (text) - YouTube video URL
      - `title` (text) - video title
      - `description` (text) - video description
      - `duration_seconds` (integer) - video duration
      - `coin_cost` (integer) - total cost to promote
      - `coin_reward` (integer) - reward per view
      - `views_count` (integer) - current view count
      - `target_views` (integer) - target view count
      - `status` (enum) - active, paused, completed
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `videos` table
    - Add policies for users to manage their own videos
    - Add policy for users to view active videos
*/

-- Create status enum
CREATE TYPE video_status AS ENUM ('active', 'paused', 'completed');

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL,
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status video_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Users can read all active videos
CREATE POLICY "Users can view active videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

-- Users can insert their own videos
CREATE POLICY "Users can create videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own videos
CREATE POLICY "Users can update own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos"
  ON videos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON videos(status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);