-- Create watch_sessions table
CREATE TABLE IF NOT EXISTS watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  watermark_code TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  is_vpn BOOLEAN DEFAULT false,
  isp TEXT,
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  watch_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watch_sessions_discord_id ON watch_sessions(discord_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video_id ON watch_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_started_at ON watch_sessions(started_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE watch_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all sessions
CREATE POLICY "Admins can view all sessions"
  ON watch_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.discord_id = auth.uid()::text
      AND members.role IN ('admin', 'super_admin')
    )
  );

-- Create policy for users to view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON watch_sessions
  FOR SELECT
  TO authenticated
  USING (discord_id = auth.uid()::text);

-- Create policy for inserting sessions (anyone can create)
CREATE POLICY "Anyone can create sessions"
  ON watch_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for updating sessions (only own sessions)
CREATE POLICY "Users can update their own sessions"
  ON watch_sessions
  FOR UPDATE
  TO authenticated
  USING (discord_id = auth.uid()::text);
