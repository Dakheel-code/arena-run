-- Update rage1306 player name manually
-- Username: rage1306
-- Display Name: RAGE

UPDATE members 
SET discord_global_name = 'RAGE'
WHERE discord_username = 'rage1306' OR discord_id = '942383653269438323';

-- Verify the update
SELECT discord_id, discord_username, discord_global_name, is_active
FROM members 
WHERE discord_username = 'rage1306' OR discord_id = '942383653269438323';
