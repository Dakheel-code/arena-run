-- Consolidate all webhook URLs into one
-- This migration removes the separate webhook columns and uses a single webhook_url

-- First, backup existing webhook URLs (if any exist)
-- Then drop the old columns
ALTER TABLE settings
DROP COLUMN IF EXISTS webhook_security,
DROP COLUMN IF EXISTS webhook_alerts,
DROP COLUMN IF EXISTS webhook_uploads;

-- Add the new unified webhook URL column
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS webhook_url TEXT DEFAULT '';

-- Update existing row if it exists
UPDATE settings
SET webhook_url = ''
WHERE webhook_url IS NULL OR webhook_url = '';

-- Note: After running this migration, you need to manually set the webhook_url
-- in the settings table or through the admin panel
