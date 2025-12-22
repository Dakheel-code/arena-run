// اختبار اتصال بسيط مع Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testConnection() {
  console.log('🔍 اختبار الاتصال بـ Supabase...\n');

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

    console.log('📋 معلومات الاتصال:');
    console.log(`URL: ${env.SUPABASE_URL}`);
    console.log(`Service Role Key: ${env.SUPABASE_SERVICE_ROLE_KEY ? 'موجود' : 'مفقود'}`);
    console.log(`Anon Key: ${env.VITE_SUPABASE_ANON_KEY ? 'موجود' : 'مفقود'}\n`);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // اختبار بسيط - جلب معلومات المشروع
    console.log('🔌 محاولة الاتصال...');
    const { data, error } = await supabase.from('settings').select('site_name').limit(1);

    if (error) {
      console.log('❌ خطأ في الاتصال:', error.message);
      
      if (error.message.includes('fetch failed')) {
        console.log('\n💡 المشكلة المحتملة:');
        console.log('1. المشروع غير نشط أو متوقف');
        console.log('2. URL غير صحيح');
        console.log('3. مشكلة في الشبكة');
        console.log('4. المفاتيح غير صحيحة');
      }
      
      return;
    }

    console.log('✅ الاتصال ناجح!');
    console.log('📊 البيانات:', data);

  } catch (error) {
    console.log('❌ خطأ عام:', error.message);
  }
}

testConnection();
