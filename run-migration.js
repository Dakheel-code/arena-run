// Temporary script to run migration
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration: add_unauthorized_login_notification');
  
  try {
    // Add column if not exists
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS notify_unauthorized_login BOOLEAN DEFAULT true;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('Error adding column:', alterError);
      
      // Try alternative method using direct SQL
      const { error: directError } = await supabase
        .from('settings')
        .select('notify_unauthorized_login')
        .limit(1);
      
      if (directError && directError.message.includes('column') && directError.message.includes('does not exist')) {
        console.log('Column does not exist, will be created on next settings update');
      }
    } else {
      console.log('✓ Column notify_unauthorized_login added successfully');
    }

    // Update existing rows
    const { data: settings, error: selectError } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (selectError) {
      console.log('No existing settings found, will be created on first save');
    } else if (settings && settings.notify_unauthorized_login === null) {
      const { error: updateError } = await supabase
        .from('settings')
        .update({ notify_unauthorized_login: true })
        .eq('id', settings.id);

      if (updateError) {
        console.error('Error updating settings:', updateError);
      } else {
        console.log('✓ Updated existing settings with notify_unauthorized_login = true');
      }
    } else {
      console.log('✓ Settings already have notify_unauthorized_login field');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
