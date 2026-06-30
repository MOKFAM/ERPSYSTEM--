'use client'

import { useState, useEffect } from 'react'
import { getAllAttendance, getTodayAllAttendance } from '@/actions/attendance'
import type { Attendance } from '@/lib/types'
import { downloadCsv } from '@/lib/csv'

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

export default function AdminAttendanceClient() {
  const now = new Date()
  const [view, setView] = useState<'today' | 'monthly'>('today')
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetch = view === 'today'
      ? getTodayAllAttendance()
      : getAllAttendance(yearMonth)
    fetch.then(setRecords).finally(() => setLoading(false))
  }, [view, yearMonth])

  const handleExport = () => {
    const label = view === 'today' ? new Date().toISOString().slice(0, 10) : yearMonth
    downloadCsv(
      `근태_${label}`,
      ['직원', '날짜', '출근', '퇴근', '근무시간(분)', '상태'],
      records.map((r) => [
        r.userName ?? '',
        r.date,
        formatTime(r.clockIn),
        formatTime(r.clockOut),
        r.workedMinutes ?? '',
        statusLabels[r.status] ?? r.status,
      ])
    )
  }

  // 전사 현황 집계
  const summary = {
    total: records.length,
    normal: records.filter((r) => r.status === 'normal').length,
    late: records.filter((r) => r.status === 'late').length,
    earlyLeave: records.filter((r) => r.status === 'early_leave').length,
    absent: records.filter((r) => r.status === 'absent').length,
  }

  return (
    <div>
      {/* 전사 근태 현황 요약 */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">전체</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total}건</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">정상</p>
            <p className="text-2xl font-bold text-green-900">{summary.normal}건</p>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">지각</p>
            <p className="text-2xl font-bold text-yellow-900">{summary.late}건</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-800">조퇴</p>
            <p className="text-2xl font-bold text-orange-900">{summary.earlyLeave}건</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">결근</p>
            <p className="text-2xl font-bold text-red-900">{summary.absent}건</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-300">
          <button
            onClick={() => setView('today')}
            className={`px-4 py-2 text-sm font-medium ${
              view === 'today' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            } rounded-l-lg`}
          >
            오늘
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-4 py-2 text-sm font-medium ${
              view === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            } rounded-r-lg`}
          >
            월별
          </button>
        </div>

        {view === 'monthly' && (
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        )}

        <span className="text-sm text-gray-700">총 {records.length}건</span>

        <button
          onClick={handleExport}
          disabled={records.length === 0}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['직원', '날짜', '출근', '퇴근', '근무시간', '상태'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {r.userName ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{r.date}</td>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">
                    근태 기록이 없습니다.
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
