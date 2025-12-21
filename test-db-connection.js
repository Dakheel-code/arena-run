import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env file
const fs = await import('fs')
const path = await import('path')

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=')
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim()
        }
      }
    })
  } catch (error) {
    console.log('⚠️  Could not load .env file')
  }
}

loadEnv()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔑 Testing with Service Role Key...')
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase.from('members').select('count')
    
    if (error) {
      console.error('❌ Service Role failed:', error.message)
      
      // Try with anon key
      console.log('\n🔑 Testing with Anon Key...')
      if (anonKey) {
        const supabaseAnon = createClient(supabaseUrl, anonKey)
        const { data: anonData, error: anonError } = await supabaseAnon.from('members').select('count')
        
        if (anonError) {
          console.error('❌ Anon Key also failed:', anonError.message)
        } else {
          console.log('✅ Anon Key works! Count:', anonData)
        }
      }
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log('📊 Members count:', data)
    
    // Test all tables
    const tables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings']
    
    for (const table of tables) {
      try {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (tableError) {
          console.log(`⚠️  Table '${table}': ${tableError.message}`)
        } else {
          console.log(`✅ Table '${table}': ${count} rows`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`)
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testConnection()
