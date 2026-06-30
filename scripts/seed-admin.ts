/**
 * 초기 관리자 계정 생성 스크립트
 *
 * 사용법:
 *   npx tsx scripts/seed-admin.ts
 *
 * .env.local에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 파일에서 환경변수 읽기
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) {
    process.env[key.trim()] = vals.join('=').trim()
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // 1. 일산점 지점 확인 또는 생성
  const { data: existingBranch } = await supabase
    .from('branches')
    .select('id')
    .eq('name', '일산점')
    .single()

  let branchId: string

  if (existingBranch) {
    branchId = existingBranch.id
    console.log('기존 일산점 지점 발견:', branchId)
  } else {
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({ name: '일산점', address: '경기도 고양시 일산', phone: '031-000-0000' })
      .select('id')
      .single()

    if (error || !newBranch) {
      console.error('지점 생성 실패:', error?.message)
      process.exit(1)
    }
    branchId = newBranch.id
    console.log('일산점 지점 생성 완료:', branchId)
  }

  // 2. 관리자 계정 생성
  const email = 'admin@imun.co.kr'
  const password = 'admin1234'
  const hashedPassword = await bcrypt.hash(password, 10)

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    console.log('관리자 계정이 이미 존재합니다:', email)
    return
  }

  const { error } = await supabase.from('users').insert({
    email,
    password: hashedPassword,
    name: '점장',
    role: 'admin',
    employment_type: 'full_time',
    position_type: 'both',
    job_title: '점장',
    branch_id: branchId,
    hire_date: new Date().toISOString().split('T')[0],
  })

  if (error) {
    console.error('관리자 생성 실패:', error.message)
    process.exit(1)
  }

  console.log('관리자 계정 생성 완료!')
  console.log(`  이메일: ${email}`)
  console.log(`  비밀번호: ${password}`)
  console.log('  ※ 로그인 후 반드시 비밀번호를 변경하세요.')
}

main()
