-- Step 1: Update rage1306 member to have RAGE as discord_global_name
UPDATE members 
SET discord_global_name = 'RAGE'
WHERE discord_username = 'rage1306' OR discord_id = '942383653269438323';

-- Step 2: Update all videos to use discord_global_name from members table
UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != '';

-- Step 3: Verify the changes
SELECT 
  v.id,
  v.title,
  v.uploader_name as video_uploader_name,
  m.discord_global_name as member_server_name,
  m.discord_username as member_username,
  v.uploaded_by as discord_id
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.uploaded_by = '942383653269438323'
ORDER BY v.created_at DESC
LIMIT 10;

-- Step 4: Check all members
SELECT discord_id, discord_username, discord_global_name, is_active
FROM members
WHERE discord_username IN ('rage1306', 'dakheel2', 'idakheel')
ORDER BY discord_username;
