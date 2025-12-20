-- Login Logs table to track all login attempts
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
  is_admin BOOLEAN DEFAULT false,
  is_member BOOLEAN DEFAULT false,
  has_required_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_logs_discord_id ON login_logs(discord_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_failure_reason ON login_logs(failure_reason);

-- Row Level Security
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Insert initial settings row if not exists
INSERT INTO settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM settings);
