'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toAttendance } from '@/lib/types'
import type { Attendance } from '@/lib/types'
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

export async function getTodayAttendance(): Promise<Attendance | null> {
  const session = await requireAuth()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('date', today)
    .single()

  if (error || !data) return null
  return toAttendance(data)
}

export async function clockIn(): Promise<void> {
  const session = await requireAuth()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  // 스케줄 조회하여 지각 여부 판단
  const { data: schedule } = await supabase
    .from('schedules')
    .select('shift_start')
    .eq('user_id', session.user.id)
    .eq('date', today)
    .single()

  let status: 'normal' | 'late' = 'normal'
  if (schedule?.shift_start) {
    const [h, m] = schedule.shift_start.split(':').map(Number)
    const scheduledStart = new Date(now)
    scheduledStart.setHours(h, m, 0, 0)
    if (now.getTime() > scheduledStart.getTime() + 5 * 60000) {
      // 5분 유예 후 지각 처리
      status = 'late'
    }
  }

  const { error } = await supabase.from('attendance').insert({
    user_id: session.user.id,
    date: today,
    clock_in: now.toISOString(),
    status,
  })

  if (error) {
    if (error.code === '23505') throw new Error('이미 출근 기록이 있습니다.')
    throw new Error(error.message)
  }
  revalidatePath('/dashboard')
  revalidatePath('/attendance')
}

export async function clockOut(): Promise<void> {
  const session = await requireAuth()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  const { data: record, error: fetchError } = await supabase
    .from('attendance')
    .select('id, clock_in, status')
    .eq('user_id', session.user.id)
    .eq('date', today)
    .single()

  if (fetchError || !record) throw new Error('출근 기록이 없습니다.')
  if (!record.clock_in) throw new Error('출근 시간이 기록되지 않았습니다.')

  const clockInTime = new Date(record.clock_in)
  const workedMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000)

  // 스케줄 조회하여 조퇴 여부 판단
  const { data: schedule } = await supabase
    .from('schedules')
    .select('shift_end')
    .eq('user_id', session.user.id)
    .eq('date', today)
    .single()

  let status: 'normal' | 'late' | 'early_leave' = record.status ?? 'normal'
  if (schedule?.shift_end) {
    const [h, m] = schedule.shift_end.split(':').map(Number)
    const scheduledEnd = new Date(now)
    scheduledEnd.setHours(h, m, 0, 0)
    if (now.getTime() < scheduledEnd.getTime() - 5 * 60000) {
      // 스케줄 종료 5분 전보다 일찍 퇴근하면 조퇴
      status = 'early_leave'
    }
  }

  const { error } = await supabase
    .from('attendance')
    .update({
      clock_out: now.toISOString(),
      worked_minutes: workedMinutes,
      status,
    })
    .eq('id', record.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/attendance')
}

export async function getMyAttendance(yearMonth: string): Promise<Attendance[]> {
  const session = await requireAuth()

  const startDate = `${yearMonth}-01`
  const [year, month] = yearMonth.split('-').map(Number)
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toAttendance)
}

export async function getAllAttendance(yearMonth: string): Promise<Attendance[]> {
  await requireManagerOrAdmin()

  const startDate = `${yearMonth}-01`
  const [year, month] = yearMonth.split('-').map(Number)
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('attendance')
    .select('*, users(name)')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toAttendance)
}

export async function getTodayAllAttendance(): Promise<Attendance[]> {
  await requireManagerOrAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance')
    .select('*, users(name)')
    .eq('date', today)
    .order('clock_in', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toAttendance)
}
