# 🔍 دليل التحقق من عمل قاعدة البيانات

## 📊 طرق التحقق المتاحة

### 1. الفحص التلقائي (الأسرع)
```bash
node database-reset-scripts.cjs
```

### 2. الفحص السريع عبر BAT
```bash
quick-database-reset.bat
```

### 3. الفحص اليدوي (مفصل)
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// تحميل متغيرات البيئة
const env = {};
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
  console.log('🔍 التحقق من قاعدة البيانات...');
  
  try {
    // التحقق من الاتصال
    const { data, error } = await supabase.from('members').select('count');
    if (error) {
      console.log('❌ مشكلة في الاتصال:', error.message);
      return false;
    }
    console.log('✅ الاتصال بقاعدة البيانات: نجاح');
    
    // التحقق من الجداول
    const tables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('count');
      if (error) {
        console.log(`❌ الجدول ${table}: مشكلة`);
      } else {
        console.log(`✅ الجدول ${table}: موجود`);
      }
    }
    
    console.log('🎉 قاعدة البيانات تعمل بشكل صحيح!');
    return true;
  } catch (error) {
    console.log('❌ خطأ عام:', error.message);
    return false;
  }
}

checkDatabase();
"
```

## 🚨 الحالات الممكنة والنتائج

### ✅ **الحالة المثالية (كل شيء يعمل)**
```
🔍 التحقق من متغيرات البيئة...
نتائج متغيرات البيئة:
  SUPABASE_URL: ✅ ok
  SUPABASE_SERVICE_ROLE_KEY: ✅ ok
  VITE_SUPABASE_URL: ✅ ok
  VITE_SUPABASE_ANON_KEY: ✅ ok

🔍 التحقق من الاتصال الأساسي...
✅ الاتصال ناجح

🔍 التحقق من الجداول...
نتائج الجداول:
  members: ✅ exists
  admins: ✅ exists
  videos: ✅ exists
  view_sessions: ✅ exists
  alerts: ✅ exists
  settings: ✅ exists

🎉 كل شيء يعمل بشكل صحيح!
```

### ❌ **المشكلة الحالية (المخطط لم يطبق)**
```
🔍 التحقق من الاتصال الأساسي...
❌ فشل الاتصال: permission denied for schema public
```

## 🔧 خطوات الحل

### إذا ظهر "permission denied for schema public":

1. **افتح Supabase Dashboard**
   - اذهب إلى: https://supabase.com/dashboard
   - اختر مشروع: `dlytcwpwtcfwacktpeur`

2. **افتح SQL Editor**
   - من القائمة الجانبية اضغط على "SQL Editor"
   - اضغط على "+ New query"

3. **طبق المخطط**
   - انسخ محتوى `schema-to-copy.sql`
   - الصقه في المحرر
   - اضغط "Run"

4. **تحقق مرة أخرى**
   ```bash
   node database-reset-scripts.cjs
   ```

## 🧪 اختبار العمليات المتقدمة

### اختبار إضافة عضو
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testMemberAdd() {
  try {
    const { data, error } = await supabase
      .from('members')
      .insert({
        discord_id: 'test123',
        game_id: 'game123',
        discord_username: 'TestUser'
      })
      .select();
    
    if (error) {
      console.log('❌ فشل إضافة العضو:', error.message);
    } else {
      console.log('✅ تم إضافة العضو بنجاح:', data);
      
      // حذف العضو التجريبي
      await supabase.from('members').delete().eq('discord_id', 'test123');
      console.log('✅ تم حذف العضو التجريبي');
    }
  } catch (error) {
    console.log('❌ خطأ:', error.message);
  }
}

testMemberAdd();
"
```

## 📱 التحقق من التطبيق

### 1. تشغيل التطبيق
```bash
npm run dev
```

### 2. افتح المتصفح على
- http://localhost:5173

### 3. اختبر الوظائف:
- ✅ عرض الفيديوهات
- ✅ إضافة عضو (لوحة التحكم)
- ✅ عرض الأعضاء
- ✅ الإعدادات

## 🎯 قائمة التحقق النهائية

- [ ] مفاتيح API صحيحة ✅
- [ ] الاتصال الأساسي يعمل ❌ (يحتاج تطبيق المخطط)
- [ ] جميع الجداول موجودة ❌ (يحتاج تطبيق المخطط)
- [ ] إضافة عضو تعمل ❌ (يحتاج تطبيق المخطط)
- [ ] التطبيق يعمل ✅

## 📞 إذا استمرت المشكلة

1. **تأكد من تطبيق المخطط بالكامل**
2. **تحقق من صلاحيات المشروع في Supabase**
3. **أعد تشغيل الفحص بعد كل تعديل**

---
**ملاحظة**: المشكلة الحالية هي "permission denied" والتي تحل بتطبيق المخطط فقط.
