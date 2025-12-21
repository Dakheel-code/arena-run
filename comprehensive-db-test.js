import { createClient } from '@supabase/supabase-js'

// Load environment variables
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
    console.log('❌ Could not read .env file')
    return {}
  }
}

const env = loadEnv()

console.log('🔍 Comprehensive Database Connection Test')
console.log('==========================================\n')

// Test 1: Basic URL validation
console.log('1️⃣ Testing URL format...')
const supabaseUrl = env.SUPABASE_URL
if (!supabaseUrl) {
  console.log('❌ SUPABASE_URL is missing')
} else if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.log('❌ SUPABASE_URL format is invalid')
  console.log(`   Current: ${supabaseUrl}`)
  console.log('   Expected: https://your-project.supabase.co')
} else {
  console.log(`✅ URL format looks good: ${supabaseUrl}`)
}

// Test 2: Test basic connectivity
console.log('\n2️⃣ Testing basic connectivity...')
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/`)
  if (response.ok) {
    console.log('✅ Supabase server is reachable')
  } else {
    console.log(`❌ Server responded with: ${response.status} ${response.statusText}`)
  }
} catch (error) {
  console.log(`❌ Cannot reach Supabase server: ${error.message}`)
}

// Test 3: Test with service role key
console.log('\n3️⃣ Testing Service Role Key...')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY is missing')
} else {
  const supabaseService = createClient(supabaseUrl, serviceKey)
  
  try {
    // Test basic health check
    const { data, error } = await supabaseService.rpc('version')
    if (error) {
      console.log('⚠️  RPC version failed, trying simple query...')
      
      // Try to list tables
      const { data: tables, error: tablesError } = await supabaseService
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .limit(5)
      
      if (tablesError) {
        console.log(`❌ Service Role query failed: ${tablesError.message}`)
        console.log(`   Details: ${tablesError.details || 'No details'}`)
      } else {
        console.log('✅ Service Role works!')
        console.log(`   Found tables: ${tables.map(t => t.tablename).join(', ')}`)
      }
    } else {
      console.log('✅ Service Role works! Database version:', data)
    }
  } catch (error) {
    console.log(`❌ Service Role failed with exception: ${error.message}`)
  }
}

// Test 4: Test with anon key
console.log('\n4️⃣ Testing Anon Key...')
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!anonKey) {
  console.log('❌ VITE_SUPABASE_ANON_KEY is missing')
} else {
  const supabaseAnon = createClient(supabaseUrl, anonKey)
  
  try {
    const { data, error } = await supabaseAnon
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(1)
    
    if (error) {
      console.log(`❌ Anon Key failed: ${error.message}`)
    } else {
      console.log('✅ Anon Key works!')
    }
  } catch (error) {
    console.log(`❌ Anon Key failed with exception: ${error.message}`)
  }
}

// Test 5: Check if our specific tables exist
console.log('\n5️⃣ Checking required tables...')
const expectedTables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings']

if (serviceKey) {
  const supabaseService = createClient(supabaseUrl, serviceKey)
  
  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabaseService
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ Table '${tableName}': ${error.message}`)
      } else {
        console.log(`✅ Table '${tableName}': ${data || 0} rows`)
      }
    } catch (error) {
      console.log(`❌ Table '${tableName}': ${error.message}`)
    }
  }
}

console.log('\n🎯 Next Steps:')
console.log('1. If Service Role works but Anon fails -> check RLS policies')
console.log('2. If both fail -> check API keys in Supabase dashboard')
console.log('3. If tables missing -> run schema.sql in Supabase SQL Editor')
console.log('4. If server unreachable -> check network/firewall')
