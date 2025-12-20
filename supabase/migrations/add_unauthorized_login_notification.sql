-- Add notify_unauthorized_login field to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS notify_unauthorized_login BOOLEAN DEFAULT true;

-- Update existing row to have the new field enabled by default
UPDATE settings 
SET notify_unauthorized_login = true 
WHERE notify_unauthorized_login IS NULL;
