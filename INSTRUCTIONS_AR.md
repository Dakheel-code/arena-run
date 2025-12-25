# تعليمات إضافة عمود discord_global_name

## الخطوة 1: تنفيذ SQL في Supabase

1. افتح لوحة تحكم Supabase: https://supabase.com/dashboard
2. اختر مشروعك (dlytcwpwtcfwacktpeur)
3. اذهب إلى **SQL Editor** من القائمة الجانبية
4. انسخ والصق الكود التالي:

```sql
-- Add discord_global_name column to members table
-- This stores the Discord display name (e.g., "RAGE") separate from username (e.g., "rage1306")

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS discord_global_name TEXT;

-- Add index for better search performance
CREATE INDEX IF NOT EXISTS idx_members_discord_global_name ON members(discord_global_name);

-- Update existing members to have their discord_username as discord_global_name temporarily
-- This will be updated automatically when they log in next time
UPDATE members 
SET discord_global_name = discord_username 
WHERE discord_global_name IS NULL AND discord_username IS NOT NULL;
```

5. اضغط على **Run** أو **F5** لتنفيذ الكود

## الخطوة 2: التحقق من النتيجة

بعد تنفيذ الكود، قم بتشغيل هذا الاستعلام للتحقق:

```sql
SELECT discord_id, discord_username, discord_global_name, game_id, is_active
FROM members
LIMIT 5;
```

يجب أن ترى عمود `discord_global_name` الجديد مع البيانات.

## ملاحظات مهمة:

- العمود الجديد `discord_global_name` سيحتوي على اسم العرض في Discord (مثل: "RAGE")
- العمود `discord_username` سيحتوي على اسم المستخدم (مثل: "rage1306")
- عند تسجيل دخول الأعضاء في المرة القادمة، سيتم تحديث `discord_global_name` تلقائياً من Discord API
- الأعضاء الحاليين سيظهر لهم `discord_username` مؤقتاً في عمود Member حتى يسجلوا دخول مرة أخرى

## بعد التنفيذ:

قم بتحديث صفحة الأعضاء في الموقع (https://arena.regulators.us/admin/members) وستظهر الأسماء بشكل صحيح.
