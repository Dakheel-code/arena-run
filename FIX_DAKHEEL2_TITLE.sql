-- Fix title for dakheel2 video to match exact case
UPDATE videos
SET title = 'dakheel2 - S158 - DAY 9'
WHERE id = 'd5ba1849-0bd6-4ee2-94b0-758c7e62298b';

-- Verify the fix
SELECT id, title, uploader_name, discord_username, discord_global_name
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.id = 'd5ba1849-0bd6-4ee2-94b0-758c7e62298b';
