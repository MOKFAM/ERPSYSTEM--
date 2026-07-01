import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim()
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
  const { data, error } = await supabase.from('users').delete().eq('email', 'rmaqkrdl1234@naver.com').select('id, name, email')
  if (error) {
    console.error('삭제 실패:', error.message)
  } else {
    console.log('삭제 완료:', data)
  }
}

run().catch(console.error)
