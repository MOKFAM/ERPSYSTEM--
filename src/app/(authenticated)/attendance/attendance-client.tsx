'use client'

import { useState, useEffect } from 'react'
import { getMyAttendance } from '@/actions/attendance'
import type { Attendance } from '@/lib/types'

const statusLabels: Record<string, string> = {
  normal: '정상',
  late: '지각',
  early_leave: '조퇴',
  absent: '결근',
}

const statusColors: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-700',
  early_leave: 'bg-orange-100 text-orange-700',
  absent: 'bg-red-100 text-red-700',
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}시간 ${m}분`
}

export default function AttendanceClient() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMyAttendance(yearMonth)
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [yearMonth])

  const totalWorkedMinutes = records.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0)
  const totalDays = records.filter((r) => r.clockIn).length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">
            출근 {totalDays}일 / 총 {formatMinutes(totalWorkedMinutes)}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['날짜', '출근', '퇴근', '근무시간', '상태'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{r.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatTime(r.clockIn)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatTime(r.clockOut)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatMinutes(r.workedMinutes)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    해당 월의 근태 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
