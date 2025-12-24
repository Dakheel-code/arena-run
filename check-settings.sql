-- Check current settings table structure and data
SELECT * FROM settings LIMIT 1;

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND column_name IN ('discord_guild_ids', 'allowed_roles');
