import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 파일에서 환경변수 읽기
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length > 0) {
    process.env[key.trim()] = vals.join('=').trim()
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ──────────────────────────────────────
// 판매 메뉴 (이문면옥 실제 메뉴)
// ──────────────────────────────────────
const menuItems = [
  // 냉면류
  { name: '이문 골동냉면 (숯불고기 포함)', price: 14000, category: '냉면류' },
  { name: '이문 물비빔 냉면 (숯불고기 포함)', price: 14500, category: '냉면류' },
  { name: '물냉면 (숯불고기 포함)', price: 14000, category: '냉면류' },
  { name: '비빔냉면 (숯불고기 포함)', price: 14000, category: '냉면류' },
  // 탕·국류
  { name: '이문 갈비탕', price: 16000, category: '탕·국류' },
  { name: '능이 보양 갈비탕', price: 19000, category: '탕·국류' },
  { name: '한우 양지 고음국', price: 20000, category: '탕·국류' },
  // 고기·곁들임
  { name: '갈비찜 (小)', price: 62000, category: '고기·곁들임' },
  { name: '갈비찜 (大)', price: 82000, category: '고기·곁들임' },
  { name: '한우 양지 수육', price: 35000, category: '고기·곁들임' },
  { name: '냉제육 — 최상품 육젓 (大)', price: 28000, category: '고기·곁들임' },
  { name: '냉제육 — 최상품 육젓 (小)', price: 18000, category: '고기·곁들임' },
  { name: '수제 만두 (한 접시)', price: 12000, category: '고기·곁들임' },
  { name: '수제 만두 (반 접시)', price: 6000, category: '고기·곁들임' },
  { name: '명태 회무침', price: 9000, category: '고기·곁들임' },
]

// ──────────────────────────────────────
// 재고 품목 (재고 기준표 기반)
// ──────────────────────────────────────
const inventoryItems = [
  // 01. 조미료
  { name: '미원', category: '조미료', unit: 'kg', spec: '3kg' },
  { name: '소고기다시다', category: '조미료', unit: 'kg', spec: '2kg' },
  // 02. 향신료·분말류
  { name: '고춧가루', category: '향신료·분말류', unit: 'kg', spec: '1kg' },
  { name: '강겨자', category: '향신료·분말류', unit: 'g', spec: '200g' },
  { name: '통흑후추', category: '향신료·분말류', unit: 'g', spec: '450g' },
  { name: '순후추 (오뚜기)', category: '향신료·분말류', unit: 'g', spec: '450g' },
  { name: '순후추 (맷돌표)', category: '향신료·분말류', unit: 'g', spec: '200g' },
  { name: '백후추', category: '향신료·분말류', unit: 'g', spec: '450g' },
  { name: '솔표계피', category: '향신료·분말류', unit: 'g', spec: '200g' },
  { name: '순계피', category: '향신료·분말류', unit: 'g', spec: '200g' },
  // 03. 전분·가루류
  { name: '고구마맛전분', category: '전분·가루류', unit: 'g', spec: '350g' },
  { name: '타피오카전분', category: '전분·가루류', unit: 'kg', spec: '1.2kg' },
  { name: '찹쌀가루', category: '전분·가루류', unit: 'kg', spec: '1kg' },
  { name: '밀가루', category: '전분·가루류', unit: 'kg', spec: '2.5kg' },
  // 04. 당류·소금·식품첨가물
  { name: '백설탕', category: '당류·소금', unit: 'kg', spec: '15kg' },
  { name: '신화당', category: '당류·소금', unit: 'g', spec: '50g' },
  { name: '천일염', category: '당류·소금', unit: 'kg', spec: '20kg' },
  { name: '꽃소금', category: '당류·소금', unit: 'kg', spec: '3kg' },
  { name: '식소다', category: '식품첨가물', unit: 'g', spec: '200g' },
  { name: '구연산', category: '식품첨가물', unit: 'g', spec: '750g' },
  { name: '카라멜색소', category: '식품첨가물', unit: 'kg', spec: '3.5kg' },
  // 05. 종실류
  { name: '들깨', category: '종실류', unit: 'kg', spec: '1kg' },
  { name: '날들깨', category: '종실류', unit: 'kg', spec: '1kg' },
  { name: '볶음흑임자', category: '종실류', unit: 'kg', spec: '1kg' },
  { name: '참깨볶음', category: '종실류', unit: 'kg', spec: '1kg' },
  { name: '깐잣', category: '종실류', unit: 'g', spec: '500g' },
  // 06. 건면·면류
  { name: '이관복면', category: '건면·면류', unit: '개', spec: '—' },
  { name: '메밀칼국수', category: '건면·면류', unit: 'g', spec: '500g' },
  { name: '당면', category: '건면·면류', unit: 'kg', spec: '2.4kg' },
  { name: '막국수', category: '건면·면류', unit: 'kg', spec: '12.7kg' },
  // 07. 식용유·기름류
  { name: '고추맛기름', category: '식용유·기름류', unit: 'L', spec: '1.8L' },
  { name: '참깨맛기름', category: '식용유·기름류', unit: 'L', spec: '1.8L' },
  { name: '참맛기름', category: '식용유·기름류', unit: 'L', spec: '1.8L' },
  { name: '들기름', category: '식용유·기름류', unit: 'L', spec: '1.8L' },
  { name: '쿠로마유', category: '식용유·기름류', unit: 'g', spec: '800g' },
  // 08. 간장·장류
  { name: '양조간장', category: '간장·장류', unit: 'ml', spec: '500ml' },
  { name: '맛간장', category: '간장·장류', unit: 'L', spec: '1.7L' },
  { name: '국간장', category: '간장·장류', unit: 'L', spec: '13L' },
  { name: '진간장', category: '간장·장류', unit: 'L', spec: '13L' },
  { name: '노두유', category: '간장·장류', unit: 'ml', spec: '500ml' },
  { name: '재래식된장', category: '간장·장류', unit: 'kg', spec: '3kg' },
  // 09. 식초류
  { name: '빙초산', category: '식초류', unit: 'ml', spec: '400ml' },
  { name: '사과식초', category: '식초류', unit: 'L', spec: '18L' },
  { name: '환만식초', category: '식초류', unit: 'L', spec: '18L' },
  { name: '화영식초', category: '식초류', unit: 'L', spec: '18L' },
  // 10. 소스·감미료류
  { name: '팬더굴소스', category: '소스·감미료류', unit: 'kg', spec: '2kg' },
  { name: '연두링', category: '소스·감미료류', unit: 'g', spec: '140g' },
  { name: '연두 (830ml)', category: '소스·감미료류', unit: 'ml', spec: '830ml' },
  { name: '연두 (500ml)', category: '소스·감미료류', unit: 'ml', spec: '500ml' },
  { name: '참소스', category: '소스·감미료류', unit: 'kg', spec: '2.1kg' },
  { name: '물엿', category: '소스·감미료류', unit: 'kg', spec: '9kg' },
  { name: '맥아물엿', category: '소스·감미료류', unit: 'kg', spec: '9kg' },
  { name: '올리고당', category: '소스·감미료류', unit: 'kg', spec: '2.45kg' },
  { name: '매실청 (오뚜기)', category: '소스·감미료류', unit: 'g', spec: '660g' },
  { name: '매실청 (청정원)', category: '소스·감미료류', unit: 'g', spec: '650g' },
  { name: '미림', category: '소스·감미료류', unit: 'L', spec: '1.8L' },
  // 11. 액젓·육수류
  { name: '까나리액젓', category: '액젓·육수류', unit: 'kg', spec: '9kg' },
  { name: '참치액', category: '액젓·육수류', unit: 'L', spec: '1.8L' },
  { name: '멸치육수', category: '액젓·육수류', unit: 'L', spec: '1.8L' },
  // 12. 건어물·건조식재
  { name: '건새우', category: '건어물·건조식재', unit: 'g', spec: '100g' },
  { name: '김가루', category: '건어물·건조식재', unit: 'kg', spec: '1kg' },
  { name: '건다시마', category: '건어물·건조식재', unit: '개', spec: '—' },
  { name: '흑마늘', category: '건어물·건조식재', unit: 'kg', spec: '1kg' },
  // 13. 곡류
  { name: '쌀', category: '곡류', unit: 'kg', spec: '20kg' },
  // 14. 음료·음료베이스
  { name: '단호박식혜', category: '음료·음료베이스', unit: 'g', spec: '1000g' },
  { name: '전통식혜', category: '음료·음료베이스', unit: 'g', spec: '1000g' },
  { name: '자색고구마청', category: '음료·음료베이스', unit: 'kg', spec: '1.2kg' },
  { name: '보리차진액', category: '음료·음료베이스', unit: 'g', spec: '1000g' },
  { name: '콜라', category: '음료·음료베이스', unit: 'L', spec: '1.5L' },
  { name: '사이다', category: '음료·음료베이스', unit: 'L', spec: '1.5L' },
  // 15. 야채·채소
  { name: '양파', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '대파', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '쪽파', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '오이', category: '야채·채소', unit: '개', spec: '—' },
  { name: '청양고추', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '무', category: '야채·채소', unit: '개', spec: '—' },
  { name: '얼갈이', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '통마늘', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '간마늘', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '생강', category: '야채·채소', unit: 'kg', spec: '—' },
  { name: '새싹', category: '야채·채소', unit: '팩', spec: '—' },
  { name: '어린잎', category: '야채·채소', unit: '팩', spec: '—' },
  { name: '계란', category: '야채·채소', unit: '판', spec: '—' },
  // 16. 과일·버섯
  { name: '사과', category: '과일·버섯', unit: '개', spec: '—' },
  { name: '배', category: '과일·버섯', unit: '개', spec: '—' },
  { name: '은행', category: '과일·버섯', unit: 'g', spec: '—' },
  { name: '대추', category: '과일·버섯', unit: 'g', spec: '—' },
  { name: '새송이버섯', category: '과일·버섯', unit: '팩', spec: '—' },
  { name: '표고버섯', category: '과일·버섯', unit: '팩', spec: '—' },
  // 17. 김치·절임류
  { name: '배추김치', category: '김치·절임류', unit: 'kg', spec: '—' },
  { name: '깍두기', category: '김치·절임류', unit: 'kg', spec: '—' },
  { name: '열무', category: '김치·절임류', unit: 'kg', spec: '—' },
  // 18. 고기·정육
  { name: 'BBQ(갈비)', category: '고기·정육', unit: 'kg', spec: '—' },
  { name: '스페어(갈비)', category: '고기·정육', unit: 'kg', spec: '—' },
  { name: '돼지고기(전지)', category: '고기·정육', unit: 'kg', spec: '—' },
  // 19. 냉동·가공식품
  { name: '고기만두', category: '냉동·가공식품', unit: '개', spec: '—' },
  { name: '김치만두', category: '냉동·가공식품', unit: '개', spec: '—' },
  { name: '냉면', category: '냉동·가공식품', unit: '인분', spec: '—' },
  { name: '가래떡', category: '냉동·가공식품', unit: 'kg', spec: '—' },
  // 20. 소모품
  { name: '숯', category: '소모품', unit: 'kg', spec: '6kg' },
  { name: '부탄가스', category: '소모품', unit: '개', spec: '—' },
  { name: '니트릴장갑', category: '소모품', unit: '박스', spec: '100매' },
  { name: '종이위생모', category: '소모품', unit: '팩', spec: '30장' },
  { name: '위생마스크', category: '소모품', unit: '팩', spec: '20개입' },
  { name: '면장갑', category: '소모품', unit: '켤레', spec: '—' },
  { name: '롤백 (45×55)', category: '소모품', unit: '롤', spec: '45×55' },
  { name: '롤백 (35×45)', category: '소모품', unit: '롤', spec: '35×45' },
  { name: '롤백 (30×40)', category: '소모품', unit: '롤', spec: '30×40' },
  { name: '유니랩', category: '소모품', unit: '개', spec: '28cm' },
  { name: '쿠킹호일', category: '소모품', unit: '개', spec: '30×300' },
  { name: '오븐크리너', category: '소모품', unit: '개', spec: '—' },
  { name: '스펀지수세미', category: '소모품', unit: '개', spec: '—' },
  { name: '울스텐수세미', category: '소모품', unit: '개', spec: '—' },
  { name: '퐁퐁', category: '소모품', unit: 'L', spec: '13L' },
  { name: '락스', category: '소모품', unit: 'L', spec: '18L' },
]

async function seed() {
  console.log('=== 이문면옥 데이터 시드 시작 ===\n')

  // 1. 지점(일산점) ID 조회
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('name', '일산점')
    .single()

  const branchId = branch?.id ?? null
  console.log(`지점: 일산점 (${branchId ?? '없음'})\n`)

  // 2. 메뉴 등록
  console.log('── 메뉴 등록 ──')
  const { data: existingMenus } = await supabase.from('menu_items').select('name')
  const existingMenuNames = new Set((existingMenus ?? []).map((m) => m.name))

  const newMenus = menuItems.filter((m) => !existingMenuNames.has(m.name))
  if (newMenus.length > 0) {
    const { error } = await supabase.from('menu_items').insert(
      newMenus.map((m) => ({
        name: m.name,
        price: m.price,
        category: m.category,
        is_active: true,
      }))
    )
    if (error) {
      console.error('메뉴 등록 실패:', error.message)
    } else {
      console.log(`${newMenus.length}개 메뉴 등록 완료`)
    }
  } else {
    console.log('이미 등록된 메뉴 — 건너뜀')
  }

  // 3. 재고 품목 등록
  console.log('\n── 재고 품목 등록 ──')
  const { data: existingItems } = await supabase.from('inventory_items').select('name')
  const existingItemNames = new Set((existingItems ?? []).map((i) => i.name))

  const newItems = inventoryItems.filter((i) => !existingItemNames.has(i.name))
  if (newItems.length > 0) {
    // Supabase 한번에 너무 많으면 실패할 수 있어 50개씩 나눠서
    for (let i = 0; i < newItems.length; i += 50) {
      const batch = newItems.slice(i, i + 50)
      const { error } = await supabase.from('inventory_items').insert(
        batch.map((item) => ({
          name: item.name,
          category: item.category,
          unit: item.unit,
          current_qty: 0,
          min_qty: 0,
          branch_id: branchId,
        }))
      )
      if (error) {
        console.error(`재고 등록 실패 (배치 ${i / 50 + 1}):`, error.message)
      } else {
        console.log(`${batch.length}개 품목 등록 (배치 ${i / 50 + 1})`)
      }
    }
    console.log(`총 ${newItems.length}개 재고 품목 등록 완료`)
  } else {
    console.log('이미 등록된 품목 — 건너뜀')
  }

  console.log('\n=== 시드 완료 ===')
}

seed().catch(console.error)
