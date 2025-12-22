// اختبار API الجديد بدون مصادقة
const fetch = require('node-fetch').default || require('node-fetch');

async function testTestAPI() {
  console.log('🔍 اختبار API admin-members-test (بدون مصادقة)...\n');

  try {
    const response = await fetch('https://arena.regulators.us/.netlify/functions/admin-members-test');
    
    if (!response.ok) {
      console.log('❌ خطأ في API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API يعمل!');
    console.log('📊 عدد الأعضاء:', data.members?.length || 0);
    
    if (data.members && data.members.length > 0) {
      console.log('\n👥 الأعضاء:');
      data.members.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.discord_username || 'N/A'} (${member.discord_id}) - ${member.game_id}`);
      });
    }

  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
  }
}

testTestAPI();
