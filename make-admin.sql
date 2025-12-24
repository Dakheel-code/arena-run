-- Make your account admin
-- Run this in Supabase SQL Editor

-- First, check your current role
SELECT discord_id, discord_username, role, is_active 
FROM members 
WHERE discord_id = '691802404244422688';

-- Update your account to super_admin
UPDATE members 
SET role = 'super_admin', is_active = true
WHERE discord_id = '691802404244422688';

-- Verify the update
SELECT discord_id, discord_username, role, is_active 
FROM members 
WHERE discord_id = '691802404244422688';

-- If your account doesn't exist in members table, insert it:
-- INSERT INTO members (discord_id, discord_username, game_id, role, is_active)
-- VALUES ('691802404244422688', 'YourDiscordUsername', 'YourGameID', 'super_admin', true)
-- ON CONFLICT (discord_id) DO UPDATE SET role = 'super_admin', is_active = true;
