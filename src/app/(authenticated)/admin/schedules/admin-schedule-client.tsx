'use client'

import { useState, useEffect, useCallback } from 'react'
import { getWeekSchedules, createSchedule, updateSchedule, deleteSchedule, confirmWeekSchedules } from '@/actions/schedules'
import type { Schedule, User } from '@/lib/types'

const dayLabels = ['일', '월', '화', '수', '목', '금', '토']
const positionLabels: Record<string, string> = { hall: '홀', kitchen: '주방', both: '홀+주방' }

function getWeekDates(baseDate: Date): string[] {
  const start = new Date(baseDate)
  start.setDate(start.getDate() - start.getDay() + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return dayLabels[d.getDay()]
}

function timeShort(t: string): string {
  return t.slice(0, 5).replace(':00', '')
}

interface Props {
  users: User[]
}

interface ModalState {
  type: 'add' | 'edit' | 'dayDetail'
  userId?: string
  date?: string
  schedule?: Schedule
}

// ──────────────────────────────────────
// 메인 컴포넌트 — 월간 ↔ 주간 전환
// ──────────────────────────────────────
export default function AdminScheduleClient({ users }: Props) {
  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null)
  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([])
  const [monthLoading, setMonthLoading] = useState(false)

  const loadMonthSchedules = useCallback(async () => {
    setMonthLoading(true)
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const data = await getWeekSchedules(startDate, endDate)
      setMonthSchedules(data)
    } catch {
      setMonthSchedules([])
    } finally {
      setMonthLoading(false)
    }
  }, [currentYear, currentMonth])

  useEffect(() => {
    if (view === 'month') loadMonthSchedules()
  }, [view, loadMonthSchedules])

  function handleSelectWeek(weekStart: Date) {
    setSelectedWeekStart(weekStart)
    setView('week')
  }

  function handleBackToMonth() {
    setView('month')
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(currentYear - 1); setCurrentMonth(11) }
    else setCurrentMonth(currentMonth - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(currentYear + 1); setCurrentMonth(0) }
    else setCurrentMonth(currentMonth + 1)
  }

  function goToday() {
    setCurrentYear(new Date().getFullYear())
    setCurrentMonth(new Date().getMonth())
  }

  if (view === 'week' && selectedWeekStart) {
    return <WeekView users={users} initialDate={selectedWeekStart} onBack={handleBackToMonth} />
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button onClick={prevMonth} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {currentYear}년 {currentMonth + 1}월
        </h2>
        <button onClick={nextMonth} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={goToday} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          오늘
        </button>
        {monthLoading && <span className="text-xs text-gray-700">불러오는 중...</span>}
      </div>

      <MonthCalendar year={currentYear} month={currentMonth} schedules={monthSchedules} onSelectWeek={handleSelectWeek} />
    </div>
  )
}

// ──────────────────────────────────────
// 월간 캘린더
// ──────────────────────────────────────
function MonthCalendar({ year, month, schedules, onSelectWeek }: {
  year: number; month: number; schedules: Schedule[]; onSelectWeek: (d: Date) => void
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  // 날짜별 인원 집계
  const dayCounts = new Map<string, { ft: number; pt: number }>()
  for (const s of schedules) {
    const prev = dayCounts.get(s.date) ?? { ft: 0, pt: 0 }
    if (s.userEmploymentType === 'part_time') prev.pt++
    else prev.ft++
    dayCounts.set(s.date, prev)
  }

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(startDayOfWeek).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = [] }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  function getWeekMonday(weekIdx: number): Date {
    const week = weeks[weekIdx]
    const firstDayInWeek = week.find((d) => d !== null)
    if (!firstDayInWeek) return new Date(year, month, 1)
    const date = new Date(year, month, firstDayInWeek)
    const dayOfWeek = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7))
    return monday
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-slate-800">
            <th className="w-20 border-r border-slate-600 px-2 py-3 text-center text-xs font-semibold text-slate-300">주차</th>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <th key={d} className={`border-r border-slate-600 px-2 py-3 text-center text-xs font-semibold ${
                i === 0 ? 'text-rose-300' : i === 6 ? 'text-slate-300' : 'text-white'
              }`}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => {
            const monday = getWeekMonday(weekIdx)

            return (
              <tr key={weekIdx} className="border-t border-gray-100">
                <td className="border-r border-gray-200 px-1 py-1 text-center">
                  <button
                    onClick={() => onSelectWeek(monday)}
                    className="w-full rounded-lg bg-slate-800 px-2 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-700 hover:shadow-md active:scale-95"
                  >
                    {weekIdx + 1}주차
                  </button>
                </td>

                {week.map((day, dayIdx) => {
                  if (day === null) return <td key={dayIdx} className="border-r border-gray-100 bg-gray-50/50 px-2 py-2" />

                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const isSunday = dayIdx === 0
                  const isSaturday = dayIdx === 6
                  const counts = dayCounts.get(dateStr)
                  const total = counts ? counts.ft + counts.pt : 0

                  return (
                    <td
                      key={dayIdx}
                      className={`border-r border-gray-100 px-1.5 py-1.5 align-top transition-colors ${
                        isToday ? 'bg-amber-50' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday
                            ? 'bg-slate-800 text-white'
                            : isSunday
                              ? 'text-rose-600'
                              : isSaturday
                                ? 'text-slate-700'
                                : 'text-gray-900'
                        }`}>
                          {day}
                        </span>
                        {total > 0 ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700" title="직원">
                              {counts!.ft}
                            </span>
                            {counts!.pt > 0 && (
                              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700" title="알바">
                                {counts!.pt}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-0.5 h-4" />
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* 범례 */}
      <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">N</span>
          <span className="text-xs text-gray-700">직원</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">N</span>
          <span className="text-xs text-gray-700">알바(PT)</span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────
// 주간 그리드 뷰
// ──────────────────────────────────────
function WeekView({ users, initialDate, onBack }: { users: User[]; initialDate: Date; onBack: () => void }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)

  const baseDate = new Date(initialDate)
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWeekSchedules(startDate, endDate)
      setSchedules(data)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { loadSchedules() }, [loadSchedules])

  const activeUsers = users.filter((u) => u.isActive)

  // 직원별 스케줄 맵
  const scheduleMap = new Map<string, Map<string, Schedule>>()
  for (const s of schedules) {
    if (!scheduleMap.has(s.userId)) scheduleMap.set(s.userId, new Map())
    scheduleMap.get(s.userId)!.set(s.date, s)
  }

  function getDayCounts(date: string) {
    const daySchedules = schedules.filter((s) => s.date === date)
    const fullTime = daySchedules.filter((s) => s.userEmploymentType === 'full_time').length
    const partTime = daySchedules.filter((s) => s.userEmploymentType === 'part_time').length
    return { fullTime, total: daySchedules.length, partTime }
  }

  function getWeekWorkDays(userId: string): number {
    return scheduleMap.get(userId)?.size ?? 0
  }

  function handleCellClick(userId: string, date: string) {
    const existing = scheduleMap.get(userId)?.get(date)
    if (existing) {
      setModal({ type: 'edit', userId, date, schedule: existing })
    } else {
      setModal({ type: 'add', userId, date })
    }
  }

  function handleDateClick(date: string) {
    setModal({ type: 'dayDetail', date })
  }

  async function handleConfirm() {
    if (!confirm('이번 주 스케줄을 확정하시겠습니까?')) return
    try {
      await confirmWeekSchedules(startDate, endDate)
      await loadSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
  }

  const isToday = (date: string) => date === new Date().toISOString().split('T')[0]
  const isWeekend = (date: string) => {
    const d = new Date(date + 'T00:00:00').getDay()
    return d === 0 || d === 6
  }

  return (
    <div>
      {/* 상단 네비게이션 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← 월간 캘린더
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-bold text-gray-900">
          {formatShort(startDate)} ({formatDay(startDate)}) ~ {formatShort(endDate)} ({formatDay(endDate)})
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={() => setWeekOffset(0)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          이번 주
        </button>
        <div className="ml-auto">
          <button onClick={handleConfirm} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
            스케줄 확정
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 z-10 min-w-[120px] border-r border-slate-600 bg-slate-800 px-3 py-2.5 text-left text-xs font-semibold">
                  직원
                </th>
                {weekDates.map((date) => (
                  <th
                    key={date}
                    onClick={() => handleDateClick(date)}
                    className={`min-w-[90px] cursor-pointer border-r border-slate-600 px-2 py-2.5 text-center text-xs font-semibold transition-colors hover:bg-slate-700 ${
                      isToday(date) ? 'bg-slate-600' : isWeekend(date) ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div>{formatShort(date)}</div>
                    <div className={isWeekend(date) ? 'text-rose-300' : 'text-slate-300'}>
                      ({formatDay(date)})
                    </div>
                  </th>
                ))}
                <th className="min-w-[60px] px-2 py-2.5 text-center text-xs font-semibold">주근무</th>
              </tr>
            </thead>

            <tbody>
              {activeUsers.map((user, idx) => (
                <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 z-10 border-r border-gray-200 px-3 py-2 text-sm" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-700">
                      {positionLabels[user.positionType] ?? ''}
                      {user.employmentType === 'part_time' && (
                          <span className="ml-1 rounded bg-orange-100 px-1 text-orange-700">PT</span>
                      )}
                    </div>
                  </td>

                  {weekDates.map((date) => {
                    const schedule = scheduleMap.get(user.id)?.get(date)
                    return (
                      <td
                        key={date}
                        onClick={() => handleCellClick(user.id, date)}
                        className={`cursor-pointer border-r border-gray-200 px-1 py-1.5 text-center transition-colors ${
                          schedule
                            ? schedule.isConfirmed
                              ? 'bg-emerald-50 hover:bg-emerald-100'
                              : 'bg-amber-50 hover:bg-amber-100'
                            : 'hover:bg-gray-50'
                        } ${isToday(date) ? 'ring-2 ring-inset ring-slate-300' : ''}`}
                      >
                        {schedule ? (
                          <div className={`rounded-md px-1.5 py-1 ${
                            schedule.position === 'hall'
                              ? 'bg-yellow-300 text-gray-900'
                              : schedule.position === 'kitchen'
                                ? 'bg-slate-700 text-white'
                                : 'bg-amber-600 text-white'
                          }`}>
                            <div className="text-xs font-bold">
                              {timeShort(schedule.shiftStart)}~{timeShort(schedule.shiftEnd)}
                            </div>
                            <div className="text-sm font-extrabold tracking-wide">
                              {positionLabels[schedule.position]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    )
                  })}

                  <td className="border-r border-gray-200 px-2 py-2 text-center text-sm font-bold text-gray-900">
                    {getWeekWorkDays(user.id)}일
                  </td>
                </tr>
              ))}

              {/* 집계 */}
              <tr className="border-t-2 border-slate-400">
                <td className="sticky left-0 z-10 bg-slate-800 px-3 py-2 text-xs font-bold text-white rounded-bl-none">인원 집계</td>
                <td colSpan={weekDates.length + 1} className="bg-slate-800" />
              </tr>
              <tr className="bg-slate-50">
                <td className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-xs font-bold text-gray-900">직원</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-slate-200 px-2 py-2.5 text-center text-lg font-extrabold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums', fontStretch: 'expanded' }}>
                    {getDayCounts(date).fullTime}
                  </td>
                ))}
                <td />
              </tr>
              <tr className="bg-orange-50 border-t border-orange-200">
                <td className="sticky left-0 z-10 bg-orange-50 border-r border-orange-200 px-3 py-2.5 text-xs font-bold text-orange-800">알바(PT)</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-orange-200 px-2 py-2.5 text-center text-lg font-extrabold text-orange-800" style={{ fontVariantNumeric: 'tabular-nums', fontStretch: 'expanded' }}>
                    {getDayCounts(date).partTime}
                  </td>
                ))}
                <td />
              </tr>
              <tr className="bg-slate-700 border-t border-slate-500">
                <td className="sticky left-0 z-10 bg-slate-700 border-r border-slate-500 px-3 py-2.5 text-xs font-bold text-white">총인원</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-slate-500 px-2 py-2.5 text-center text-xl font-black text-white" style={{ fontVariantNumeric: 'tabular-nums', fontStretch: 'expanded' }}>
                    {getDayCounts(date).total}
                  </td>
                ))}
                <td className="bg-slate-700" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ScheduleModal
          modal={modal}
          users={activeUsers}
          schedules={schedules}
          onClose={() => setModal(null)}
          onSave={async () => { await loadSchedules(); setModal(null) }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────
// 모달 컴포넌트
// ──────────────────────────────────────
function ScheduleModal({
  modal, users, schedules, onClose, onSave,
}: {
  modal: ModalState; users: User[]; schedules: Schedule[]; onClose: () => void; onSave: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [shiftStart, setShiftStart] = useState(modal.schedule?.shiftStart?.slice(0, 5) ?? '09:00')
  const [shiftEnd, setShiftEnd] = useState(modal.schedule?.shiftEnd?.slice(0, 5) ?? '21:00')
  const [position, setPosition] = useState(modal.schedule?.position ?? 'hall')
  const [note, setNote] = useState(modal.schedule?.note ?? '')

  if (modal.type === 'dayDetail' && modal.date) {
    const date = modal.date
    const daySchedules = schedules.filter((s) => s.date === date)
    const workingUserIds = new Set(daySchedules.map((s) => s.userId))
    const offUsers = users.filter((u) => !workingUserIds.has(u.id))
    const d = new Date(date + 'T00:00:00')
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()} (${dayLabels[d.getDay()]})`

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-4 text-lg font-bold text-gray-900">{dateLabel} 인원 현황</h3>
          <div className="mb-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="inline-block h-3 w-3 rounded-full bg-slate-600" /> 출근 ({daySchedules.length}명)
            </h4>
            {daySchedules.length > 0 ? (
              <div className="space-y-1">
                {daySchedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <span className="font-medium text-gray-900">{s.userName}</span>
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        s.position === 'hall' ? 'bg-slate-100 text-slate-700' : 'bg-purple-100 text-purple-700'
                      }`}>{positionLabels[s.position]}</span>
                    </div>
                    <span className="text-sm text-gray-700">{s.shiftStart.slice(0, 5)} ~ {s.shiftEnd.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-700">출근 인원 없음</p>}
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="inline-block h-3 w-3 rounded-full bg-gray-400" /> OFF ({offUsers.length}명)
            </h4>
            {offUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {offUsers.map((u) => (
                  <span key={u.id} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">{u.name}</span>
                ))}
              </div>
            ) : <p className="text-sm text-gray-700">전원 출근</p>}
          </div>
          <button onClick={onClose} className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">닫기</button>
        </div>
      </div>
    )
  }

  const isEdit = modal.type === 'edit'
  const userName = users.find((u) => u.id === modal.userId)?.name ?? ''
  const dateObj = modal.date ? new Date(modal.date + 'T00:00:00') : new Date()
  const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${dayLabels[dateObj.getDay()]})`

  function applyPreset(preset: 'morning' | 'afternoon' | 'full') {
    if (preset === 'morning') { setShiftStart('09:00'); setShiftEnd('16:00') }
    else if (preset === 'afternoon') { setShiftStart('17:00'); setShiftEnd('21:00') }
    else { setShiftStart('09:00'); setShiftEnd('21:00') }
  }

  async function handleSubmit() {
    setSaving(true); setError('')
    try {
      const formData = new FormData()
      formData.set('userId', modal.userId!)
      formData.set('date', modal.date!)
      formData.set('shiftStart', shiftStart)
      formData.set('shiftEnd', shiftEnd)
      formData.set('position', position)
      formData.set('note', note)
      formData.set('branchId', '')
      if (isEdit && modal.schedule) await updateSchedule(modal.schedule.id, formData)
      else await createSchedule(formData)
      await onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!modal.schedule || !confirm('이 스케줄을 삭제하시겠습니까?')) return
    setSaving(true)
    try { await deleteSchedule(modal.schedule.id); await onSave() }
    catch (err) { setError(err instanceof Error ? err.message : '오류 발생'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-bold text-gray-900">{isEdit ? '스케줄 수정' : '스케줄 추가'}</h3>
        <p className="mb-4 text-sm text-gray-700">{userName} · {dateLabel}</p>
        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => applyPreset('morning')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">오전 (9~16)</button>
          <button type="button" onClick={() => applyPreset('afternoon')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">오후 (17~21)</button>
          <button type="button" onClick={() => applyPreset('full')} className="flex-1 rounded-lg border border-slate-400 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">종일 (9~21)</button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">시작 시간</label>
            <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">종료 시간</label>
            <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-gray-700">포지션</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPosition('hall')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${position === 'hall' ? 'bg-slate-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>홀</button>
            <button type="button" onClick={() => setPosition('kitchen')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${position === 'kitchen' ? 'bg-purple-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>주방</button>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold text-gray-700">메모</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-700" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
          {isEdit && (
            <button onClick={handleDelete} disabled={saving} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">삭제</button>
          )}
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
        </div>
      </div>
    </div>
  )
}
