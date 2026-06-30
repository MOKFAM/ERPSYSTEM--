'use client'

import { useState, useEffect } from 'react'
import { clockIn, clockOut, getTodayAttendance } from '@/actions/attendance'
import type { Attendance } from '@/lib/types'

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

export default function ClockButton() {
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    getTodayAttendance().then(setAttendance)
  }, [])

  async function handleClockIn() {
    setLoading(true)
    setError('')
    try {
      await clockIn()
      const updated = await getTodayAttendance()
      setAttendance(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
    setLoading(false)
  }

  async function handleClockOut() {
    if (!confirm('퇴근 처리하시겠습니까?')) return
    setLoading(true)
    setError('')
    try {
      await clockOut()
      const updated = await getTodayAttendance()
      setAttendance(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
    setLoading(false)
  }

  if (!mounted) return null

  const hasClockIn = !!attendance?.clockIn
  const hasClockOut = !!attendance?.clockOut

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900">오늘 출퇴근</h3>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-6">
        <div className="text-sm">
          <p className="text-gray-700">출근</p>
          <p className="text-lg font-medium text-gray-900">{formatTime(attendance?.clockIn ?? null)}</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-700">퇴근</p>
          <p className="text-lg font-medium text-gray-900">{formatTime(attendance?.clockOut ?? null)}</p>
        </div>
        {hasClockOut && (
          <div className="text-sm">
            <p className="text-gray-700">근무시간</p>
            <p className="text-lg font-medium text-gray-900">{formatMinutes(attendance?.workedMinutes ?? null)}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {!hasClockIn && (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="min-h-[48px] min-w-[120px] rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:py-2.5 sm:text-sm"
          >
            {loading ? '처리 중...' : '출근'}
          </button>
        )}
        {hasClockIn && !hasClockOut && (
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="min-h-[48px] min-w-[120px] rounded-lg bg-red-600 px-6 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:py-2.5 sm:text-sm"
          >
            {loading ? '처리 중...' : '퇴근'}
          </button>
        )}
        {hasClockOut && (
          <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            근무 완료
          </span>
        )}
      </div>
    </div>
  )
}
