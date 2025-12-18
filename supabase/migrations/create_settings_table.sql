-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT DEFAULT 'Arena Run',
  site_description TEXT DEFAULT 'Private Video Platform',
  require_role BOOLEAN DEFAULT true,
  allow_new_members BOOLEAN DEFAULT true,
  max_sessions_per_user INTEGER DEFAULT 5,
  session_timeout INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO settings (site_name, site_description)
SELECT 'Arena Run', 'Private Video Platform'
WHERE NOT EXISTS (SELECT 1 FROM settings);
