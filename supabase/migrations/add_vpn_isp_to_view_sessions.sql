-- Add VPN detection and ISP columns to view_sessions table
ALTER TABLE view_sessions ADD COLUMN IF NOT EXISTS is_vpn BOOLEAN DEFAULT FALSE;
ALTER TABLE view_sessions ADD COLUMN IF NOT EXISTS isp TEXT;
