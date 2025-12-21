import { createClient } from '@supabase/supabase-js'

const fs = await import('fs')
const path = await import('path')

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    const envVars = {}
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=')
        if (key && values.length > 0) {
          envVars[key.trim()] = values.join('=').trim()
        }
      }
    })
    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnv()
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🔍 Checking Schema Status')
console.log('========================')

// Try a different approach - use PostgreSQL system tables
console.log('\n📊 Checking what tables exist in public schema...')

try {
  // Try using pg_tables instead of information_schema
  const { data, error } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')
  
  if (error) {
    console.log(`❌ Cannot access pg_tables: ${error.message}`)
    
    // Try a more basic approach - just try to create one table
    console.log('\n🔧 Trying to create a simple test table...')
    
    const { data: createData, error: createError } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1)
    
    if (createError && createError.message.includes('does not exist')) {
      console.log('✅ We can detect missing tables - this means connection works!')
      console.log('❌ But tables are not created yet')
      
      console.log('\n🎯 SOLUTION: Run this in Supabase SQL Editor:')
      console.log('https://supabase.com/dashboard/project/dlytcwpwtcfwacktpeur/sql')
      console.log('\nThen paste and run the schema SQL from schema-to-copy.sql')
      
    } else {
      console.log(`❌ Unexpected error: ${createError.message}`)
    }
  } else {
    console.log('✅ Tables in public schema:')
    if (data && data.length > 0) {
      data.forEach(table => {
        console.log(`   - ${table.tablename}`)
      })
    } else {
      console.log('   (No tables found)')
    }
    
    // Now check our specific tables
    console.log('\n📋 Checking our required tables:')
    const requiredTables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings']
    
    for (const tableName of requiredTables) {
      const exists = data?.some(t => t.tablename === tableName)
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`)
    }
  }
} catch (error) {
  console.log(`❌ Exception: ${error.message}`)
}

console.log('\n🔧 Next Steps:')
console.log('1. Go to: https://supabase.com/dashboard/project/dlytcwpwtcfwacktpeur/sql')
console.log('2. Copy ALL content from schema-to-copy.sql')
console.log('3. Paste it in SQL Editor')
console.log('4. Click RUN')
console.log('5. Wait for completion')
console.log('6. Run: node quick-test.js')
