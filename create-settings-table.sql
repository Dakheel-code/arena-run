-- Drop existing settings table if it has wrong structure
DROP TABLE IF EXISTS settings CASCADE;

-- Create settings table with single row (no UUID needed)
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'The Regulators RGR',
  site_description TEXT DEFAULT 'Arena Run',
  discord_guild_ids TEXT,
  require_role BOOLEAN DEFAULT false,
  allowed_roles TEXT,
  allow_new_members BOOLEAN DEFAULT true,
  max_sessions_per_user INTEGER DEFAULT 5,
  session_timeout INTEGER DEFAULT 30,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);

-- Insert default settings row
INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS for settings table
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Verify table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'settings'
ORDER BY ordinal_position;
