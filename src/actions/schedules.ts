'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toSchedule, toSwapRequest } from '@/lib/types'
import type { Schedule, ScheduleSwapRequest } from '@/lib/types'
import { revalidatePath } from 'next/cache'

async function requireManagerOrAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return session
}

export async function getWeekSchedules(startDate: string, endDate: string): Promise<Schedule[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('schedules')
    .select('*, users(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('shift_start')

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSchedule)
}

export async function getMySchedules(yearMonth: string): Promise<Schedule[]> {
  const session = await requireAuth()

  const startDate = `${yearMonth}-01`
  const [year, month] = yearMonth.split('-').map(Number)
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('schedules')
    .select('*, users(name)')
    .eq('user_id', session.user.id)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSchedule)
}

export async function createSchedule(formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('schedules').insert({
    user_id: formData.get('userId') as string,
    branch_id: (formData.get('branchId') as string) || null,
    date: formData.get('date') as string,
    shift_start: formData.get('shiftStart') as string,
    shift_end: formData.get('shiftEnd') as string,
    position: formData.get('position') as string,
    note: (formData.get('note') as string) || null,
  })

  if (error) {
    if (error.code === '23505') throw new Error('해당 날짜에 이미 스케줄이 있습니다.')
    throw new Error(error.message)
  }
  revalidatePath('/admin/schedules')
  revalidatePath('/schedules')
}

export async function updateSchedule(id: string, formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase
    .from('schedules')
    .update({
      user_id: formData.get('userId') as string,
      date: formData.get('date') as string,
      shift_start: formData.get('shiftStart') as string,
      shift_end: formData.get('shiftEnd') as string,
      position: formData.get('position') as string,
      note: (formData.get('note') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/schedules')
  revalidatePath('/schedules')
}

export async function deleteSchedule(id: string): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/schedules')
  revalidatePath('/schedules')
}

export async function confirmWeekSchedules(startDate: string, endDate: string): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase
    .from('schedules')
    .update({ is_confirmed: true })
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/schedules')
  revalidatePath('/schedules')
}

// 스케줄 변경/교환 요청 생성
export async function createSwapRequest(formData: FormData): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase.from('schedule_swap_requests').insert({
    requester_id: session.user.id,
    requester_schedule_id: formData.get('requesterScheduleId') as string,
    target_id: (formData.get('targetId') as string) || null,
    target_schedule_id: (formData.get('targetScheduleId') as string) || null,
    type: formData.get('type') as string,
    reason: (formData.get('reason') as string) || null,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/schedules')
  revalidatePath('/admin/schedules')
}

// 내 스케줄 변경 요청 목록
export async function getMySwapRequests(): Promise<ScheduleSwapRequest[]> {
  const session = await requireAuth()

  const { data, error } = await supabase
    .from('schedule_swap_requests')
    .select('*, requester:requester_id(name), target:target_id(name)')
    .eq('requester_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSwapRequest)
}

// 전체 요청 목록 (관리자)
export async function getAllSwapRequests(): Promise<ScheduleSwapRequest[]> {
  await requireManagerOrAdmin()

  const { data, error } = await supabase
    .from('schedule_swap_requests')
    .select('*, requester:requester_id(name), target:target_id(name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSwapRequest)
}

// 스케줄 변경 요청 승인/반려
export async function reviewSwapRequest(
  requestId: string,
  decision: 'accepted' | 'rejected',
  comment?: string
): Promise<void> {
  const session = await requireManagerOrAdmin()

  const { data: request, error: fetchError } = await supabase
    .from('schedule_swap_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) throw new Error('요청을 찾을 수 없습니다.')

  // 승인 시 실제 스케줄 교환 처리
  if (decision === 'accepted' && request.type === 'swap' && request.target_schedule_id) {
    const { data: reqSchedule } = await supabase
      .from('schedules')
      .select('user_id')
      .eq('id', request.requester_schedule_id)
      .single()

    const { data: tgtSchedule } = await supabase
      .from('schedules')
      .select('user_id')
      .eq('id', request.target_schedule_id)
      .single()

    if (reqSchedule && tgtSchedule) {
      await supabase.from('schedules').update({
        user_id: tgtSchedule.user_id,
      }).eq('id', request.requester_schedule_id)

      await supabase.from('schedules').update({
        user_id: reqSchedule.user_id,
      }).eq('id', request.target_schedule_id)
    }
  }

  const { error } = await supabase
    .from('schedule_swap_requests')
    .update({
      status: decision,
      reviewed_by: session.user.id,
      review_comment: comment || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
  revalidatePath('/schedules')
  revalidatePath('/admin/schedules')
}
