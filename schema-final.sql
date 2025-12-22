-- Arena Run Database Schema - FINAL WORKING VERSION
-- Clean version without problematic INSERTs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255),
    discord_avatar VARCHAR(255),
    game_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'editor', 'member')),
    role_assigned_by_name VARCHAR(255),
    role_assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255),
    discord_avatar VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    stream_uid VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Metadata fields
    season VARCHAR(50),
    day VARCHAR(50),
    wins_attacks VARCHAR(255),
    arena_time VARCHAR(255),
    shield_hits VARCHAR(255),
    overtime_type VARCHAR(100),
    start_rank VARCHAR(50),
    end_rank VARCHAR(50),
    has_commentary BOOLEAN DEFAULT false,
    -- Uploader info
    uploaded_by VARCHAR(255),
    uploader_name VARCHAR(255),
    uploader_avatar VARCHAR(255),
    -- Stats
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    user_liked BOOLEAN DEFAULT false
);

-- View sessions table
CREATE TABLE IF NOT EXISTS view_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    discord_id VARCHAR(255) NOT NULL,
    watermark_code VARCHAR(255) NOT NULL,
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    is_vpn BOOLEAN DEFAULT false,
    isp VARCHAR(255),
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    watch_seconds INTEGER DEFAULT 0
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('country_change', 'excessive_views', 'suspicious_activity')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    discord_id VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    site_name VARCHAR(255) DEFAULT 'Arena Run',
    site_description TEXT DEFAULT 'Private Video Platform',
    discord_guild_ids TEXT,
    require_role BOOLEAN DEFAULT true,
    allowed_roles TEXT,
    allow_new_members BOOLEAN DEFAULT true,
    max_sessions_per_user INTEGER DEFAULT 5,
    session_timeout INTEGER DEFAULT 30,
    -- Notification settings
    notify_country_change BOOLEAN DEFAULT true,
    notify_ip_change BOOLEAN DEFAULT true,
    notify_unauthorized_login BOOLEAN DEFAULT true,
    notify_excessive_views BOOLEAN DEFAULT true,
    excessive_views_threshold INTEGER DEFAULT 5,
    excessive_views_interval INTEGER DEFAULT 10,
    notify_suspicious_activity BOOLEAN DEFAULT true,
    notify_vpn_proxy BOOLEAN DEFAULT true,
    notify_multiple_devices BOOLEAN DEFAULT true,
    notify_odd_hours BOOLEAN DEFAULT false,
    odd_hours_start INTEGER DEFAULT 2,
    odd_hours_end INTEGER DEFAULT 6,
    notify_new_upload BOOLEAN DEFAULT true,
    notify_new_publish BOOLEAN DEFAULT true,
    notify_new_session BOOLEAN DEFAULT true,
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_discord_id ON members(discord_id);
CREATE INDEX IF NOT EXISTS idx_members_game_id ON members(game_id);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);

CREATE INDEX IF NOT EXISTS idx_admins_discord_id ON admins(discord_id);

CREATE INDEX IF NOT EXISTS idx_videos_is_published ON videos(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_season ON videos(season);

CREATE INDEX IF NOT EXISTS idx_view_sessions_video_id ON view_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_discord_id ON view_sessions(discord_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_started_at ON view_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_view_sessions_ip_address ON view_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_alerts_discord_id ON alerts(discord_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies that work
-- Members table policies
CREATE POLICY "Enable read access for all users" ON members FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON members FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON members FOR DELETE USING (true);

-- Admins table policies
CREATE POLICY "Enable read access for all users" ON admins FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON admins FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON admins FOR DELETE USING (true);

-- Videos table policies
CREATE POLICY "Enable read access for all users" ON videos FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON videos FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON videos FOR DELETE USING (true);

-- View sessions table policies
CREATE POLICY "Enable read access for all users" ON view_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON view_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON view_sessions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON view_sessions FOR DELETE USING (true);

-- Alerts table policies
CREATE POLICY "Enable read access for all users" ON alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON alerts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON alerts FOR DELETE USING (true);

-- Settings table policies
CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON settings FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON settings FOR DELETE USING (true);

-- Insert default settings (safe)
INSERT INTO settings (site_name, site_description) 
VALUES ('Arena Run', 'Private Video Platform') 
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for settings table
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for videos table
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
