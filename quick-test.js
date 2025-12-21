// Simple test after fixing keys
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

console.log('🚀 Quick Database Test')
console.log('=====================')

try {
  const { data, error } = await supabase.from('members').select('count')
  
  if (error) {
    console.log('❌ Still failing:', error.message)
    console.log('\n🔧 Check these in Supabase:')
    console.log('1. Project → Settings → API → copy service_role key')
    console.log('2. SQL Editor → run schema.sql')
  } else {
    console.log('✅ SUCCESS! Database connected')
    console.log(`📊 Members: ${data[0]?.count || 0}`)
  }
} catch (err) {
  console.log('❌ Exception:', err.message)
}
