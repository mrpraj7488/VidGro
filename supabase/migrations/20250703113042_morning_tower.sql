/*
  # Create video_views table

  1. New Tables
    - `video_views`
      - `id` (uuid, primary key)
      - `video_id` (uuid) - reference to video
      - `viewer_id` (uuid) - who watched the video
      - `watched_duration` (integer) - seconds watched
      - `completed` (boolean) - if video was watched completely
      - `coins_earned` (integer) - coins earned from this view
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `video_views` table
    - Add policies for users to read their own views
    - Add policy for video owners to see their video stats
*/

CREATE TABLE IF NOT EXISTS video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Prevent duplicate views from same user for same video
  UNIQUE(video_id, viewer_id)
);

-- Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Users can read their own views
CREATE POLICY "Users can read own views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (viewer_id = auth.uid());

-- Video owners can read views of their videos
CREATE POLICY "Video owners can read their video views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own views
CREATE POLICY "Users can create views"
  ON video_views
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer_id ON video_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON video_views(created_at);