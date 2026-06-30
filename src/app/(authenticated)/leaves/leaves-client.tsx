'use client'

import { useState, useEffect, useTransition } from 'react'
import { getMyLeaves, createLeave, cancelLeave, getAnnualLeaveBalance } from '@/actions/leaves'
import type { Leave, LeaveType } from '@/lib/types'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/lib/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function LeavesClient() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [balance, setBalance] = useState<{ total: number; used: number; remaining: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getMyLeaves(), getAnnualLeaveBalance()])
      .then(([l, b]) => { setLeaves(l); setBalance(b) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createLeave(formData)
        setShowForm(false)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleCancel = (id: string) => {
    if (!confirm('휴가 신청을 취소하시겠습니까?')) return
    startTransition(async () => {
      try {
        await cancelLeave(id)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-6">
      {/* 연차 잔여 현황 */}
      {balance && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">총 연차</p>
            <p className="text-2xl font-bold text-gray-900">{balance.total}일</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">사용</p>
            <p className="text-2xl font-bold text-blue-700">{balance.used}일</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">잔여</p>
            <p className="text-2xl font-bold text-green-700">{balance.remaining}일</p>
          </div>
        </div>
      )}

      {/* 신청 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '휴가 신청'}
        </button>
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">휴가 종류</label>
              <select name="type" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">시작일</label>
              <input type="date" name="startDate" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">종료일</label>
              <input type="date" name="endDate" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">사유</label>
              <textarea name="reason" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? '처리 중...' : '신청하기'}
          </button>
        </form>
      )}

      {/* 휴가 목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['종류', '기간', '사유', '상태', '검토자', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaves.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {LEAVE_TYPE_LABELS[l.type]}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {l.startDate === l.endDate ? l.startDate : `${l.startDate} ~ ${l.endDate}`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{l.reason || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[l.status]}`}>
                    {LEAVE_STATUS_LABELS[l.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {l.reviewerName || '-'}
                  {l.reviewComment && <span className="ml-1 text-gray-700">({l.reviewComment})</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {l.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(l.id)}
                      disabled={isPending}
                      className="text-red-700 hover:text-red-800 text-xs font-medium"
                    >
                      취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">
                  휴가 신청 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
