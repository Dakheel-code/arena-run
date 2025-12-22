// اختبار API للتطبيق المنشور
const fetch = require('node-fetch').default || require('node-fetch');

async function testDeployedAPI() {
  console.log('🔍 اختبار API للتطبيق المنشور...\n');

  try {
    // اختبار API endpoint
    const response = await fetch('https://arena.regulators.us/.netlify/functions/admin-members');
    
    if (!response.ok) {
      console.log('❌ خطأ في API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('تفاصيل الخطأ:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API يعمل!');
    console.log('📊 البيانات:', data);

  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 المشكلة: API غير متاح');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 المشكلة: استجابة بطيئة');
    }
  }
}

testDeployedAPI();
