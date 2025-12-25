-- إصلاح عناوين وأسماء الفيديوهات لتظهر بشكل صحيح في Discord Bot

-- 1. تحديث uploader_name لجميع الفيديوهات
UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != '';

-- 2. إصلاح العناوين التي تحتوي على Discord ID
-- استبدال <@942383653269438323> بـ RAGE
UPDATE videos v
SET title = REPLACE(title, '<@' || m.discord_id || '>', UPPER(m.discord_global_name))
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND v.title LIKE '%<@' || m.discord_id || '>%';

-- 3. إصلاح العناوين التي تحتوي على اليوزر نيم القديم
UPDATE videos v
SET title = REPLACE(UPPER(title), UPPER(m.discord_username), UPPER(m.discord_global_name))
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_username IS NOT NULL
  AND UPPER(v.title) LIKE UPPER(m.discord_username) || '%';

-- 4. التحقق من النتائج
SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name as should_be,
  m.discord_username as old_username,
  v.is_published
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.is_published = true
ORDER BY v.created_at DESC
LIMIT 10;

-- 5. إحصائيات التحديث
SELECT 
  COUNT(*) as total_published,
  COUNT(CASE WHEN v.title LIKE '%<@%>%' THEN 1 END) as has_discord_id,
  COUNT(CASE WHEN v.uploader_name = m.discord_global_name THEN 1 END) as correct_names
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.is_published = true;
