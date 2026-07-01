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

// 중복 에러난 직원들: 임시 이메일 삭제 + 실제 이메일 계정 업데이트
const duplicates = [
  { name: '이승미', oldEmail: 'seungmi@imun.co.kr', realEmail: 'lsm063073@naver.com', phone: '010-9068-5550' },
  { name: '이준하', oldEmail: 'junha@imun.co.kr', realEmail: 'blackswan21@naver.com', phone: '010-3264-3114' },
  { name: '박시우', oldEmail: 'siwoo@imun.co.kr', realEmail: '774cu25@gmail.com', phone: '010-4716-5270' },
  { name: '이지훈', oldEmail: 'jihoon@imun.co.kr', realEmail: 'althsmstptkd@gmail.com', phone: '010-8949-4525' },
  { name: '아난', oldEmail: 'anan@imun.co.kr', realEmail: 'ap4788108@gmail.com', phone: '010-5709-7063' },
  { name: '카란', oldEmail: 'karan@imun.co.kr', realEmail: 'jaishwalkaran501@gmail.com', phone: '010-2130-9571' },
  { name: '김민경', oldEmail: 'minkyung@imun.co.kr', realEmail: 'yongmangs@naver.com', phone: '010-2536-5489' },
]

async function fix() {
  console.log('=== 중복 직원 정리 ===\n')
  const hashedPassword = await bcrypt.hash('0000', 10)

  for (const emp of duplicates) {
    // 임시 이메일 계정 삭제
    const { data: old } = await supabase.from('users').select('id').eq('email', emp.oldEmail).single()
    if (old) {
      await supabase.from('users').delete().eq('id', old.id)
      console.log(`  삭제: ${emp.name} 임시계정 (${emp.oldEmail})`)
    }

    // 실제 이메일 계정 업데이트 (비밀번호, 전화번호, employment/position)
    const { data: real } = await supabase.from('users').select('id').eq('email', emp.realEmail).single()
    if (real) {
      await supabase.from('users').update({
        password: hashedPassword,
        phone: emp.phone,
        employment_type: 'full_time',
        position_type: 'hall',
      }).eq('id', real.id)
      console.log(`  업데이트: ${emp.name} (${emp.realEmail}) PW→0000`)
    } else {
      console.log(`  미발견: ${emp.name} (${emp.realEmail})`)
    }
  }

  console.log('\n=== 완료 ===')
}

fix().catch(console.error)
