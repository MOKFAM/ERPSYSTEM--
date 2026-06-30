'use client'

import { useState, useEffect } from 'react'
import { getMySchedules } from '@/actions/schedules'
import type { Schedule } from '@/lib/types'

const positionLabels: Record<string, string> = { hall: '홀', kitchen: '주방' }
const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${dayLabels[d.getDay()]})`
}

export default function MyScheduleClient() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMySchedules(yearMonth)
      .then(setSchedules)
      .finally(() => setLoading(false))
  }, [yearMonth])

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <span className="text-sm font-medium text-gray-700">총 {schedules.length}일</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['날짜', '포지션', '시작', '종료', '상태', '메모'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatDate(s.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.position === 'hall' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {positionLabels[s.position]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{s.shiftStart.slice(0, 5)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{s.shiftEnd.slice(0, 5)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.isConfirmed ? '확정' : '미확정'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.note ?? '-'}</td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">해당 월의 스케줄이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
