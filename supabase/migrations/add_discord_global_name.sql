-- Add discord_global_name column to members table
-- This stores the Discord display name (e.g., "RAGE") separate from username (e.g., "rage1306")

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS discord_global_name TEXT;

-- Add index for better search performance
CREATE INDEX IF NOT EXISTS idx_members_discord_global_name ON members(discord_global_name);

-- Update existing members to have their discord_username as discord_global_name temporarily
-- This will be updated automatically when they log in next time
UPDATE members 
SET discord_global_name = discord_username 
WHERE discord_global_name IS NULL AND discord_username IS NOT NULL;
