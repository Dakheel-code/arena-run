-- Add new notification settings columns to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS notify_new_upload BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_publish BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_session BOOLEAN DEFAULT true;

-- Update existing row if it exists
UPDATE settings
SET 
  notify_new_upload = COALESCE(notify_new_upload, true),
  notify_new_publish = COALESCE(notify_new_publish, true),
  notify_new_session = COALESCE(notify_new_session, true)
WHERE id IS NOT NULL;
