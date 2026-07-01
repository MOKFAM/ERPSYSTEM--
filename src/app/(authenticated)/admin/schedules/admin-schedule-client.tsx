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
      <div className="mb-4 flex items-center gap-3">
        <button onClick={prevMonth} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ◀ 이전 달
        </button>
        <span className="text-lg font-bold text-gray-900">
          {currentYear}년 {currentMonth + 1}월
        </span>
        <button onClick={nextMonth} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          다음 달 ▶
        </button>
        <button onClick={goToday} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          이번 달
        </button>
      </div>

      <MonthCalendar year={currentYear} month={currentMonth} onSelectWeek={handleSelectWeek} />
    </div>
  )
}

// ──────────────────────────────────────
// 월간 캘린더
// ──────────────────────────────────────
function MonthCalendar({ year, month, onSelectWeek }: { year: number; month: number; onSelectWeek: (d: Date) => void }) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay() // 0=일
  const daysInMonth = lastDay.getDate()

  const todayStr = new Date().toISOString().split('T')[0]

  // 달력 주(week) 배열 생성
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(startDayOfWeek).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  function getWeekMonday(weekIdx: number): Date {
    // 해당 주의 월요일 찾기
    const week = weeks[weekIdx]
    // 주에서 첫 번째 유효 날짜 찾기
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
            <th className="w-16 border-r border-slate-600 px-2 py-3 text-center text-xs font-semibold text-white">주</th>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <th key={d} className={`border-r border-slate-600 px-2 py-3 text-center text-xs font-semibold ${
                i === 0 ? 'text-red-300' : i === 6 ? 'text-blue-300' : 'text-white'
              }`}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => {
            const monday = getWeekMonday(weekIdx)
            const mondayStr = monday.toISOString().split('T')[0]
            const sundayDate = new Date(monday)
            sundayDate.setDate(monday.getDate() + 6)

            return (
              <tr key={weekIdx} className="border-t border-gray-200">
                {/* 주간 스케줄 이동 버튼 */}
                <td className="border-r border-gray-200 px-1 py-1 text-center">
                  <button
                    onClick={() => onSelectWeek(monday)}
                    className="w-full rounded-lg bg-blue-600 px-2 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                    title={`${formatShort(mondayStr)} ~ ${formatShort(sundayDate.toISOString().split('T')[0])} 주간 스케줄`}
                  >
                    주간
                  </button>
                </td>

                {/* 날짜 셀 */}
                {week.map((day, dayIdx) => {
                  if (day === null) return <td key={dayIdx} className="border-r border-gray-200 bg-gray-50 px-2 py-3" />

                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const isSunday = dayIdx === 0
                  const isSaturday = dayIdx === 6

                  return (
                    <td
                      key={dayIdx}
                      className={`border-r border-gray-200 px-2 py-3 text-center ${
                        isToday ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : isSunday
                            ? 'text-red-700'
                            : isSaturday
                              ? 'text-blue-700'
                              : 'text-gray-900'
                      }`}>
                        {day}
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
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
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← 월간 캘린더
        </button>
        <div className="h-6 w-px bg-gray-300" />
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ◀ 이전 주
        </button>
        <span className="text-sm font-bold text-gray-900">
          {formatShort(startDate)} ({formatDay(startDate)}) ~ {formatShort(endDate)} ({formatDay(endDate)})
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          다음 주 ▶
        </button>
        <button onClick={() => setWeekOffset(0)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          이번 주
        </button>
        <div className="ml-auto">
          <button onClick={handleConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
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
                      isToday(date) ? 'bg-blue-700' : isWeekend(date) ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div>{formatShort(date)}</div>
                    <div className={isWeekend(date) ? 'text-red-300' : 'text-slate-300'}>
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
                              ? 'bg-blue-100 hover:bg-blue-200'
                              : 'bg-yellow-100 hover:bg-yellow-200'
                            : 'hover:bg-gray-100'
                        } ${isToday(date) ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                      >
                        {schedule ? (
                          <div className="text-xs">
                            <div className="font-semibold text-gray-900">
                              {timeShort(schedule.shiftStart)}~{timeShort(schedule.shiftEnd)}
                            </div>
                            <div className={`${schedule.position === 'hall' ? 'text-blue-700' : 'text-purple-700'}`}>
                              {positionLabels[schedule.position]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-700">-</span>
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
              <tr className="border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 bg-slate-100 px-3 py-1 text-xs font-bold text-gray-900">인원 집계</td>
                <td colSpan={weekDates.length + 1} className="bg-slate-100" />
              </tr>
              <tr className="bg-slate-50">
                <td className="sticky left-0 z-10 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-gray-900">직원</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-gray-200 px-2 py-1.5 text-center text-sm font-bold text-gray-900">
                    {getDayCounts(date).fullTime}
                  </td>
                ))}
                <td />
              </tr>
              <tr className="bg-blue-50">
                <td className="sticky left-0 z-10 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">총인원</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-gray-200 px-2 py-1.5 text-center text-sm font-bold text-blue-900">
                    {getDayCounts(date).total}
                  </td>
                ))}
                <td />
              </tr>
              <tr className="bg-orange-50">
                <td className="sticky left-0 z-10 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900">알바(PT)</td>
                {weekDates.map((date) => (
                  <td key={date} className="border-r border-gray-200 px-2 py-1.5 text-center text-sm font-bold text-orange-900">
                    {getDayCounts(date).partTime}
                  </td>
                ))}
                <td />
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
  const [shiftStart, setShiftStart] = useState(modal.schedule?.shiftStart?.slice(0, 5) ?? '11:00')
  const [shiftEnd, setShiftEnd] = useState(modal.schedule?.shiftEnd?.slice(0, 5) ?? '22:00')
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
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> 출근 ({daySchedules.length}명)
            </h4>
            {daySchedules.length > 0 ? (
              <div className="space-y-1">
                {daySchedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                    <div>
                      <span className="font-medium text-gray-900">{s.userName}</span>
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        s.position === 'hall' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
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
    if (preset === 'morning') { setShiftStart('11:00'); setShiftEnd('15:00') }
    else if (preset === 'afternoon') { setShiftStart('17:00'); setShiftEnd('22:00') }
    else { setShiftStart('11:00'); setShiftEnd('22:00') }
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
          <button type="button" onClick={() => applyPreset('morning')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">오전 (11~15)</button>
          <button type="button" onClick={() => applyPreset('afternoon')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">오후 (17~22)</button>
          <button type="button" onClick={() => applyPreset('full')} className="flex-1 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">종일 (11~22)</button>
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
            <button type="button" onClick={() => setPosition('hall')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${position === 'hall' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>홀</button>
            <button type="button" onClick={() => setPosition('kitchen')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${position === 'kitchen' ? 'bg-purple-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>주방</button>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold text-gray-700">메모</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택 사항" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-700" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
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
