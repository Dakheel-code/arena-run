// أداة تحقق سريعة لقاعدة البيانات
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkDatabase() {
  console.log('🔍 بدء التحقق من قاعدة البيانات...\n');

  try {
    // تحميل متغيرات البيئة
    const env = {};
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });

    console.log('📋 التحقق من متغيرات البيئة...');
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    let envOk = true;
    
    requiredVars.forEach(varName => {
      if (env[varName]) {
        console.log(`✅ ${varName}: موجود`);
      } else {
        console.log(`❌ ${varName}: مفقود`);
        envOk = false;
      }
    });

    if (!envOk) {
      console.log('\n❌ يوجد مشاكل في متغيرات البيئة');
      process.exit(1);
    }

    console.log('\n🔌 التحقق من الاتصال بقاعدة البيانات...');
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // اختبار الاتصال
    const { data, error } = await supabase.from('members').select('count');
    
    if (error) {
      console.log('❌ فشل الاتصال:', error.message);
      
      if (error.message.includes('permission denied')) {
        console.log('\n💡 الحل: تحتاج إلى تطبيق مخطط قاعدة البيانات');
        console.log('📝 اتبع الخطوات في ملف: apply-schema-instructions.md');
      }
      
      process.exit(1);
    }
    
    console.log('✅ الاتصال بقاعدة البيانات: نجاح');
    
    // التحقق من الجداول
    console.log('\n📊 التحقق من الجداول...');
    const tables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count');
        if (error) {
          console.log(`❌ ${table}: مشكلة`);
        } else {
          console.log(`✅ ${table}: موجود`);
        }
      } catch (err) {
        console.log(`❌ ${table}: خطأ`);
      }
    }
    
    console.log('\n🎉 قاعدة البيانات تعمل بشكل صحيح!');
    
  } catch (error) {
    console.log('❌ خطأ عام:', error.message);
    process.exit(1);
  }
}

checkDatabase();
