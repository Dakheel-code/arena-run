-- الحل الجذري: إصلاح جميع عناوين الفيديوهات التي تحتوي على Discord ID

-- الخطوة 1: إصلاح العناوين التي تحتوي على <@discord_id>
-- استبدال <@942383653269430323> بـ RAGE لجميع الفيديوهات
UPDATE videos v
SET title = REGEXP_REPLACE(
  title, 
  '<@' || m.discord_id || '>', 
  UPPER(m.discord_global_name),
  'g'
)
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND v.title LIKE '%<@' || m.discord_id || '>%';

-- الخطوة 2: تحديث uploader_name لجميع الفيديوهات
UPDATE videos v
SET uploader_name = m.discord_global_name
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_global_name != '';

-- الخطوة 3: إصلاح العناوين التي تحتوي على اليوزر نيم القديم
UPDATE videos v
SET title = REGEXP_REPLACE(
  UPPER(title),
  UPPER(m.discord_username),
  UPPER(m.discord_global_name),
  'g'
)
FROM members m
WHERE v.uploaded_by = m.discord_id
  AND m.discord_global_name IS NOT NULL
  AND m.discord_username IS NOT NULL
  AND m.discord_global_name != m.discord_username
  AND UPPER(v.title) LIKE '%' || UPPER(m.discord_username) || '%';

-- الخطوة 4: التحقق من جميع الفيديوهات المنشورة
SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name as correct_name,
  m.discord_id,
  v.is_published,
  v.created_at
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.is_published = true
ORDER BY v.created_at DESC;

-- الخطوة 5: عرض الفيديوهات التي مازالت تحتوي على مشاكل
SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name,
  'Has Discord ID' as issue
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.title LIKE '%<@%>%'
  AND v.is_published = true

UNION ALL

SELECT 
  v.id,
  v.title,
  v.uploader_name,
  m.discord_global_name,
  'Wrong uploader_name' as issue
FROM videos v
LEFT JOIN members m ON v.uploaded_by = m.discord_id
WHERE v.uploader_name != m.discord_global_name
  AND m.discord_global_name IS NOT NULL
  AND v.is_published = true;
