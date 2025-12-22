// اختبار إضافة عضو جديد
const fetch = require('node-fetch').default || require('node-fetch');

async function testAddMember() {
  console.log('🔍 اختبار إضافة عضو جديد...\n');

  try {
    const newMember = {
      discord_id: '999999999999999999',
      discord_username: 'TestUserNew',
      game_id: 'player004'
    };

    const response = await fetch('https://arena.regulators.us/.netlify/functions/admin-members-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newMember)
    });
    
    if (!response.ok) {
      console.log('❌ خطأ في إضافة العضو:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ تم إضافة العضو بنجاح!');
    console.log('📊 النتيجة:', result);

    // الآن اختبر جلب所有 الأعضاء للتأكد من وجود العضو الجديد
    console.log('\n🔍 التحقق من جميع الأعضاء...');
    const membersResponse = await fetch('https://arena.regulators.us/.netlify/functions/admin-members-test');
    const membersData = await membersResponse.json();
    
    console.log(`📊 عدد الأعضاء الكلي: ${membersData.members?.length || 0}`);
    if (membersData.members && membersData.members.length > 0) {
      console.log('\n👥 جميع الأعضاء:');
      membersData.members.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.discord_username || 'N/A'} (${member.discord_id}) - ${member.game_id}`);
      });
    }

  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
  }
}

testAddMember();
