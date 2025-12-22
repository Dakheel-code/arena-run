// أداة للتحقق من وجود الأعضاء في قاعدة البيانات
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkUsers() {
  console.log('🔍 التحقق من وجود الأعضاء في قاعدة البيانات...\n');

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

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // التحقق من وجود الأعضاء
    console.log('📊 التحقق من الأعضاء...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('discord_id, discord_username, game_id, is_active, created_at')
      .limit(10);

    if (membersError) {
      console.log('❌ خطأ في جلب الأعضاء:', membersError.message);
    } else {
      console.log(`✅ عدد الأعضاء: ${members.length}`);
      if (members.length > 0) {
        console.log('الأعضاء الحاليون:');
        members.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.discord_username || 'N/A'} (${member.discord_id}) - ${member.game_id}`);
        });
      }
    }

    // التحقق من وجود المشرفين
    console.log('\n👑 التحقق من المشرفين...');
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('discord_id, discord_username, role, created_at')
      .limit(10);

    if (adminsError) {
      console.log('❌ خطأ في جلب المشرفين:', adminsError.message);
    } else {
      console.log(`✅ عدد المشرفين: ${admins.length}`);
      if (admins.length > 0) {
        console.log('المشرفون الحاليون:');
        admins.forEach((admin, index) => {
          console.log(`  ${index + 1}. ${admin.discord_username || 'N/A'} (${admin.discord_id}) - ${admin.role}`);
        });
      }
    }

    // التحقق من وجود الفيديوهات
    console.log('\n🎥 التحقق من الفيديوهات...');
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('title, is_published, created_at')
      .limit(5);

    if (videosError) {
      console.log('❌ خطأ في جلب الفيديوهات:', videosError.message);
    } else {
      console.log(`✅ عدد الفيديوهات: ${videos.length}`);
      if (videos.length > 0) {
        console.log('الفيديوهات الحالية:');
        videos.forEach((video, index) => {
          console.log(`  ${index + 1}. ${video.title} (${video.is_published ? 'منشور' : 'مسود'})`);
        });
      }
    }

    console.log('\n🎉 انتهى التحقق!');
    
    if (members.length === 0 && admins.length === 0) {
      console.log('\n💡 ملاحظة: لا يوجد أعضاء أو مشرفين');
      console.log('📝 قم بتشغيل add-initial-users.sql لإضافة بيانات أولية');
    }

  } catch (error) {
    console.log('❌ خطأ عام:', error.message);
  }
}

checkUsers();
