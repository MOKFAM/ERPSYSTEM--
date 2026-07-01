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
  // Find 이해준 by name (the rmaqkrdl1234 one was deleted, so find the remaining one)
  const { data } = await supabase.from('users').select('id, name, email, job_title').eq('name', '이해준')
  console.log('이해준 현재:', data)

  if (data && data.length > 0) {
    for (const u of data) {
      await supabase.from('users').update({ job_title: '본사파견' }).eq('id', u.id)
      console.log(`${u.email} → 본사파견`)
    }
  }
}

run().catch(console.error)
