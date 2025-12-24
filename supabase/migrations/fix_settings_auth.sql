-- Fix settings table for authentication
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS discord_guild_ids TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS allowed_roles TEXT DEFAULT '';

-- Insert or update the settings row with your guild ID
INSERT INTO settings (id, discord_guild_ids, allowed_roles)
VALUES (
  1,
  '1361082727335464960',
  ''
)
ON CONFLICT (id) 
DO UPDATE SET
  discord_guild_ids = '1361082727335464960',
  allowed_roles = '';

-- If you want to restrict by specific roles, update allowed_roles:
-- UPDATE settings SET allowed_roles = 'role_id_1,role_id_2' WHERE id = 1;
