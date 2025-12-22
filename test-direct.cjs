// اختبار مباشر باستخدام البيانات الجديدة
const { createClient } = require('@supabase/supabase-js');

async function testDirectConnection() {
  console.log('🔍 اختبار مباشر بالبيانات الجديدة...\n');

  try {
    // استخدام البيانات الجديدة مباشرة
    const SUPABASE_URL = 'https://mfumardwmfhgqmbegphb.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdW1hcmR3bWZoZ3FtYmVncGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0NDI0MiwiZXhwIjoyMDgxOTIwMjQyfQ.qA3S1WarQc-OK-z66TEEA3FN_fiOjJBDAaPkCdR73Go';

    console.log('📋 معلومات الاتصال:');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'موجود' : 'مفقود'}\n`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔌 محاولة الاتصال بالمشروع الجديد...');
    const { data, error } = await supabase.from('settings').select('site_name').limit(1);

    if (error) {
      console.log('❌ خطأ في الاتصال:', error.message);
      
      if (error.message.includes('relation "settings" does not exist')) {
        console.log('\n💡 المشكلة: المخطط لم يتم تطبيقه بعد!');
        console.log('📝 قم بتطبيق schema-clean.sql في Supabase SQL Editor');
      } else if (error.message.includes('fetch failed')) {
        console.log('\n💡 المشكلة: المشروع غير متاح أو URL غير صحيح');
        console.log('🔍 تحقق من: https://supabase.com/dashboard/project/mfumardwmfhgqmbegphb');
      }
      
      return;
    }

    console.log('✅ الاتصال ناجح!');
    console.log('📊 البيانات:', data);

    // الآن اختبر الأعضاء
    console.log('\n📊 التحقق من الأعضاء...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('discord_id, discord_username, game_id')
      .limit(5);

    if (membersError) {
      console.log('❌ خطأ في جلب الأعضاء:', membersError.message);
    } else {
      console.log(`✅ عدد الأعضاء: ${members.length}`);
      if (members.length > 0) {
        members.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.discord_username || 'N/A'} - ${member.game_id}`);
        });
      }
    }

  } catch (error) {
    console.log('❌ خطأ عام:', error.message);
  }
}

testDirectConnection();
