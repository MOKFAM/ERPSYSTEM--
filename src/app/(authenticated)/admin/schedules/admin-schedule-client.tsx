'use client'

import { useState, useEffect } from 'react'
import { getWeekSchedules, createSchedule, deleteSchedule, confirmWeekSchedules } from '@/actions/schedules'
import type { Schedule, User } from '@/lib/types'

const positionLabels: Record<string, string> = { hall: '홀', kitchen: '주방' }
const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

function getWeekDates(baseDate: Date): string[] {
  const start = new Date(baseDate)
  start.setDate(start.getDate() - start.getDay() + 1) // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${dayLabels[d.getDay()]})`
}

interface Props {
  users: User[]
}

export default function AdminScheduleClient({ users }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [positionFilter, setPositionFilter] = useState<'all' | 'hall' | 'kitchen'>('all')

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  useEffect(() => {
    setLoading(true)
    getWeekSchedules(startDate, endDate)
      .then(setSchedules)
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  const filteredSchedules = positionFilter === 'all'
    ? schedules
    : schedules.filter((s) => s.position === positionFilter)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    try {
      await createSchedule(formData)
      const updated = await getWeekSchedules(startDate, endDate)
      setSchedules(updated)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return
    try {
      await deleteSchedule(id)
      const updated = await getWeekSchedules(startDate, endDate)
      setSchedules(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
  }

  async function handleConfirm() {
    if (!confirm('이번 주 스케줄을 확정하시겠습니까?')) return
    try {
      await confirmWeekSchedules(startDate, endDate)
      const updated = await getWeekSchedules(startDate, endDate)
      setSchedules(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ◀ 이전 주
        </button>
        <span className="text-sm font-medium text-gray-900">
          {formatDate(startDate)} ~ {formatDate(endDate)}
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          다음 주 ▶
        </button>
        <button onClick={() => setWeekOffset(0)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          이번 주
        </button>

        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value as 'all' | 'hall' | 'kitchen')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
        >
          <option value="all">전체 포지션</option>
          <option value="hall">홀</option>
          <option value="kitchen">주방</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleConfirm}
            className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
          >
            스케줄 확정
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setError('') }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            스케줄 추가
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">스케줄 추가</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">직원</label>
              <select name="userId" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">선택</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.jobTitle ?? u.positionType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">날짜</label>
              <input name="date" type="date" required defaultValue={startDate} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">포지션</label>
              <select name="position" required className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="hall">홀</option>
                <option value="kitchen">주방</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">시작 시간</label>
              <input name="shiftStart" type="time" required defaultValue="09:00" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">종료 시간</label>
              <input name="shiftEnd" type="time" required defaultValue="18:00" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">메모</label>
              <input name="note" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input type="hidden" name="branchId" value="" />
            <div className="col-span-full flex gap-2">
              <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">추가</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['직원', '날짜', '포지션', '시작', '종료', '상태', '메모', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchedules.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{s.userName ?? '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(s.date)}</td>
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {!s.isConfirmed && (
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800">삭제</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">이번 주 스케줄이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
