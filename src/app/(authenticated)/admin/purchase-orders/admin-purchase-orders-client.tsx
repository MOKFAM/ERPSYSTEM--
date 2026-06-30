'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getAllPurchaseOrders, reviewPurchaseOrder, confirmDelivery, getApprovalSteps,
} from '@/actions/purchase-orders'
import type { PurchaseOrder, ApprovalStep } from '@/lib/types'
import {
  ORDER_TYPE_LABELS, APPROVAL_STATUS_LABELS, APPROVAL_ACTION_LABELS,
} from '@/lib/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-200 text-gray-800',
}

const filters = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'in_review', label: '검토중' },
  { value: 'on_hold', label: '보류' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '반려' },
]

export default function AdminPurchaseOrdersClient() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])
  const [query, setQuery] = useState('')

  const load = () => {
    setLoading(true)
    getAllPurchaseOrders(filter || undefined)
      .then(setOrders)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleReview = (
    orderId: string,
    action: 'in_review' | 'approved' | 'rejected' | 'on_hold'
  ) => {
    setError('')
    startTransition(async () => {
      try {
        await reviewPurchaseOrder(orderId, action, comment || undefined)
        setReviewingId(null)
        setComment('')
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleDelivery = (order: PurchaseOrder) => {
    const input = prompt('납품 수량을 입력하세요.', String(order.quantity))
    if (input === null) return
    const qty = Number(input)
    if (!qty || qty <= 0) { setError('납품 수량이 올바르지 않습니다.'); return }
    setError('')
    startTransition(async () => {
      try {
        await confirmDelivery(order.id, qty)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const openHistory = async (id: string) => {
    setHistoryId(id)
    setSteps(await getApprovalSteps(id))
  }

  const q = query.trim().toLowerCase()
  const filteredOrders = orders.filter((o) =>
    !q ||
    (o.requesterName ?? '').toLowerCase().includes(q) ||
    o.title.toLowerCase().includes(q) ||
    o.itemName.toLowerCase().includes(q)
  )

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="신청자/제목/품목 검색"
          className="ml-auto w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {/* 결재 이력 */}
      {historyId && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">결재 이력</h3>
            <button onClick={() => setHistoryId(null)} className="text-sm text-gray-700 hover:text-gray-900">닫기</button>
          </div>
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right text-gray-500">{s.stepNo}</span>
                <span className="font-medium text-gray-900">{APPROVAL_ACTION_LABELS[s.action]}</span>
                <span className="text-gray-700">{s.actorName || '-'}</span>
                {s.comment && <span className="text-gray-500">— {s.comment}</span>}
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </span>
              </li>
            ))}
            {steps.length === 0 && <li className="text-sm text-gray-700">이력이 없습니다.</li>}
          </ol>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['신청자', '종류', '제목', '품목', '수량', '금액', '상태', '처리'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{o.requesterName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{ORDER_TYPE_LABELS[o.orderType]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.title}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.itemName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.quantity} {o.unit}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {o.totalPrice !== null ? `${o.totalPrice.toLocaleString('ko-KR')}원` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status]}`}>
                      {APPROVAL_STATUS_LABELS[o.status]}
                    </span>
                    {o.receivedAt && <span className="ml-1 text-xs text-green-700">납품완료</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {reviewingId === o.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="의견 (반려 시 필수)"
                          className="w-44 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                        />
                        <div className="flex flex-wrap gap-1">
                          {(o.status === 'pending' || o.status === 'on_hold') && (
                            <button onClick={() => handleReview(o.id, 'in_review')} disabled={isPending} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">검토</button>
                          )}
                          <button onClick={() => handleReview(o.id, 'approved')} disabled={isPending} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">승인</button>
                          <button onClick={() => handleReview(o.id, 'rejected')} disabled={isPending} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">반려</button>
                          <button onClick={() => handleReview(o.id, 'on_hold')} disabled={isPending} className="rounded bg-gray-500 px-2 py-1 text-xs font-medium text-white hover:bg-gray-600">보류</button>
                          <button onClick={() => { setReviewingId(null); setComment('') }} className="px-2 py-1 text-xs text-gray-700 hover:text-gray-900">닫기</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => openHistory(o.id)} className="text-purple-700 hover:text-purple-800 text-xs font-medium">이력</button>
                        {['pending', 'in_review', 'on_hold'].includes(o.status) && (
                          <button onClick={() => { setReviewingId(o.id); setComment('') }} className="text-blue-700 hover:text-blue-800 text-xs font-medium">결재</button>
                        )}
                        {o.status === 'approved' && !o.receivedAt && (
                          <button onClick={() => handleDelivery(o)} disabled={isPending} className="text-green-700 hover:text-green-800 text-xs font-medium">납품확인</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-700">
                    {orders.length === 0 ? '발주 요청이 없습니다.' : '검색 결과가 없습니다.'}
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
