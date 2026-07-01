'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toLeave } from '@/lib/types'
import type { Leave } from '@/lib/types'
import { notifyUser } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return session
}

async function requireManagerOrAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

// 휴가 신청
export async function createLeave(formData: FormData): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase.from('leaves').insert({
    user_id: session.user.id,
    type: formData.get('type') as string,
    start_date: formData.get('startDate') as string,
    end_date: formData.get('endDate') as string,
    reason: (formData.get('reason') as string) || null,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/leaves')
  revalidatePath('/admin/leaves')
}

// 내 휴가 목록 조회
export async function getMyLeaves(year?: string): Promise<Leave[]> {
  const session = await requireAuth()

  let query = supabase
    .from('leaves')
    .select('*, reviewer:reviewed_by(name)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (year) {
    query = query
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toLeave)
}

// 전체 휴가 목록 (관리자용)
export async function getAllLeaves(status?: string): Promise<Leave[]> {
  await requireManagerOrAdmin()

  let query = supabase
    .from('leaves')
    .select('*, users!leaves_user_id_fkey(name), reviewer:users!leaves_reviewed_by_fkey(name)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toLeave)
}

// 휴가 승인/반려
export async function reviewLeave(
  leaveId: string,
  decision: 'approved' | 'rejected',
  comment?: string
): Promise<void> {
  const session = await requireManagerOrAdmin()

  const { data: updated, error } = await supabase
    .from('leaves')
    .update({
      status: decision,
      reviewed_by: session.user.id,
      review_comment: comment || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .eq('status', 'pending')
    .select('user_id')
    .single()

  if (error) throw new Error(error.message)

  if (updated?.user_id) {
    await notifyUser(updated.user_id as string, {
      type: 'leave_reviewed',
      title: decision === 'approved' ? '휴가 승인됨' : '휴가 반려됨',
      body:
        decision === 'approved'
          ? '휴가 신청이 승인되었습니다.'
          : `휴가 신청이 반려되었습니다.${comment ? ` 사유: ${comment}` : ''}`,
      link: '/leaves',
    })
  }

  revalidatePath('/leaves')
  revalidatePath('/admin/leaves')
}

// 휴가 취소 (본인 + 대기 상태만)
export async function cancelLeave(leaveId: string): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', leaveId)
    .eq('user_id', session.user.id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
  revalidatePath('/leaves')
}

// 연차 잔여일수 계산 (근로기준법 기준)
export async function getAnnualLeaveBalance(): Promise<{ total: number; used: number; remaining: number }> {
  const session = await requireAuth()

  // 입사일 조회
  const { data: user } = await supabase
    .from('users')
    .select('hire_date')
    .eq('id', session.user.id)
    .single()

  if (!user?.hire_date) {
    return { total: 0, used: 0, remaining: 0 }
  }

  const hireDate = new Date(user.hire_date)
  const now = new Date()
  const diffMs = now.getTime() - hireDate.getTime()
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))

  // 근로기준법: 1년 미만 → 매월 1일, 1년 이상 → 15일 + 2년마다 1일 추가 (최대 25일)
  let totalDays: number
  if (diffYears < 1) {
    totalDays = Math.min(diffMonths, 11)
  } else {
    totalDays = 15 + Math.floor((diffYears - 1) / 2)
    if (totalDays > 25) totalDays = 25
  }

  // 올해 사용한 연차 수 조회
  const currentYear = now.getFullYear().toString()
  const { data: usedLeaves } = await supabase
    .from('leaves')
    .select('type, start_date, end_date')
    .eq('user_id', session.user.id)
    .eq('status', 'approved')
    .in('type', ['annual', 'half_am', 'half_pm'])
    .gte('start_date', `${currentYear}-01-01`)
    .lte('start_date', `${currentYear}-12-31`)

  let usedDays = 0
  for (const leave of usedLeaves ?? []) {
    if (leave.type === 'half_am' || leave.type === 'half_pm') {
      usedDays += 0.5
    } else {
      const start = new Date(leave.start_date)
      const end = new Date(leave.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      usedDays += days
    }
  }

  return { total: totalDays, used: usedDays, remaining: totalDays - usedDays }
}

// 월별 승인된 휴가 조회 (캘린더용)
export async function getApprovedLeavesForMonth(yearMonth: string): Promise<Leave[]> {
  await requireAuth()

  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = `${yearMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('leaves')
    .select('*, users!leaves_user_id_fkey(name)')
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(toLeave)
}

