-- Add views_count and likes_count columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
ADD COLUMN IF NOT EXISTS uploader_name TEXT;

-- Create video_likes table for tracking who liked what
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, discord_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_discord_id ON video_likes(discord_id);

-- Function to increment views
CREATE OR REPLACE FUNCTION increment_views(vid UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET views_count = COALESCE(views_count, 0) + 1 WHERE id = vid;
END;
$$ LANGUAGE plpgsql;

-- Function to increment likes
CREATE OR REPLACE FUNCTION increment_likes(vid UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = vid;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement likes
CREATE OR REPLACE FUNCTION decrement_likes(vid UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = vid;
END;
$$ LANGUAGE plpgsql;
