-- Update uploader_name in videos table to use discord_global_name from members table
-- This will fix old videos to show the correct server nickname

UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != ''
  AND (v.uploader_name IS NULL OR v.uploader_name != m.discord_global_name);

-- Verify the update
SELECT 
  v.id,
  v.title,
  v.uploaded_by,
  v.uploader_name as current_name,
  m.discord_global_name as server_nickname,
  m.discord_username
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.uploaded_by IS NOT NULL
ORDER BY v.created_at DESC
LIMIT 20;
