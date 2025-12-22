// سكربتات إعادة ربط قاعدة البيانات
// قم بتشغيل هذه السكربتات بالترتيب

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// تحميل متغيرات البيئة من .env
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    const env = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
    
    return env
  } catch (error) {
    console.log('⚠️  لم يتم العثور على ملف .env')
    return {}
  }
}

const env = loadEnv()

// 1. التحقق من الاتصال الأساسي
async function testBasicConnection() {
  console.log('🔍 التحقق من الاتصال الأساسي...')
  
  try {
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await supabase.from('members').select('count')
    
    if (error) {
      console.log('❌ فشل الاتصال:', error.message)
      return false
    }
    
    console.log('✅ الاتصال ناجح')
    return true
  } catch (error) {
    console.log('❌ خطأ في الاتصال:', error.message)
    return false
  }
}

// 2. التحقق من الجداول
async function checkTables() {
  console.log('🔍 التحقق من الجداول...')
  
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  const requiredTables = [
    'members',
    'admins', 
    'videos',
    'view_sessions',
    'alerts',
    'settings'
  ]
  
  const results = {}
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('count')
      if (error) {
        results[table] = '❌ missing'
      } else {
        results[table] = '✅ exists'
      }
    } catch (error) {
      results[table] = '❌ error'
    }
  }
  
  console.log('نتائج الجداول:')
  Object.entries(results).forEach(([table, status]) => {
    console.log(`  ${table}: ${status}`)
  })
  
  return results
}

// 3. التحقق من البيئة
function checkEnvironment() {
  console.log('🔍 التحقق من متغيرات البيئة...')
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_URL', 
    'VITE_SUPABASE_ANON_KEY'
  ]
  
  const results = {}
  
  required.forEach(envVar => {
    const value = env[envVar]
    if (!value) {
      results[envVar] = '❌ missing'
    } else if (envVar.includes('URL') && !value.startsWith('https://')) {
      results[envVar] = '❌ invalid format'
    } else if (envVar.includes('KEY') && value.length < 50) {
      results[envVar] = '❌ too short'
    } else {
      results[envVar] = '✅ ok'
    }
  })
  
  console.log('نتائج متغيرات البيئة:')
  Object.entries(results).forEach(([envVar, status]) => {
    console.log(`  ${envVar}: ${status}`)
  })
  
  return results
}

// 4. التحقق من صلاحيات RLS
async function checkRLS() {
  console.log('🔍 التحقق من سياسات RLS...')
  
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    const { data, error } = await supabase
      .from('members')
      .select('count')
      .eq('discord_id', 'test')
    
    if (error && error.message.includes('permission denied')) {
      console.log('✅ سياسات RLS تعمل')
    } else {
      console.log('⚠️  قد تكون هناك مشكلة في سياسات RLS')
    }
    return true
  } catch (error) {
    console.log('❌ خطأ في التحقق من السياسات:', error.message)
    return false
  }
}

// 5. الفحص الشامل
async function comprehensiveCheck() {
  console.log('🚀 بدء الفحص الشامل لقاعدة البيانات...\n')
  
  // التحقق من البيئة
  const envResults = checkEnvironment()
  const envOk = Object.values(envResults).every(status => status === '✅ ok')
  
  if (!envOk) {
    console.log('\n❌ يوجد مشاكل في متغيرات البيئة')
    console.log('يرجى تحديث ملف .env بالمفاتيح الصحيحة')
    return
  }
  
  // التحقق من الاتصال
  const connectionOk = await testBasicConnection()
  if (!connectionOk) {
    console.log('\n❌ فشل الاتصال بقاعدة البيانات')
    console.log('يرجى التحقق من URL ومفاتيح API')
    return
  }
  
  // التحقق من الجداول
  const tableResults = await checkTables()
  const tablesOk = Object.values(tableResults).every(status => status === '✅ exists')
  
  if (!tablesOk) {
    console.log('\n⚠️  بعض الجداول مفقودة')
    console.log('يرجى تطبيق مخطط قاعدة البيانات من schema-to-copy.sql')
  }
  
  // التحقق من RLS
  await checkRLS()
  
  console.log('\n🏁 انتهى الفحص الشامل')
  
  if (envOk && connectionOk && tablesOk) {
    console.log('🎉 كل شيء يعمل بشكل صحيح!')
  }
}

// تشغيل الفحص الشامل افتراضياً
if (require.main === module) {
  comprehensiveCheck()
}

module.exports = {
  testBasicConnection,
  checkTables,
  checkEnvironment,
  checkRLS,
  comprehensiveCheck
}
