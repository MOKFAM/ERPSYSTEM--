# 작업 인수인계 (Cursor → Claude Code)

> 이 문서는 다른 AI(Claude Code 등)가 이 프로젝트를 **이어서 작업**할 수 있도록 현재 상태를 정리한 것입니다.
> 마지막 갱신: 2026-06-30

---

## 1. 프로젝트 개요

- **이름:** 이문면옥 ERP 시스템 (식당 운영 통합 관리)
- **스택:** Next.js 16.2.9 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / NextAuth v5(beta) / Supabase(Postgres)
- **DB 접근:** 서버 액션에서 `@supabase/supabase-js` service role 키 사용 (`src/lib/supabase.ts`)
- **인증:** NextAuth (`src/lib/auth.ts`), 역할 `admin` / `manager` / `user`
  - **마스터 관리자 = `admin`** 으로 간주 (인사노무/감사로그 전용 접근)

### 중요 규칙 (AGENTS.md)
> 이 Next.js는 학습 데이터와 다를 수 있는 버전입니다. 코드 작성 전 `node_modules/next/dist/docs/` 의 관련 문서를 먼저 확인할 것. (App Router, server actions 등)

### 실행 / 환경
```bash
npm run dev        # 개발 서버
npm run build      # 빌드
npx tsc --noEmit   # 타입 체크 (커밋 전 권장)
npm run lint       # 린트
```
- 환경변수: `.env.local` 에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, NextAuth 관련 키 존재 (이미 설정됨)
- 초기 관리자 시드: `scripts/seed-admin.ts`

---

## 2. ⚠️ 가장 먼저 할 일 — DB 마이그레이션 실행

직전 세션에서 **스키마 파일(`supabase-schema.sql`)에는 추가했지만, Supabase에 아직 실행 안 했을 수 있는** 테이블이 2개 있습니다.
Supabase SQL Editor에서 아래를 실행하세요. (모두 `IF NOT EXISTS` 라 재실행해도 안전)

### (A) 감사 로그 테이블
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### (B) 면담/인사 기록 테이블
```sql
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'interview' CHECK (category IN ('interview', 'warning', 'reprimand', 'reward')),
  title TEXT NOT NULL,
  content TEXT,
  interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_category ON interviews(category);
CREATE INDEX IF NOT EXISTS idx_interviews_interview_date ON interviews(interview_date DESC);
CREATE OR REPLACE TRIGGER trigger_interviews_updated_at
  BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
```

### 실행 확인
```sql
SELECT to_regclass('public.audit_logs') IS NOT NULL AS audit_logs_ok,
       to_regclass('public.interviews') IS NOT NULL AS interviews_ok;
```
> 다른 테이블(`branches`, `users`, `attendance`, `leaves`, `schedules`, `payroll`, `sales`,
> `menu_items`, `menu_recipes`, `inventory_items`, `inventory_logs`,
> `purchase_orders`, `approvals`, `approval_steps`, `notifications`)은 이미 생성된 상태로 확인됨.

---

## 3. 직전 세션에서 완료한 작업 (이번 핸드오프 직전)

### 감사 로그 (체크리스트 7-18 ~ 7-20, 7-23) ✅
- `supabase-schema.sql`: `audit_logs` 테이블 정의 추가
- `src/lib/types.ts`: `AuditLog` 타입 + `AUDIT_ENTITY_LABELS` / `AUDIT_ACTION_LABELS` + `toAuditLog`
- `src/lib/audit.ts` **(신규)**: `recordAudit()` best-effort 기록 헬퍼 (**비밀번호 등 민감 필드 자동 제외**)
- `src/actions/audit.ts` **(신규)**: `getAuditLogs()` (admin 전용, 대상/액션 필터)
- 기존 액션에 감사 로그 연동 (수정/삭제 시 **원본 보존**):
  - `src/actions/users.ts` — 직원 생성/수정/비활성화
  - `src/actions/payroll.ts` — 급여 개별 확정 / 일괄 확정
  - `src/actions/purchase-orders.ts` — 발주 승인/반려
- `src/app/(authenticated)/admin/audit/page.tsx` + `audit-client.tsx` **(신규)**: 관리자 전용 조회 UI (대상 필터 + 변경 전/후 JSON 비교)
- `src/components/sidebar.tsx`: `감사 로그` 메뉴 추가 (admin)

### 면담/인사노무 (체크리스트 7-14 ~ 7-17, 7-22) ✅
- `supabase-schema.sql`: `interviews` 테이블 정의 추가
- `src/lib/types.ts`: `Interview` / `InterviewCategory`(interview·warning·reprimand·reward) + 라벨 + `toInterview`
- `src/actions/interviews.ts` **(신규)**: admin 전용 CRUD
  - 면담 CRUD(7-15) + 인사조치(경고/시말서/포상)를 `category` 로 통합 관리(7-16)
  - **열람 로그(7-17):** `getInterviews()` 호출 시 `audit_logs` 에 `view` 기록
  - 모든 생성/수정/삭제 → 감사 로그 + 원본 보존
- `src/app/(authenticated)/admin/interviews/page.tsx` + `interviews-client.tsx` **(신규)**: 직원·구분 필터, 추가/수정/삭제, **CSV 내보내기(7-14)**
- `src/components/sidebar.tsx`: `면담/인사 기록` 메뉴 추가 (admin)
- 감사 페이지에 `면담/인사` 대상 + `열람` 액션 라벨 추가

> 직전 세션의 그 이전 작업: 발주/결재 시스템(6단계), 인앱 알림 + 알림센터, CSV 내보내기(매출/재고/근태/급여), 검색/필터.

---

## 4. 진행률 & 체크리스트 상태

- 진행 파일: `erpsystem-checklist.json` (작업 완료 시 `done: true` 갱신 + `summary` 갱신)
- 현재 `summary`: **45 / 88 (51%)** 로 기록됨

### ⚠️ 체크리스트 동기화 문제 (꼭 확인할 것)
`erpsystem-checklist.json` 의 **2~5단계가 `not_started` / `done:false` 로 남아 있으나, 실제 코드에는 이미 구현되어 있음.**
(예: `src/actions/attendance.ts`, `leaves.ts`, `schedules.ts`, `payroll.ts`, `sales.ts`, `inventory.ts`, `menu.ts`
그리고 대응 페이지들이 `src/app/(authenticated)/` 아래 존재)

또한 `summary.totalFeatures` 값(88)과 실제 항목 수(103)가 불일치함.

**→ 이어받는 작업자는 먼저 체크리스트를 실제 코드 기준으로 재점검/동기화한 뒤 진행 권장.**
빠른 점검 명령:
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('erpsystem-checklist.json','utf8'));d.phases.forEach(p=>{const u=p.features.filter(f=>!f.done);if(u.length){console.log('['+p.phase+'] '+p.name+' ('+p.status+')');u.forEach(f=>console.log('   - '+f.id+' '+f.name))}});const a=d.phases.flatMap(p=>p.features);console.log('\nTOTAL done',a.filter(f=>f.done).length,'/',a.length)"
```

---

## 5. 남은 작업 (체크리스트 기준 미완료)

### 7단계 (보조 기능) — 거의 완료, 1개 남음
- **7-5 보건증 만기 알림** — 자동 발송은 cron/스케줄러 필요.
  우회안: 관리자 페이지 진입 시 만기 임박 보건증을 조회해 `notifications` 생성하는 방식.
  (`src/lib/notify.ts`, `documents` 관련 액션 활용. `Document` 만기일 필드 확인 필요)

### 8단계 (본사 통합 / 다지점 / 모바일) — 미착수
- 8-1 지점별 매출 현황, 8-2 지점별 재고 현황, 8-3 매출/재고 비교 분석
- 8-4 주간/월간 요약 리포트, 8-5 주요 지표 시각화
- 8-6 지점 코드 기반 다지점 구조, 8-7 신규 지점 온보딩, 8-8 모바일 최적화

### 1단계 보강 (미완료로 남음)
- 1-2 비밀번호 정책, 1-3 세션 관리(자동 로그아웃/중복 로그인 방지)
- 1-6 마스터 관리자 보안 등급 — 현재 `admin` 으로 대체 구현됨(별도 플래그 도입 여부 결정 필요)

> ※ 2~5단계 항목들은 코드상 구현되어 있으므로, 체크리스트만 맞추면 되는 경우가 많음(§4 참조).

---

## 6. 개발 패턴 / 컨벤션 (이 프로젝트에서 지킬 것)

작업 흐름: **DB(SQL) → `types.ts` → `actions/*.ts`(서버 액션) → 페이지(server `page.tsx` + `*-client.tsx`)**

- **타입:** 모든 엔티티 타입과 `to<Entity>()` mapper(snake_case row → camelCase)를 `src/lib/types.ts` 에 집중
- **서버 액션:** 파일 상단 `'use server'`, 함수 시작부에 권한 가드(`requireAdmin` / `requireManagerOrAdmin` / `requireAuth`), 변경 후 `revalidatePath(...)`
- **페이지:** `page.tsx`(서버, 세션 체크 후 `redirect`) + `*-client.tsx`(`'use client'`, `useState`/`useTransition`)
- **권한 가드 예시:** `auth()` 로 세션 조회 후 `session.user.role` 검사
- **CSV:** `src/lib/csv.ts` 의 `downloadCsv(filename, headers, rows)` 재사용 (UTF-8 BOM, 한글 엑셀 호환)
- **알림:** `src/lib/notify.ts` 의 `notifyUser` / `notifyManagers` (best-effort, 실패해도 본 흐름 막지 않음)
- **감사 로그:** 민감/중요 변경에는 `src/lib/audit.ts` 의 `recordAudit(...)` 호출 (수정/삭제 시 `beforeData` 보존)
- **스타일:** Tailwind, 한국어 UI 라벨. 텍스트 대비를 위해 `text-gray-900`/`text-gray-700` 사용
- 코드 주석은 의도/제약만. 동작 나열식 주석 금지.

### 주요 파일 위치
```
src/lib/        types.ts, auth.ts, supabase.ts, notify.ts, audit.ts, csv.ts, holidays.ts
src/actions/    users, branches, attendance, leaves, schedules, payroll, sales,
                inventory, menu, documents, purchase-orders, notifications, audit, interviews
src/app/(authenticated)/        사용자용 페이지 (dashboard, attendance, leaves, schedules, payroll, sales, ...)
src/app/(authenticated)/admin/  관리자용 페이지 (users, branches, attendance, leaves, payroll, sales,
                                schedules, inventory, menu, documents, purchase-orders, audit, interviews)
src/components/ sidebar.tsx, header.tsx, notification-bell.tsx, clock-button.tsx, providers.tsx
supabase-schema.sql             전체 DB 스키마 (추가분 누적)
erpsystem-checklist.json        진행 체크리스트 (작업 후 갱신)
erpsystem-goal.md               전체 요구사항/데이터 모델 명세
```

---

## 7. Claude Code에서 이어받는 첫 프롬프트 (복붙용)

```
이 저장소(이문면옥 ERP)를 이어서 작업합니다. 먼저 HANDOFF.md 를 읽고 현재 상태를 파악하세요.
그 다음:
1) HANDOFF.md §2의 DB 마이그레이션(audit_logs, interviews)이 실제 Supabase에 반영됐는지 확인 안내
2) HANDOFF.md §4의 체크리스트 동기화 문제(2~5단계가 코드엔 있는데 not_started로 남음)를
   실제 코드 기준으로 erpsystem-checklist.json 을 재점검/수정
3) 그 후 남은 작업(§5) 중 7-5(보건증 만기 알림)부터 진행
각 단계 전에 계획을 먼저 보고하고, 작업 후 `npx tsc --noEmit` 로 타입 체크하세요.
```
