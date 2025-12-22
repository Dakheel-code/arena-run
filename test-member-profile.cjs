// اختبار جلب بيانات عضو واحد
const fetch = require('node-fetch').default || require('node-fetch');

async function testMemberProfile() {
  console.log('🔍 اختبار جلب بيانات عضو واحد...\n');

  try {
    // اختبار جلب بيانات عضو معين
    const discordId = '123456789012345678'; // TestUser1
    
    const response = await fetch(`https://arena.regulators.us/.netlify/functions/admin-members-test?discord_id=${discordId}`);
    
    if (!response.ok) {
      console.log('❌ خطأ في جلب بيانات العضو:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ تم جلب بيانات العضو بنجاح!');
    console.log('📊 بيانات العضو:');
    
    if (result.profile) {
      console.log(`  ID: ${result.profile.discord_id}`);
      console.log(`  Username: ${result.profile.discord_username || 'N/A'}`);
      console.log(`  Game ID: ${result.profile.game_id}`);
      console.log(`  Active: ${result.profile.is_active ? 'Yes' : 'No'}`);
      console.log(`  Role: ${result.profile.role}`);
      console.log(`  Created: ${result.profile.created_at}`);
      console.log(`  Last Login: ${result.profile.last_login || 'Never'}`);
    } else {
      console.log('❌ لم يتم العثور على بيانات العضو');
    }

  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
  }
}

testMemberProfile();
