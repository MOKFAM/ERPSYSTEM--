'use client'

import { useState, useEffect, useMemo } from 'react'
import { getApprovedLeavesForMonth } from '@/actions/leaves'
import { getKoreanHolidays } from '@/lib/holidays'
import type { Leave } from '@/lib/types'
import { LEAVE_TYPE_LABELS } from '@/lib/types'

const leaveColors: Record<string, string> = {
  annual: 'bg-blue-100 text-blue-800',
  half_am: 'bg-sky-100 text-sky-800',
  half_pm: 'bg-sky-100 text-sky-800',
  sick: 'bg-red-100 text-red-800',
  family_event: 'bg-purple-100 text-purple-800',
  substitute: 'bg-teal-100 text-teal-800',
}

export default function LeaveCalendarClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`

  useEffect(() => {
    setLoading(true)
    getApprovedLeavesForMonth(yearMonth)
      .then(setLeaves)
      .finally(() => setLoading(false))
  }, [yearMonth])

  const holidays = useMemo(() => {
    const list = getKoreanHolidays(year)
    const map = new Map<string, string>()
    for (const h of list) map.set(h.date, h.name)
    return map
  }, [year])

  // 달력 데이터 생성
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  // 날짜별 휴가 매핑
  const dayLeaveMap = new Map<number, Leave[]>()
  for (const leave of leaves) {
    const start = new Date(leave.startDate)
    const end = new Date(leave.endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const day = d.getDate()
        if (!dayLeaveMap.has(day)) dayLeaveMap.set(day, [])
        dayLeaveMap.get(day)!.push(leave)
      }
    }
  }

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50">
          ← 이전
        </button>
        <h3 className="text-lg font-bold text-gray-900">{year}년 {month}월</h3>
        <button onClick={nextMonth} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50">
          다음 →
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`px-2 py-2 text-center text-xs font-medium ${
                i === 0 ? 'text-red-700' : i === 6 ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[80px] bg-gray-50" />
              }
              const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`
              const holiday = holidays.get(dateStr)
              const dayOfWeek = (firstDay + day - 1) % 7
              const dayLeaves = dayLeaveMap.get(day) ?? []

              return (
                <div key={day} className={`min-h-[80px] p-1 ${holiday ? 'bg-red-50' : ''}`}>
                  <div className={`text-xs font-medium mb-0.5 ${
                    holiday || dayOfWeek === 0 ? 'text-red-700' : dayOfWeek === 6 ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {day}
                    {holiday && <span className="ml-1 text-red-700">{holiday}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.map((l) => (
                      <div
                        key={l.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${leaveColors[l.type] || 'bg-gray-100 text-gray-800'}`}
                        title={`${l.userName} - ${LEAVE_TYPE_LABELS[l.type]}`}
                      >
                        {l.userName} {LEAVE_TYPE_LABELS[l.type]}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
