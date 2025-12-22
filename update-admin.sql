-- Update user 691802404244422688 to admin role
UPDATE members 
SET role = 'admin'
WHERE discord_id = '691802404244422688';

-- Verify the update
SELECT discord_id, discord_username, role, is_active 
FROM members 
WHERE discord_id = '691802404244422688';
