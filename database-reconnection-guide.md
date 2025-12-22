# دليل إعادة ربط قاعدة البيانات من الصفر

## 📋 نظرة عامة
هذا الدليل يوضح كيفية إعادة ربط قاعدة بيانات Supabase بمشروع Arena Run من الصفر.

## 🔧 الخطوات المطلوبة

### 1. التحقق من المشروع الحالي في Supabase
- **URL المشروع**: https://dlytcwpwtcfwacktpeur.supabase.co
- **الحالة**: يحتاج إلى التحقق من الصلاحيات والإعدادات

### 2. الحصول على مفاتيح API جديدة

#### الطريقة الأولى: من لوحة تحكم Supabase
1. اذهب إلى https://supabase.com/dashboard
2. سجل الدخول بحسابك
3. اختر مشروع `dlytcwpwtcfwacktpeur`
4. اذهب إلى `Settings` > `API`
5. ستجد:
   - **Project URL**: `https://dlytcwpwtcfwacktpeur.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. تحديث ملف البيئة (.env)

```env
# Supabase Configuration
SUPABASE_URL=https://dlytcwpwtcfwacktpeur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://dlytcwpwtcfwacktpeur.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. تطبيق مخطط قاعدة البيانات

#### الطريقة الأولى: عبر لوحة تحكم Supabase
1. اذهب إلى `SQL Editor` في لوحة تحكم Supabase
2. انسخ والصق محتوى `schema-to-copy.sql`
3. اضغط `Run` لتطبيق المخطط

#### الطريقة الثانية: عبر سطر الأوامر
```bash
# تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref dlytcwpwtcfwacktpeur

# تطبيق المخطط
supabase db push
```

### 5. التحقق من الاتصال

#### اختبار الاتصال الأساسي
```javascript
// test-connection.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dlytcwpwtcfwacktpeur.supabase.co',
  'your_service_role_key'
)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('members').select('count')
    if (error) throw error
    console.log('✅ الاتصال بنجاح:', data)
  } catch (error) {
    console.error('❌ فشل الاتصال:', error.message)
  }
}

testConnection()
```

### 6. التحقق من الجداول والصلاحيات

```sql
-- التحقق من وجود الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- التحقق من السياسات (RLS)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🚨 مشاكل شائعة وحلولها

### مشكلة: "permission denied for schema public"
**الحل**: التحقق من أنك تستخدم service_role key وليس anon key

### مشكلة: "relation does not exist"
**الحل**: تطبيق مخطط قاعدة البيانات (schema.sql)

### مشكلة: "Invalid API key"
**الحل**: التأكد من نسخ المفتاح بشكل صحيح بدون مسافات

## 📝 قائمة التحقق النهائية

- [ ] تحديث مفاتيح API في .env
- [ ] تطبيق مخطط قاعدة البيانات
- [ ] التحقق من الاتصال الأساسي
- [ ] التحقق من وجود الجداول
- [ ] التحقق من صلاحيات RLS
- [ ] اختبار وظائف التطبيق

## 🛠️ أدوات مساعدة

### سكربت التحقق الشامل
```javascript
// comprehensive-check.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function comprehensiveCheck() {
  console.log('🔍 بدء الفحص الشامل...')
  
  // 1. التحقق من الاتصال
  try {
    const { data, error } = await supabase.from('members').select('count')
    if (error) throw error
    console.log('✅ الاتصال بقاعدة البيانات: نجح')
  } catch (error) {
    console.log('❌ الاتصال بقاعدة البيانات: فشل -', error.message)
    return
  }
  
  // 2. التحقق من الجداول
  const tables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings']
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count')
      if (error) throw error
      console.log(`✅ الجدول ${table}: موجود`)
    } catch (error) {
      console.log(`❌ الجدول ${table}: مفقود -`, error.message)
    }
  }
  
  console.log('🏁 انتهى الفحص الشامل')
}

comprehensiveCheck()
```

## 📞 المساعدة

إذا واجهت أي مشاكل:
1. تحقق من مفاتيح API
2. تأكد من تطبيق المخطط بشكل صحيح
3. تحقق من صلاحيات المشروع في Supabase

---
**ملاحظة**: احتفظ بنسخة احتياطية من أي بيانات مهمة قبل إعادة الاتصال.
