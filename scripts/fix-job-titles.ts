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

const titleUpdates = [
  { email: 'mokfam7@gmail.com', job_title: '점장' },
  { email: 'rmaqkrdl1234@naver.com', job_title: '본사소속' },
  { email: 'lsm063073@naver.com', job_title: '실장' },
  { email: 'blackswan21@naver.com', job_title: '부장' },
  { email: '774cu25@gmail.com', job_title: '사원' },
  { email: 'althsmstptkd@gmail.com', job_title: '사원' },
  { email: 'kyunga@imun.co.kr', job_title: '사원' },
  { email: 'ap4788108@gmail.com', job_title: '사원' },
  { email: 'jaishwalkaran501@gmail.com', job_title: '사원' },
  { email: 'yongmangs@naver.com', job_title: '사원' },
  { email: 'dyloveu@naver.com', job_title: '사원' },
  { email: 'jaeun_pending@imun.co.kr', job_title: '사원' },
  { email: 'gyuhyun_inactive@imun.co.kr', job_title: '사원' },
  { email: 'ammy1212@naver.com', job_title: 'PT' },
  { email: 'gusdk7933@naver.com', job_title: 'PT' },
  { email: 'suunn3333@gmail.com', job_title: 'PT' },
  { email: 'jihog3969@gmail.com', job_title: 'PT' },
]

async function run() {
  console.log('=== 직급(job_title) 업데이트 ===\n')
  for (const u of titleUpdates) {
    const { error } = await supabase.from('users').update({ job_title: u.job_title }).eq('email', u.email)
    if (error) {
      console.error(`  실패: ${u.email} — ${error.message}`)
    } else {
      console.log(`  ${u.email} → ${u.job_title}`)
    }
  }
  console.log('\n=== 완료 ===')
}

run().catch(console.error)
