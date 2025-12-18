-- Arena Run Database Schema

-- Members table (allowlist)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  game_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  stream_uid TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- View sessions table
CREATE TABLE IF NOT EXISTS view_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  watermark_code TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  watch_seconds INTEGER DEFAULT 0
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('country_change', 'excessive_views', 'suspicious_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  discord_id TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_discord_id ON members(discord_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_discord_id ON view_sessions(discord_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_video_id ON view_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_started_at ON view_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_alerts_discord_id ON alerts(discord_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT DEFAULT 'Arena Run',
  site_description TEXT DEFAULT 'Private Video Platform',
  require_role BOOLEAN DEFAULT true,
  allow_new_members BOOLEAN DEFAULT true,
  max_sessions_per_user INTEGER DEFAULT 5,
  session_timeout INTEGER DEFAULT 30,
  -- Notification settings
  notify_country_change BOOLEAN DEFAULT true,
  notify_ip_change BOOLEAN DEFAULT true,
  notify_excessive_views BOOLEAN DEFAULT true,
  excessive_views_threshold INTEGER DEFAULT 5,
  excessive_views_interval INTEGER DEFAULT 10,
  notify_suspicious_activity BOOLEAN DEFAULT true,
  notify_vpn_proxy BOOLEAN DEFAULT true,
  notify_multiple_devices BOOLEAN DEFAULT true,
  notify_odd_hours BOOLEAN DEFAULT false,
  odd_hours_start INTEGER DEFAULT 2,
  odd_hours_end INTEGER DEFAULT 6,
  -- Webhook URLs (override env vars if set)
  webhook_security TEXT,
  webhook_alerts TEXT,
  webhook_uploads TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policies (service role bypasses RLS)
CREATE POLICY "Service role full access on members" ON members FOR ALL USING (true);
CREATE POLICY "Service role full access on videos" ON videos FOR ALL USING (true);
CREATE POLICY "Service role full access on view_sessions" ON view_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access on alerts" ON alerts FOR ALL USING (true);
