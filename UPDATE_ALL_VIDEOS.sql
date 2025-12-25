-- تحديث جميع الفيديوهات لاستخدام discord_global_name من جدول members
-- هذا سيصلح جميع الفيديوهات المنشورة والقديمة

-- الخطوة 1: تحديث uploader_name في جدول videos
UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != ''
  AND (v.uploader_name IS NULL OR v.uploader_name != m.discord_global_name);

-- الخطوة 2: تحديث العناوين التي تبدأ باسم الرافع القديم
UPDATE videos v
SET title = CASE
  WHEN UPPER(v.title) LIKE UPPER(m.discord_username) || '%' 
  THEN UPPER(m.discord_global_name) || SUBSTRING(v.title FROM LENGTH(m.discord_username) + 1)
  ELSE v.title
END
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_username IS NOT NULL
  AND m.discord_global_name != m.discord_username
  AND UPPER(v.title) LIKE UPPER(m.discord_username) || '%';

-- الخطوة 3: التحقق من النتائج
SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name as server_nickname,
  m.discord_username,
  v.is_published,
  v.created_at
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.is_published = true
ORDER BY v.created_at DESC
LIMIT 20;

-- الخطوة 4: عرض إحصائيات التحديث
SELECT 
  COUNT(*) as total_videos,
  COUNT(CASE WHEN v.uploader_name = m.discord_global_name THEN 1 END) as updated_videos,
  COUNT(CASE WHEN v.uploader_name != m.discord_global_name THEN 1 END) as needs_update
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE m.discord_global_name IS NOT NULL;
