-- Fix video titles to match exact case from discord_global_name
-- This updates titles that start with uploader_name (case-insensitive match)
-- and replaces it with the exact case from discord_global_name

-- Step 1: Update video titles to use exact case from discord_global_name
UPDATE videos v
SET title = m.discord_global_name || SUBSTRING(v.title FROM LENGTH(v.uploader_name) + 1)
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != ''
  AND LOWER(v.title) LIKE LOWER(v.uploader_name) || '%';

-- Step 2: Update uploader_name to match discord_global_name
UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != '';

-- Step 3: Verify the results
SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name,
  m.discord_username
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
ORDER BY v.created_at DESC
LIMIT 20;
