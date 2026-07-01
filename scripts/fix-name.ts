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
  const { error } = await supabase.from('users').update({ name: '김정목' }).eq('email', 'mokfam7@gmail.com')
  console.log(error ? `실패: ${error.message}` : '김정목 이름 수정 완료')
}

run().catch(console.error)
