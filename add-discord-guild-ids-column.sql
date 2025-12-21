-- Add discord_guild_ids column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS discord_guild_ids TEXT;

-- Add comment
COMMENT ON COLUMN settings.discord_guild_ids IS 'Comma-separated list of Discord server (guild) IDs';
