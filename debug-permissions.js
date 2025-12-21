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

console.log('🔍 Debugging Permissions Issue')
console.log('================================')

// Test 1: Check if we can connect to the project at all
console.log('\n1️⃣ Testing basic project access...')
try {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  })
  
  console.log(`Status: ${response.status} ${response.statusText}`)
  
  if (response.status === 200) {
    console.log('✅ Project accessible')
  } else {
    const text = await response.text()
    console.log(`Response: ${text}`)
  }
} catch (error) {
  console.log(`❌ Network error: ${error.message}`)
}

// Test 2: Try to create a simple table directly
console.log('\n2️⃣ Testing table creation...')
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

try {
  const { data, error } = await supabase.rpc('sql', {
    query: 'CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY);'
  })
  
  if (error) {
    console.log(`❌ RPC failed: ${error.message}`)
  } else {
    console.log('✅ RPC worked')
  }
} catch (error) {
  console.log(`❌ RPC exception: ${error.message}`)
}

// Test 3: Check what tables exist
console.log('\n3️⃣ Checking existing tables...')
try {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  
  if (error) {
    console.log(`❌ Cannot query information_schema: ${error.message}`)
  } else {
    console.log('✅ Existing tables:')
    data.forEach(table => {
      console.log(`   - ${table.table_name}`)
    })
  }
} catch (error) {
  console.log(`❌ Exception: ${error.message}`)
}

// Test 4: Try to access our specific tables
console.log('\n4️⃣ Testing specific tables...')
const tables = ['members', 'admins', 'videos', 'view_sessions', 'alerts', 'settings']

for (const tableName of tables) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
    } else {
      console.log(`✅ ${tableName}: ${data || 0} rows`)
    }
  } catch (error) {
    console.log(`❌ ${tableName}: ${error.message}`)
  }
}

console.log('\n🎯 Diagnosis:')
console.log('1. If all tests fail → API key is wrong or project is suspended')
console.log('2. If basic access works but tables fail → Schema not created')
console.log('3. If some tables work → Partial schema created')
console.log('4. If information_schema fails → Permissions issue')
