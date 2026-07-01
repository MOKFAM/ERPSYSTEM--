export type Role = 'admin' | 'manager' | 'user'
export type EmploymentType = 'full_time' | 'part_time'
export type PositionType = 'hall' | 'kitchen' | 'both'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  employmentType: EmploymentType
  positionType: PositionType
  jobTitle: string | null
  branchId: string | null
  branchName?: string | null
  hireDate: string | null
  hourlyRate: number | null
  monthlySalary: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  name: string
  code: string | null
  address: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'absent'

export interface Attendance {
  id: string
  userId: string
  userName?: string
  date: string
  clockIn: string | null
  clockOut: string | null
  status: AttendanceStatus
  workedMinutes: number | null
  note: string | null
}

export interface Schedule {
  id: string
  userId: string
  userName?: string
  userEmploymentType?: EmploymentType
  userPositionType?: PositionType
  branchId: string | null
  date: string
  shiftStart: string
  shiftEnd: string
  position: 'hall' | 'kitchen'
  isConfirmed: boolean
  note: string | null
}

export function toSchedule(row: Record<string, unknown>): Schedule {
  const users = row.users as Record<string, unknown> | null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: users?.name as string ?? undefined,
    userEmploymentType: users?.employment_type as EmploymentType ?? undefined,
    userPositionType: users?.position_type as PositionType ?? undefined,
    branchId: row.branch_id as string | null,
    date: row.date as string,
    shiftStart: row.shift_start as string,
    shiftEnd: row.shift_end as string,
    position: row.position as 'hall' | 'kitchen',
    isConfirmed: row.is_confirmed as boolean,
    note: row.note as string | null,
  }
}

// Supabase row → App type 변환 헬퍼
export function toAttendance(row: Record<string, unknown>): Attendance {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.users as Record<string, unknown>)?.name as string ?? row.user_name as string ?? undefined,
    date: row.date as string,
    clockIn: row.clock_in as string | null,
    clockOut: row.clock_out as string | null,
    status: row.status as AttendanceStatus,
    workedMinutes: row.worked_minutes as number | null,
    note: row.note as string | null,
  }
}


export function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    phone: row.phone as string | null,
    role: row.role as Role,
    employmentType: row.employment_type as EmploymentType,
    positionType: row.position_type as PositionType,
    jobTitle: row.job_title as string | null,
    branchId: row.branch_id as string | null,
    branchName: row.branch_name as string | null ?? null,
    hireDate: row.hire_date as string | null,
    hourlyRate: row.hourly_rate as number | null,
    monthlySalary: row.monthly_salary as number | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// 휴가 타입
export type LeaveType = 'annual' | 'half_am' | 'half_pm' | 'sick' | 'family_event' | 'substitute'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: '연차',
  half_am: '반차(오전)',
  half_pm: '반차(오후)',
  sick: '병가',
  family_event: '경조사',
  substitute: '대체휴일',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
}

export interface Leave {
  id: string
  userId: string
  userName?: string
  type: LeaveType
  startDate: string
  endDate: string
  reason: string | null
  status: LeaveStatus
  reviewedBy: string | null
  reviewerName?: string | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export function toLeave(row: Record<string, unknown>): Leave {
  const reviewer = row.reviewer as Record<string, unknown> | null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.users as Record<string, unknown>)?.name as string ?? undefined,
    type: row.type as LeaveType,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    reason: row.reason as string | null,
    status: row.status as LeaveStatus,
    reviewedBy: row.reviewed_by as string | null,
    reviewerName: reviewer?.name as string | null ?? null,
    reviewComment: row.review_comment as string | null,
    reviewedAt: row.reviewed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// 서류 타입
export type DocumentType = 'health_cert' | 'resident_copy' | 'bank_account' | 'parental_consent'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  health_cert: '보건증',
  resident_copy: '주민등록등본',
  bank_account: '통장사본',
  parental_consent: '부모님동의서',
}

export interface Document {
  id: string
  userId: string
  userName?: string
  type: DocumentType
  fileUrl: string
  fileName: string
  expiryDate: string | null
  uploadedAt: string
}

export function toDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: (row.users as Record<string, unknown>)?.name as string ?? undefined,
    type: row.type as DocumentType,
    fileUrl: row.file_url as string,
    fileName: row.file_name as string,
    expiryDate: row.expiry_date as string | null,
    uploadedAt: row.uploaded_at as string,
  }
}

// 재고 타입
export interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  currentQty: number
  minQty: number
  branchId: string | null
  createdAt: string
  updatedAt: string
}

export function toInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    unit: row.unit as string,
    currentQty: Number(row.current_qty),
    minQty: Number(row.min_qty),
    branchId: row.branch_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export type InventoryChangeType = 'incoming' | 'outgoing' | 'adjustment'

export const CHANGE_TYPE_LABELS: Record<InventoryChangeType, string> = {
  incoming: '입고',
  outgoing: '출고',
  adjustment: '실사조정',
}

export interface InventoryLog {
  id: string
  itemId: string
  itemName?: string
  changeType: InventoryChangeType
  changeQty: number
  afterQty: number
  reason: string | null
  createdBy: string | null
  creatorName?: string
  createdAt: string
}

export function toInventoryLog(row: Record<string, unknown>): InventoryLog {
  const item = row.inventory_items as Record<string, unknown> | null
  const creator = row.creator as Record<string, unknown> | null
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    itemName: item?.name as string ?? undefined,
    changeType: row.change_type as InventoryChangeType,
    changeQty: Number(row.change_qty),
    afterQty: Number(row.after_qty),
    reason: row.reason as string | null,
    createdBy: row.created_by as string | null,
    creatorName: creator?.name as string ?? undefined,
    createdAt: row.created_at as string,
  }
}

// 메뉴 타입
export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function toMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    price: row.price as number,
    category: row.category as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// 메뉴 레시피 타입
export interface MenuRecipe {
  id: string
  menuItemId: string
  inventoryItemName: string
  requiredQty: number
  unit: string
}

export function toMenuRecipe(row: Record<string, unknown>): MenuRecipe {
  return {
    id: row.id as string,
    menuItemId: row.menu_item_id as string,
    inventoryItemName: row.inventory_item_name as string,
    requiredQty: Number(row.required_qty),
    unit: row.unit as string,
  }
}

// 매출 타입
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'other'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: '카드',
  cash: '현금',
  transfer: '계좌이체',
  other: '기타',
}

export interface Sale {
  id: string
  branchId: string | null
  date: string
  menuItemId: string | null
  menuName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  paymentMethod: PaymentMethod
  createdBy: string | null
  creatorName?: string
  createdAt: string
}

export function toSale(row: Record<string, unknown>): Sale {
  const creator = row.creator as Record<string, unknown> | null
  return {
    id: row.id as string,
    branchId: row.branch_id as string | null,
    date: row.date as string,
    menuItemId: row.menu_item_id as string | null,
    menuName: row.menu_name as string,
    quantity: row.quantity as number,
    unitPrice: row.unit_price as number,
    totalPrice: row.total_price as number,
    paymentMethod: row.payment_method as PaymentMethod,
    createdBy: row.created_by as string | null,
    creatorName: creator?.name as string ?? undefined,
    createdAt: row.created_at as string,
  }
}

// 급여 정산 타입
export type PayrollStatus = 'draft' | 'confirmed'

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: '산정중',
  confirmed: '확정',
}

export interface Payroll {
  id: string
  userId: string
  userName?: string
  employmentType?: EmploymentType
  yearMonth: string
  basePay: number
  overtimePay: number
  nightPay: number
  holidayPay: number
  weeklyHolidayPay: number
  deductions: number
  totalPay: number
  workedHours: number
  workedDays: number
  status: PayrollStatus
  confirmedBy: string | null
  confirmerName?: string | null
  confirmedAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export function toPayroll(row: Record<string, unknown>): Payroll {
  const user = row.users as Record<string, unknown> | null
  const confirmer = row.confirmer as Record<string, unknown> | null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: user?.name as string ?? undefined,
    employmentType: user?.employment_type as EmploymentType ?? undefined,
    yearMonth: row.year_month as string,
    basePay: row.base_pay as number,
    overtimePay: row.overtime_pay as number,
    nightPay: row.night_pay as number,
    holidayPay: row.holiday_pay as number,
    weeklyHolidayPay: row.weekly_holiday_pay as number,
    deductions: row.deductions as number,
    totalPay: row.total_pay as number,
    workedHours: Number(row.worked_hours),
    workedDays: row.worked_days as number,
    status: row.status as PayrollStatus,
    confirmedBy: row.confirmed_by as string | null,
    confirmerName: confirmer?.name as string | null ?? null,
    confirmedAt: row.confirmed_at as string | null,
    note: row.note as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// 스케줄 교환 요청 타입
export type SwapRequestType = 'change' | 'swap'
export type SwapRequestStatus = 'pending' | 'accepted' | 'rejected'

export const SWAP_TYPE_LABELS: Record<SwapRequestType, string> = {
  change: '변경 요청',
  swap: '교환 요청',
}

export const SWAP_STATUS_LABELS: Record<SwapRequestStatus, string> = {
  pending: '대기',
  accepted: '승인',
  rejected: '반려',
}

export interface ScheduleSwapRequest {
  id: string
  requesterId: string
  requesterName?: string
  requesterScheduleId: string
  targetId: string | null
  targetName?: string | null
  targetScheduleId: string | null
  type: SwapRequestType
  reason: string | null
  status: SwapRequestStatus
  reviewedBy: string | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
}

export function toSwapRequest(row: Record<string, unknown>): ScheduleSwapRequest {
  const requester = row.requester as Record<string, unknown> | null
  const target = row.target as Record<string, unknown> | null
  return {
    id: row.id as string,
    requesterId: row.requester_id as string,
    requesterName: requester?.name as string ?? undefined,
    requesterScheduleId: row.requester_schedule_id as string,
    targetId: row.target_id as string | null,
    targetName: target?.name as string | null ?? null,
    targetScheduleId: row.target_schedule_id as string | null,
    type: row.type as SwapRequestType,
    reason: row.reason as string | null,
    status: row.status as SwapRequestStatus,
    reviewedBy: row.reviewed_by as string | null,
    reviewComment: row.review_comment as string | null,
    reviewedAt: row.reviewed_at as string | null,
    createdAt: row.created_at as string,
  }
}

export function toBranch(row: Record<string, unknown>): Branch {
  return {
    id: row.id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    address: row.address as string | null,
    phone: row.phone as string | null,
    isActive: row.is_active !== false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// HQ 대시보드 타입
export interface BranchSalesSummary {
  branchId: string
  branchName: string
  totalSales: number
  totalCount: number
  daily: { date: string; total: number; count: number }[]
}

export interface BranchInventorySummary {
  branchId: string
  branchName: string
  totalItems: number
  lowStockCount: number
  items: { name: string; currentQty: number; minQty: number; unit: string }[]
}

export interface HqReportData {
  period: string
  branches: {
    branchId: string
    branchName: string
    salesTotal: number
    salesCount: number
    payrollTotal: number
    payrollRatio: number
    lowStockCount: number
  }[]
  grandSalesTotal: number
  grandPayrollTotal: number
}

// 발주 / 구매 승인 타입
export type OrderType = 'ingredient' | 'welfare'
export type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'on_hold'
export type ApprovalAction =
  | 'requested'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'resubmitted'
  | 'delivered'

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  ingredient: '식자재 발주',
  welfare: '복지 구매',
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '대기',
  in_review: '검토중',
  approved: '승인',
  rejected: '반려',
  on_hold: '보류',
}

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  requested: '요청',
  in_review: '검토 시작',
  approved: '승인',
  rejected: '반려',
  on_hold: '보류',
  resubmitted: '재신청',
  delivered: '납품 확인',
}

export interface PurchaseOrder {
  id: string
  requesterId: string
  requesterName?: string
  branchId: string | null
  branchName?: string | null
  orderType: OrderType
  title: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  vendorName: string | null
  reason: string | null
  requestedDate: string
  status: ApprovalStatus
  receivedQty: number | null
  receivedAt: string | null
  receivedBy: string | null
  rejectedReason: string | null
  resubmittedFrom: string | null
  createdAt: string
  updatedAt: string
}

export function toPurchaseOrder(row: Record<string, unknown>): PurchaseOrder {
  const requester = row.requester as Record<string, unknown> | null
  const branch = row.branches as Record<string, unknown> | null
  return {
    id: row.id as string,
    requesterId: row.requester_id as string,
    requesterName: requester?.name as string ?? undefined,
    branchId: row.branch_id as string | null,
    branchName: branch?.name as string | null ?? null,
    orderType: row.order_type as OrderType,
    title: row.title as string,
    itemName: row.item_name as string,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    unitPrice: row.unit_price === null ? null : Number(row.unit_price),
    totalPrice: row.total_price === null ? null : Number(row.total_price),
    vendorName: row.vendor_name as string | null,
    reason: row.reason as string | null,
    requestedDate: row.requested_date as string,
    status: row.status as ApprovalStatus,
    receivedQty: row.received_qty === null || row.received_qty === undefined ? null : Number(row.received_qty),
    receivedAt: row.received_at as string | null,
    receivedBy: row.received_by as string | null,
    rejectedReason: row.rejected_reason as string | null,
    resubmittedFrom: row.resubmitted_from as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export interface ApprovalStep {
  id: string
  approvalId: string
  orderId: string
  stepNo: number
  action: ApprovalAction
  actorId: string | null
  actorName?: string | null
  comment: string | null
  createdAt: string
}

export function toApprovalStep(row: Record<string, unknown>): ApprovalStep {
  const actor = row.actor as Record<string, unknown> | null
  return {
    id: row.id as string,
    approvalId: row.approval_id as string,
    orderId: row.order_id as string,
    stepNo: Number(row.step_no),
    action: row.action as ApprovalAction,
    actorId: row.actor_id as string | null,
    actorName: actor?.name as string | null ?? null,
    comment: row.comment as string | null,
    createdAt: row.created_at as string,
  }
}

// 알림 타입
export type NotificationType =
  | 'approval_request'
  | 'approval_approved'
  | 'approval_rejected'
  | 'leave_reviewed'
  | 'low_stock'
  | 'health_cert_expiry'
  | 'general'

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  approval_request: '결재 요청',
  approval_approved: '결재 승인',
  approval_rejected: '결재 반려',
  leave_reviewed: '휴가 처리',
  low_stock: '재고 부족',
  health_cert_expiry: '보건증 만기',
  general: '알림',
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export function toNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: row.body as string | null,
    link: row.link as string | null,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  }
}

// 감사 로그 타입
export interface AuditLog {
  id: string
  actorId: string | null
  actorName: string | null
  action: string
  entityType: string
  entityId: string | null
  summary: string | null
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  createdAt: string
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  user: '직원',
  payroll: '급여',
  purchase_order: '발주',
  branch: '지점',
  leave: '휴가',
  interview: '면담/인사',
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제/비활성화',
  approve: '승인',
  reject: '반려',
  confirm: '확정',
  view: '열람',
}

export function toAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as string,
    actorId: row.actor_id as string | null,
    actorName: row.actor_name as string | null,
    action: row.action as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string | null,
    summary: row.summary as string | null,
    beforeData: (row.before_data as Record<string, unknown> | null) ?? null,
    afterData: (row.after_data as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  }
}

// 면담 / 인사조치 타입
export type InterviewCategory = 'interview' | 'warning' | 'reprimand' | 'reward'

export const INTERVIEW_CATEGORY_LABELS: Record<InterviewCategory, string> = {
  interview: '면담',
  warning: '경고',
  reprimand: '시말서',
  reward: '포상',
}

export interface Interview {
  id: string
  userId: string
  userName?: string
  interviewerId: string | null
  interviewerName?: string | null
  category: InterviewCategory
  title: string
  content: string | null
  interviewDate: string
  createdAt: string
  updatedAt: string
}

export function toInterview(row: Record<string, unknown>): Interview {
  const target = row.users as Record<string, unknown> | null
  const interviewer = row.interviewer as Record<string, unknown> | null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: target?.name as string ?? undefined,
    interviewerId: row.interviewer_id as string | null,
    interviewerName: interviewer?.name as string | null ?? null,
    category: row.category as InterviewCategory,
    title: row.title as string,
    content: row.content as string | null,
    interviewDate: row.interview_date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
