import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length > 0) {
    process.env[key.trim()] = vals.join('=').trim()
  }
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// 이메일 → 수정할 정보
const updates: { email: string; position_type: string; note?: string }[] = [
  { email: 'mokfam7@gmail.com', position_type: 'both' },           // 김정목 점장 홀+주방
  { email: 'rmaqkrdl1234@naver.com', position_type: 'both' },      // 이해준 본사소속 홀+주방
  { email: 'lsm063073@naver.com', position_type: 'kitchen' },      // 이승미 실장 주방
  { email: 'blackswan21@naver.com', position_type: 'kitchen' },    // 이준하 부장 주방
  { email: '774cu25@gmail.com', position_type: 'both' },           // 박시우 사원 홀+주방
  { email: 'althsmstptkd@gmail.com', position_type: 'kitchen' },   // 이지훈 사원 주방
  { email: 'kyunga@imun.co.kr', position_type: 'kitchen' },        // 민경아 사원 주방
  { email: 'ap4788108@gmail.com', position_type: 'kitchen' },      // 아난 사원 주방
  { email: 'jaishwalkaran501@gmail.com', position_type: 'kitchen' }, // 카란 사원 주방
  { email: 'yongmangs@naver.com', position_type: 'kitchen' },      // 김민경 사원 주방
  { email: 'dyloveu@naver.com', position_type: 'kitchen', note: '26.07.07 출근예정' }, // 이동열 사원 주방
]

async function fix() {
  console.log('=== 포지션/직급 정정 ===\n')
  const hashedPassword = await bcrypt.hash('0000', 10)

  // 1. 기존 직원 포지션 업데이트
  for (const u of updates) {
    const updateData: Record<string, unknown> = { position_type: u.position_type }
    if (u.note) updateData.note = u.note

    const { error } = await supabase.from('users').update(updateData).eq('email', u.email)
    if (error) {
      console.error(`  실패: ${u.email} — ${error.message}`)
    } else {
      console.log(`  수정: ${u.email} → position: ${u.position_type}${u.note ? ` (${u.note})` : ''}`)
    }
  }

  // 2. 김재운 재등록 (7월중 입사 예정, 사원, 주방)
  const { data: branch } = await supabase.from('branches').select('id').eq('name', '일산점').single()
  const branchId = branch?.id ?? null

  const { data: jaeun } = await supabase.from('users').select('id').eq('name', '김재운').single()
  if (!jaeun) {
    const { error } = await supabase.from('users').insert({
      name: '김재운',
      email: 'jaeun_pending@imun.co.kr',
      password: hashedPassword,
      role: 'user',
      employment_type: 'full_time',
      position_type: 'kitchen',
      branch_id: branchId,
      is_active: false,
      note: '7월중 입사 예정',
    })
    if (error) console.error(`  김재운 등록 실패: ${error.message}`)
    else console.log('  등록: 김재운 (7월중 입사 예정, 주방, 비활성)')
  } else {
    console.log('  김재운 이미 존재')
  }

  // 3. 김규현 재등록 (무단 근무지 이탈 → 비활성)
  const { data: gyuhyun } = await supabase.from('users').select('id').eq('name', '김규현').single()
  if (!gyuhyun) {
    const { error } = await supabase.from('users').insert({
      name: '김규현',
      email: 'gyuhyun_inactive@imun.co.kr',
      password: hashedPassword,
      role: 'user',
      employment_type: 'full_time',
      position_type: 'kitchen',
      branch_id: branchId,
      is_active: false,
      note: '26.07.01 무단 근무지 이탈',
    })
    if (error) console.error(`  김규현 등록 실패: ${error.message}`)
    else console.log('  등록: 김규현 (무단 근무지 이탈, 비활성)')
  } else {
    console.log('  김규현 이미 존재')
  }

  console.log('\n=== 완료 ===')
}

fix().catch(console.error)
