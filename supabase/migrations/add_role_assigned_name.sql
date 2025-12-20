-- Add role_assigned_by_name and role_assigned_at columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS role_assigned_by_name TEXT,
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMPTZ;

-- Add comment to explain the columns
COMMENT ON COLUMN members.role_assigned_by_name IS 'Name of the member when their role was last assigned/changed';
COMMENT ON COLUMN members.role_assigned_at IS 'Timestamp when the role was last assigned/changed';
