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

const employees = [
  // 정직원 — 홀
  { name: '이해준', email: 'haejun@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '이승미', email: 'seungmi@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '이준하', email: 'junha@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '박시우', email: 'siwoo@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '이지훈', email: 'jihoon@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '민경아', email: 'kyunga@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '아난', email: 'anan@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '카란', email: 'karan@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  { name: '김민경', email: 'minkyung@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'hall' },
  // 정직원 — 주방
  { name: '이동열', email: 'dongyeol@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'kitchen' },
  { name: '김재운', email: 'jaeun@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'kitchen' },
  { name: '김규현', email: 'gyuhyun@imun.co.kr', role: 'user', employment_type: 'full_time', position_type: 'kitchen' },
  // PT(알바) — 홀
  { name: '정태연', email: 'taeyeon@imun.co.kr', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  { name: '정현아', email: 'hyuna@imun.co.kr', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  { name: '김지호', email: 'jiho@imun.co.kr', role: 'user', employment_type: 'part_time', position_type: 'hall' },
  // PT(알바) — 홀+주방
  { name: '권민선', email: 'minseon@imun.co.kr', role: 'user', employment_type: 'part_time', position_type: 'both' },
]

async function seed() {
  console.log('=== 직원 등록 시작 ===\n')

  // 지점 조회
  const { data: branch } = await supabase.from('branches').select('id').eq('name', '일산점').single()
  const branchId = branch?.id ?? null

  const hashedPassword = await bcrypt.hash('123456789', 10)

  for (const emp of employees) {
    // 이미 있는지 확인
    const { data: existing } = await supabase.from('users').select('id').eq('email', emp.email).single()
    if (existing) {
      console.log(`  이미 등록: ${emp.name} (${emp.email})`)
      continue
    }

    const { error } = await supabase.from('users').insert({
      email: emp.email,
      name: emp.name,
      password: hashedPassword,
      role: emp.role,
      employment_type: emp.employment_type,
      position_type: emp.position_type,
      branch_id: branchId,
      is_active: true,
    })

    if (error) {
      console.error(`  실패: ${emp.name} — ${error.message}`)
    } else {
      console.log(`  등록: ${emp.name} (${emp.email}) [${emp.employment_type === 'part_time' ? 'PT' : '정직원'}/${emp.position_type}]`)
    }
  }

  console.log('\n=== 완료 ===')
  console.log('※ 민경아님은 이메일이 없어 임시 이메일(kyunga@imun.co.kr)로 등록됨')
  console.log('  → 비밀번호 로그인 가능: kyunga@imun.co.kr / 123456789')
}

seed().catch(console.error)
