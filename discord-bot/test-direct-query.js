// Test direct Supabase connection from bot
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  console.log('🔧 Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
  
  try {
    // Test 1: Fetch videos
    console.log('\n📹 Testing videos table...');
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, is_published')
      .limit(5);
    
    if (videosError) {
      console.error('❌ Videos error:', videosError);
    } else {
      console.log(`✅ Found ${videos?.length || 0} videos`);
      if (videos && videos.length > 0) {
        videos.forEach(v => console.log(`   - ${v.title} (${v.is_published ? 'Published' : 'Unpublished'})`));
      }
    }
    
    // Test 2: Fetch members
    console.log('\n👥 Testing members table...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('discord_id, discord_username')
      .limit(5);
    
    if (membersError) {
      console.error('❌ Members error:', membersError);
    } else {
      console.log(`✅ Found ${members?.length || 0} members`);
      if (members && members.length > 0) {
        members.forEach(m => console.log(`   - ${m.discord_username} (${m.discord_id})`));
      }
    }
    
    // Test 3: Fetch settings
    console.log('\n⚙️ Testing settings table...');
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .single();
    
    if (settingsError) {
      console.error('❌ Settings error:', settingsError);
    } else {
      console.log('✅ Settings loaded');
      console.log('   discord_guild_ids:', settings?.discord_guild_ids);
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testConnection();
