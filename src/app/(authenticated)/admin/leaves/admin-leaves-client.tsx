'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAllLeaves, reviewLeave } from '@/actions/leaves'
import type { Leave } from '@/lib/types'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/lib/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function AdminLeavesClient() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const load = () => {
    setLoading(true)
    getAllLeaves(filter || undefined)
      .then(setLeaves)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleReview = (leaveId: string, decision: 'approved' | 'rejected') => {
    startTransition(async () => {
      await reviewLeave(leaveId, decision, comment)
      setReviewingId(null)
      setComment('')
      load()
    })
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex gap-2">
        {[
          { value: '', label: '전체' },
          { value: 'pending', label: '대기' },
          { value: 'approved', label: '승인' },
          { value: 'rejected', label: '반려' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['신청자', '종류', '기간', '사유', '상태', '처리'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{l.userName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{LEAVE_TYPE_LABELS[l.type]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {l.startDate === l.endDate ? l.startDate : `${l.startDate} ~ ${l.endDate}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{l.reason || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[l.status]}`}>
                      {LEAVE_STATUS_LABELS[l.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {l.status === 'pending' && (
                      reviewingId === l.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="의견 (선택)"
                            className="w-32 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                          />
                          <button
                            onClick={() => handleReview(l.id, 'approved')}
                            disabled={isPending}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReview(l.id, 'rejected')}
                            disabled={isPending}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            반려
                          </button>
                          <button
                            onClick={() => { setReviewingId(null); setComment('') }}
                            className="text-xs text-gray-700 hover:text-gray-900"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(l.id)}
                          className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                        >
                          검토
                        </button>
                      )
                    )}
                    {l.status !== 'pending' && l.reviewerName && (
                      <span className="text-xs text-gray-700">
                        {l.reviewerName}
                        {l.reviewComment && `: ${l.reviewComment}`}
                      </span>
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
      )}
    </div>
  )
}
