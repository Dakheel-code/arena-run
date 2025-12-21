// Check environment variables
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

console.log('🔍 Environment Variables Check:')
console.log('================================')

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
]

let allGood = true

requiredVars.forEach(varName => {
  const value = env[varName]
  if (!value) {
    console.log(`❌ ${varName}: MISSING`)
    allGood = false
  } else if (value.includes('your-project') || value.includes('your-super-secret')) {
    console.log(`⚠️  ${varName}: DEFAULT VALUE (needs real value)`)
    allGood = false
  } else if (value.length < 20) {
    console.log(`⚠️  ${varName}: TOO SHORT (might be incomplete)`)
    allGood = false
  } else {
    console.log(`✅ ${varName}: SET (${value.length} chars)`)
  }
})

console.log('\n📋 Summary:')
if (allGood) {
  console.log('✅ All environment variables look good!')
} else {
  console.log('❌ Some environment variables need to be fixed')
  console.log('\n🔧 To fix:')
  console.log('1. Go to https://supabase.com/dashboard')
  console.log('2. Select your project')
  console.log('3. Go to Settings → API')
  console.log('4. Copy the URL and keys to .env file')
}
