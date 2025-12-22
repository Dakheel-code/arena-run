-- Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL,
  discord_username TEXT,
  discord_discriminator TEXT,
  discord_avatar TEXT,
  email TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  failure_reason TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_member BOOLEAN DEFAULT FALSE,
  has_required_role BOOLEAN DEFAULT FALSE,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on discord_id for faster queries
CREATE INDEX IF NOT EXISTS idx_login_logs_discord_id ON login_logs(discord_id);

-- Create index on logged_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_login_logs_logged_at ON login_logs(logged_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);

-- Verify table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'login_logs'
ORDER BY ordinal_position;
