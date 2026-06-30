'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toPayroll } from '@/lib/types'
import type { Payroll } from '@/lib/types'
import { getKoreanHolidays } from '@/lib/holidays'
import { recordAudit } from '@/lib/audit'
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

// 급여 자동 산정 (전 직원 일괄)
export async function calculatePayroll(yearMonth: string): Promise<{ created: number; updated: number }> {
  await requireManagerOrAdmin()

  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = `${yearMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  // 공휴일 목록
  const holidays = new Set(getKoreanHolidays(year).map((h) => h.date))

  // 활성 직원 조회
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, employment_type, hourly_rate, monthly_salary')
    .eq('is_active', true)

  if (usersError) throw new Error(usersError.message)

  // 해당 월 전체 출퇴근 기록 조회
  const { data: allAttendance, error: attError } = await supabase
    .from('attendance')
    .select('user_id, date, clock_in, clock_out, worked_minutes, status')
    .gte('date', startDate)
    .lte('date', endDate)

  if (attError) throw new Error(attError.message)

  // 해당 월 승인된 휴가 조회
  const { data: allLeaves, error: leaveError } = await supabase
    .from('leaves')
    .select('user_id, type, start_date, end_date')
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  if (leaveError) throw new Error(leaveError.message)

  let created = 0
  let updated = 0

  for (const user of users ?? []) {
    const userAttendance = (allAttendance ?? []).filter((a) => a.user_id === user.id)
    const userLeaves = (allLeaves ?? []).filter((l) => l.user_id === user.id)

    // 근무 통계 계산
    let totalWorkedMinutes = 0
    let workedDays = 0
    let nightMinutes = 0
    let holidayMinutes = 0
    let overtimeMinutes = 0

    for (const att of userAttendance) {
      if (!att.clock_in) continue
      workedDays++
      const mins = att.worked_minutes ?? 0
      totalWorkedMinutes += mins

      // 야간수당: 22:00~06:00 근무
      if (att.clock_out) {
        const clockOut = new Date(att.clock_out)
        const hour = clockOut.getHours()
        // 간이 계산: 퇴근이 22시 이후면 22시부터 퇴근까지를 야간으로
        if (hour >= 22 || hour < 6) {
          const clockIn = new Date(att.clock_in)
          const nightStart = new Date(clockIn)
          nightStart.setHours(22, 0, 0, 0)
          if (clockOut.getTime() > nightStart.getTime()) {
            nightMinutes += Math.round((clockOut.getTime() - Math.max(clockIn.getTime(), nightStart.getTime())) / 60000)
          }
        }
      }

      // 공휴일 근무
      if (holidays.has(att.date)) {
        holidayMinutes += mins
      }

      // 일 8시간 초과 = 초과근무
      if (mins > 480) {
        overtimeMinutes += mins - 480
      }
    }

    // 결근일 계산 (승인된 휴가 제외)
    let leaveDays = 0
    for (const leave of userLeaves) {
      if (leave.type === 'half_am' || leave.type === 'half_pm') {
        leaveDays += 0.5
      } else {
        const s = new Date(Math.max(new Date(leave.start_date).getTime(), new Date(startDate).getTime()))
        const e = new Date(Math.min(new Date(leave.end_date).getTime(), new Date(endDate).getTime()))
        leaveDays += Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
      }
    }

    const workedHours = Math.round(totalWorkedMinutes / 60 * 100) / 100

    let basePay = 0
    let overtimePay = 0
    let nightPay = 0
    let holidayPay = 0
    let weeklyHolidayPay = 0

    if (user.employment_type === 'full_time') {
      // 정직원: 월급 기반
      basePay = user.monthly_salary ?? 0

      // 초과근무수당: 통상시급 * 1.5 * 초과시간
      const normalHourlyRate = Math.round(basePay / 209) // 월 소정근로 209시간 기준
      overtimePay = Math.round(normalHourlyRate * 1.5 * (overtimeMinutes / 60))
      nightPay = Math.round(normalHourlyRate * 0.5 * (nightMinutes / 60)) // 야간가산 50%
      holidayPay = Math.round(normalHourlyRate * 1.5 * (holidayMinutes / 60))
    } else {
      // 아르바이트: 시급 기반
      const hourlyRate = user.hourly_rate ?? 0
      basePay = Math.round(hourlyRate * workedHours)
      overtimePay = Math.round(hourlyRate * 0.5 * (overtimeMinutes / 60))
      nightPay = Math.round(hourlyRate * 0.5 * (nightMinutes / 60))
      holidayPay = Math.round(hourlyRate * 1.5 * (holidayMinutes / 60))

      // 주휴수당: 주 15시간 이상 근무 시 1일분 추가
      // 간이 계산: 월 평균 주당 근무시간 = 총근무시간 / (해당월 주수)
      const weeksInMonth = lastDay / 7
      const avgWeeklyHours = workedHours / weeksInMonth
      if (avgWeeklyHours >= 15) {
        // 주휴수당 = 주당 평균 근무시간 / 5 * 시급 * 주수
        const weeklyHolidayHours = avgWeeklyHours / 5
        weeklyHolidayPay = Math.round(hourlyRate * weeklyHolidayHours * weeksInMonth)
      }
    }

    const totalPay = basePay + overtimePay + nightPay + holidayPay + weeklyHolidayPay

    // upsert
    const { data: existing } = await supabase
      .from('payroll')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    if (existing) {
      if (existing.status === 'confirmed') continue // 확정된 건은 건드리지 않음
      await supabase.from('payroll').update({
        base_pay: basePay,
        overtime_pay: overtimePay,
        night_pay: nightPay,
        holiday_pay: holidayPay,
        weekly_holiday_pay: weeklyHolidayPay,
        deductions: 0,
        total_pay: totalPay,
        worked_hours: workedHours,
        worked_days: workedDays,
        status: 'draft',
      }).eq('id', existing.id)
      updated++
    } else {
      await supabase.from('payroll').insert({
        user_id: user.id,
        year_month: yearMonth,
        base_pay: basePay,
        overtime_pay: overtimePay,
        night_pay: nightPay,
        holiday_pay: holidayPay,
        weekly_holiday_pay: weeklyHolidayPay,
        deductions: 0,
        total_pay: totalPay,
        worked_hours: workedHours,
        worked_days: workedDays,
        status: 'draft',
      })
      created++
    }
  }

  revalidatePath('/admin/payroll')
  return { created, updated }
}

// 월별 급여 목록 조회 (관리자)
export async function getPayrollList(yearMonth: string): Promise<Payroll[]> {
  await requireManagerOrAdmin()

  const { data, error } = await supabase
    .from('payroll')
    .select('*, users(name, employment_type), confirmer:confirmed_by(name)')
    .eq('year_month', yearMonth)
    .order('total_pay', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toPayroll)
}

// 내 급여 명세서 조회
export async function getMyPayroll(yearMonth: string): Promise<Payroll | null> {
  const session = await requireAuth()

  const { data, error } = await supabase
    .from('payroll')
    .select('*, users(name, employment_type), confirmer:confirmed_by(name)')
    .eq('user_id', session.user.id)
    .eq('year_month', yearMonth)
    .single()

  if (error || !data) return null
  return toPayroll(data)
}

// 내 급여 이력 조회
export async function getMyPayrollHistory(): Promise<Payroll[]> {
  const session = await requireAuth()

  const { data, error } = await supabase
    .from('payroll')
    .select('*, users(name, employment_type)')
    .eq('user_id', session.user.id)
    .eq('status', 'confirmed')
    .order('year_month', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toPayroll)
}

// 급여 확정
export async function confirmPayroll(payrollId: string): Promise<void> {
  const session = await requireManagerOrAdmin()

  const { data: updated, error } = await supabase
    .from('payroll')
    .update({
      status: 'confirmed',
      confirmed_by: session.user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', payrollId)
    .eq('status', 'draft')
    .select('user_id, year_month, total_pay')
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (updated) {
    await recordAudit({
      actorId: session.user.id,
      actorName: session.user.name,
      action: 'confirm',
      entityType: 'payroll',
      entityId: payrollId,
      summary: `급여 확정 (${updated.year_month}, ${Number(updated.total_pay).toLocaleString('ko-KR')}원)`,
      afterData: updated,
    })
  }

  revalidatePath('/admin/payroll')
}

// 월별 전체 확정
export async function confirmAllPayroll(yearMonth: string): Promise<void> {
  const session = await requireManagerOrAdmin()

  const { data: updated, error } = await supabase
    .from('payroll')
    .update({
      status: 'confirmed',
      confirmed_by: session.user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq('year_month', yearMonth)
    .eq('status', 'draft')
    .select('id')

  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'confirm',
    entityType: 'payroll',
    entityId: yearMonth,
    summary: `급여 일괄 확정 (${yearMonth}, ${updated?.length ?? 0}건)`,
    afterData: { yearMonth, count: updated?.length ?? 0 },
  })

  revalidatePath('/admin/payroll')
}
