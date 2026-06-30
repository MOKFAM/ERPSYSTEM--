-- ============================================
-- 이문면옥 ERP 시스템 - Database Schema
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. 지점 테이블
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time')),
  position_type TEXT NOT NULL DEFAULT 'both' CHECK (position_type IN ('hall', 'kitchen', 'both')),
  job_title TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  hire_date DATE,
  hourly_rate INTEGER,
  monthly_salary INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS 활성화 (서비스 키 사용 시 자동 우회)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 6. 초기 데이터: 일산점
INSERT INTO branches (name, address, phone) VALUES
  ('일산점', '경기도 고양시 일산', '031-000-0000');

-- ============================================
-- Phase 2 추가 테이블 (근태/스케줄/휴가/서류)
-- ============================================

-- 8. 출퇴근 기록 테이블
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'late', 'early_leave', 'absent')),
  worked_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE UNIQUE INDEX idx_attendance_user_date ON attendance(user_id, date);

CREATE TRIGGER trigger_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 9. 스케줄 테이블
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('hall', 'kitchen')),
  is_confirmed BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_branch_id ON schedules(branch_id);

CREATE TRIGGER trigger_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 10. 휴가 테이블
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('annual', 'half_am', 'half_pm', 'sick', 'family_event', 'substitute')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leaves_user_id ON leaves(user_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_start_date ON leaves(start_date);

CREATE TRIGGER trigger_leaves_updated_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- 11. 제출 서류 테이블
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('health_cert', 'resident_copy', 'bank_account', 'parental_consent')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Phase 5 추가 테이블 (재고)
-- ============================================

-- 17. 재고 품목 테이블
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '식재료',
  unit TEXT NOT NULL DEFAULT 'kg',
  current_qty NUMERIC(10,3) NOT NULL DEFAULT 0,
  min_qty NUMERIC(10,3) NOT NULL DEFAULT 0,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_items_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);

CREATE TRIGGER trigger_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 18. 재고 변동 이력 테이블
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('incoming', 'outgoing', 'adjustment')),
  change_qty NUMERIC(10,3) NOT NULL,
  after_qty NUMERIC(10,3) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_logs_item ON inventory_logs(item_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Phase 4 추가 테이블 (매출/메뉴)
-- ============================================

-- 14. 메뉴 테이블
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT '기본',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);

CREATE TRIGGER trigger_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- 15. 메뉴별 재료 구성 (레시피)
CREATE TABLE menu_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_item_name TEXT NOT NULL,
  required_qty NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_recipes_menu_item ON menu_recipes(menu_item_id);

ALTER TABLE menu_recipes ENABLE ROW LEVEL SECURITY;

-- 16. 매출 테이블
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'cash', 'transfer', 'other')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_branch_id ON sales(branch_id);
CREATE INDEX idx_sales_menu_item_id ON sales(menu_item_id);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Phase 3 추가 테이블 (급여 정산)
-- ============================================

-- 13. 급여 정산 테이블
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  base_pay INTEGER NOT NULL DEFAULT 0,
  overtime_pay INTEGER NOT NULL DEFAULT 0,
  night_pay INTEGER NOT NULL DEFAULT 0,
  holiday_pay INTEGER NOT NULL DEFAULT 0,
  weekly_holiday_pay INTEGER NOT NULL DEFAULT 0,
  deductions INTEGER NOT NULL DEFAULT 0,
  total_pay INTEGER NOT NULL DEFAULT 0,
  worked_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  worked_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_payroll_user_month ON payroll(user_id, year_month);
CREATE INDEX idx_payroll_year_month ON payroll(year_month);
CREATE INDEX idx_payroll_status ON payroll(status);

CREATE TRIGGER trigger_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- 12. 스케줄 변경/교환 요청 테이블
CREATE TABLE schedule_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  target_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('change', 'swap')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_swap_requests_requester ON schedule_swap_requests(requester_id);
CREATE INDEX idx_swap_requests_target ON schedule_swap_requests(target_id);
CREATE INDEX idx_swap_requests_status ON schedule_swap_requests(status);

CREATE TRIGGER trigger_swap_requests_updated_at
  BEFORE UPDATE ON schedule_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE schedule_swap_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Phase 6 추가 테이블 (발주/결재)
-- ============================================

-- 19. 발주/구매 요청 테이블
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('ingredient', 'welfare')),
  title TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_price INTEGER,
  total_price INTEGER,
  vendor_name TEXT,
  reason TEXT,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'on_hold')),
  rejected_reason TEXT,
  received_qty NUMERIC(10,3),
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resubmitted_from UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_requester ON purchase_orders(requester_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_type ON purchase_orders(order_type);

CREATE OR REPLACE TRIGGER trigger_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- 20. 결재 테이블
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'pending' CHECK (current_status IN ('pending', 'in_review', 'approved', 'rejected', 'on_hold')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  final_decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  final_decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_order_id ON approvals(order_id);
CREATE INDEX IF NOT EXISTS idx_approvals_current_status ON approvals(current_status);

CREATE OR REPLACE TRIGGER trigger_approvals_updated_at
  BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 21. 결재 단계 이력 테이블
CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  step_no INTEGER NOT NULL DEFAULT 1,
  action TEXT NOT NULL CHECK (action IN ('requested', 'in_review', 'approved', 'rejected', 'on_hold', 'resubmitted', 'delivered')),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_approval ON approval_steps(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_order ON approval_steps(order_id);

ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Phase 7 추가 테이블 (알림)
-- ============================================

-- 22. 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN (
    'approval_request', 'approval_approved', 'approval_rejected',
    'leave_reviewed', 'low_stock', 'health_cert_expiry', 'general'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 23. 감사 로그 테이블 (주요 데이터 변경 이력 / 원본 보존)
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

-- 24. 면담 / 인사조치 기록 테이블 (마스터 관리자 전용)
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

-- 7. 초기 관리자 계정
-- 아래 비밀번호 해시는 애플리케이션 시드 스크립트에서 생성합니다.
-- 또는 직접 bcrypt 해시를 넣으세요.
-- 예시: password = 'admin1234'
-- INSERT INTO users (email, password, name, role, job_title, branch_id)
-- VALUES (
--   'admin@imun.co.kr',
--   '$2a$10$...bcrypt_hash...',
--   '점장',
--   'admin',
--   '점장',
--   (SELECT id FROM branches WHERE name = '일산점')
-- );
