-- Add initial admin and members to the database
-- Run this after applying schema-final.sql

-- Add system admin
INSERT INTO admins (discord_id, discord_username, role) 
VALUES ('000000000000000000', 'System Admin', 'super_admin') 
ON CONFLICT (discord_id) DO NOTHING;

-- Add some test members (you can change these values)
INSERT INTO members (discord_id, discord_username, game_id, is_active) 
VALUES 
    ('123456789012345678', 'TestUser1', 'player001', true),
    ('234567890123456789', 'TestUser2', 'player002', true),
    ('345678901234567890', 'TestUser3', 'player003', true)
ON CONFLICT (discord_id) DO NOTHING;

-- Add some test admins (you can change these values)
INSERT INTO admins (discord_id, discord_username, role) 
VALUES 
    ('111111111111111111', 'Admin1', 'admin'),
    ('222222222222222222', 'Admin2', 'admin')
ON CONFLICT (discord_id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Admins count: ' || COUNT(*) FROM admins;
SELECT 'Members count: ' || COUNT(*) FROM members;
