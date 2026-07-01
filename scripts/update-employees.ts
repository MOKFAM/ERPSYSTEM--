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

// 이미지 기준 실제 직원 정보
const employees = [
  // 정직원 — 홀
  { name: '이해준', oldEmail: 'haejun@imun.co.kr', newEmail: 'rmaqkrdl1234@naver.com', phone: '010-7980-7630', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '이승미', oldEmail: 'seungmi@imun.co.kr', newEmail: 'lsm063073@naver.com', phone: '010-9068-5550', role: 'user', employment_type: 'full_time', position_type: 'hall', note: '실장' },
  { name: '이준하', oldEmail: 'junha@imun.co.kr', newEmail: 'blackswan21@naver.com', phone: '010-3264-3114', role: 'user', employment_type: 'full_time', position_type: 'hall', note: '부장' },
  { name: '박시우', oldEmail: 'siwoo@imun.co.kr', newEmail: '774cu25@gmail.com', phone: '010-4716-5270', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '이지훈', oldEmail: 'jihoon@imun.co.kr', newEmail: 'althsmstptkd@gmail.com', phone: '010-8949-4525', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '민경아', oldEmail: 'kyunga@imun.co.kr', newEmail: null, phone: '010-6338-0286', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '아난', oldEmail: 'anan@imun.co.kr', newEmail: 'ap4788108@gmail.com', phone: '010-5709-7063', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '카란', oldEmail: 'karan@imun.co.kr', newEmail: 'jaishwalkaran501@gmail.com', phone: '010-2130-9571', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '김민경', oldEmail: 'minkyung@imun.co.kr', newEmail: 'yongmangs@naver.com', phone: '010-2536-5489', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  // 정직원 — 주방
  { name: '이동열', oldEmail: 'dongyeol@imun.co.kr', newEmail: 'dyloveu@naver.com', phone: '010-2325-4769', role: 'user', employment_type: 'full_time', position_type: 'kitchen', note: '26.07.07 출근예정' },
  // PT(알바) — 홀
  { name: '정태연', oldEmail: 'taeyeon@imun.co.kr', newEmail: 'ammy1212@naver.com', phone: '010-5409-7033', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  { name: '정현아', oldEmail: 'hyuna@imun.co.kr', newEmail: 'gusdk7933@naver.com', phone: '010-7933-8941', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  { name: '김지호', oldEmail: 'jiho@imun.co.kr', newEmail: 'jihog3969@gmail.com', phone: '010-7360-5451', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  // PT(알바) — 홀+주방
  { name: '권민선', oldEmail: 'minseon@imun.co.kr', newEmail: 'suunn3333@gmail.com', phone: '010-5870-4430', role: 'user', employment_type: 'part_time', position_type: 'both' },
]

// 이미지에 없는 직원 (삭제 대상)
const removeOldEmails = ['jaeun@imun.co.kr', 'gyuhyun@imun.co.kr']

async function update() {
  console.log('=== 직원 정보 업데이트 시작 ===\n')

  const hashedPassword = await bcrypt.hash('0000', 10)

  // 1. 관리자(김정목) 비밀번호도 0000으로 변경
  const { error: adminErr } = await supabase
    .from('users')
    .update({ password: hashedPassword, phone: '010-2912-9789' })
    .eq('email', 'mokfam7@gmail.com')
  if (adminErr) {
    console.error(`  관리자 업데이트 실패: ${adminErr.message}`)
  } else {
    console.log('  관리자(김정목): 비밀번호 → 0000, 전화번호 추가')
  }

  // 2. 기존 직원 업데이트
  for (const emp of employees) {
    // 이전 임시 이메일로 찾기
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emp.oldEmail)
      .single()

    if (existing) {
      const updateData: Record<string, unknown> = {
        password: hashedPassword,
        phone: emp.phone,
      }
      if (emp.newEmail) {
        updateData.email = emp.newEmail
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existing.id)

      if (error) {
        console.error(`  실패: ${emp.name} — ${error.message}`)
      } else {
        console.log(`  수정: ${emp.name} | ${emp.oldEmail} → ${emp.newEmail ?? '(이메일 없음 - 유지)'} | PW→0000`)
      }
    } else {
      // 새 이메일로도 찾아보기 (이미 수정된 경우)
      if (emp.newEmail) {
        const { data: byNew } = await supabase
          .from('users')
          .select('id')
          .eq('email', emp.newEmail)
          .single()
        if (byNew) {
          await supabase.from('users').update({ password: hashedPassword, phone: emp.phone }).eq('id', byNew.id)
          console.log(`  수정(이미 변경됨): ${emp.name} | ${emp.newEmail} | PW→0000`)
          continue
        }
      }
      console.log(`  미발견: ${emp.name} (${emp.oldEmail}) — 새로 등록 필요할 수 있음`)
    }
  }

  // 3. 이미지에 없는 직원 삭제
  for (const email of removeOldEmails) {
    const { data: found } = await supabase.from('users').select('id, name').eq('email', email).single()
    if (found) {
      const { error } = await supabase.from('users').delete().eq('id', found.id)
      if (error) {
        console.error(`  삭제 실패: ${found.name} — ${error.message}`)
      } else {
        console.log(`  삭제: ${found.name} (${email}) — 명단에 없음`)
      }
    }
  }

  console.log('\n=== 완료 ===')
  console.log('모든 직원 비밀번호: 0000')
  console.log('※ 민경아님: 이메일 없음 → kyunga@imun.co.kr 유지 (추후 대체 로그인 방법 필요)')
}

update().catch(console.error)
