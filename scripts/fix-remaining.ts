import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
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
  const hashedPassword = await bcrypt.hash('0000', 10)

  // 이동열 포지션
  await supabase.from('users').update({ position_type: 'kitchen' }).eq('email', 'dyloveu@naver.com')
  console.log('이동열 → kitchen')

  const { data: branch } = await supabase.from('branches').select('id').eq('name', '일산점').single()
  const branchId = branch?.id ?? null

  // 김재운 재등록
  const r1 = await supabase.from('users').insert({ name: '김재운', email: 'jaeun_pending@imun.co.kr', password: hashedPassword, role: 'user', employment_type: 'full_time', position_type: 'kitchen', branch_id: branchId, is_active: false })
  console.log('김재운:', r1.error ? r1.error.message : '등록 완료 (7월 입사예정, 비활성)')

  // 김규현 재등록
  const r2 = await supabase.from('users').insert({ name: '김규현', email: 'gyuhyun_inactive@imun.co.kr', password: hashedPassword, role: 'user', employment_type: 'full_time', position_type: 'kitchen', branch_id: branchId, is_active: false })
  console.log('김규현:', r2.error ? r2.error.message : '등록 완료 (무단이탈, 비활성)')
}

run().catch(console.error)
