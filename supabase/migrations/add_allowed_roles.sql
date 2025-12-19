-- Add allowed_roles column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS allowed_roles TEXT DEFAULT '';

-- Update existing row if it exists
UPDATE settings
SET allowed_roles = ''
WHERE allowed_roles IS NULL;
