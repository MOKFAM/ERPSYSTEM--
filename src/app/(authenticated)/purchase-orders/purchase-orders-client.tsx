'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getMyPurchaseOrders, createPurchaseOrder, cancelPurchaseOrder,
  resubmitPurchaseOrder, getApprovalSteps,
} from '@/actions/purchase-orders'
import type { PurchaseOrder, ApprovalStep, OrderType } from '@/lib/types'
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

const today = () => new Date().toISOString().slice(0, 10)

export default function PurchaseOrdersClient() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])

  const load = () => {
    setLoading(true)
    getMyPurchaseOrders()
      .then(setOrders)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createPurchaseOrder(formData)
        setShowForm(false)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleCancel = (id: string) => {
    if (!confirm('발주 요청을 취소하시겠습니까?')) return
    startTransition(async () => {
      try {
        await cancelPurchaseOrder(id)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleResubmit = (id: string) => {
    if (!confirm('동일 내용으로 재신청하시겠습니까?')) return
    startTransition(async () => {
      try {
        await resubmitPurchaseOrder(id)
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

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-6">
      {/* 신청 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setError('') }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '발주/구매 신청'}
        </button>
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">요청 종류</label>
              <select name="orderType" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {(Object.entries(ORDER_TYPE_LABELS) as [OrderType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">제목</label>
              <input name="title" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">품목명</label>
              <input name="itemName" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">거래처 (선택)</label>
              <input name="vendorName" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">수량</label>
              <input name="quantity" type="number" step="0.001" min="0" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">단위</label>
              <input name="unit" defaultValue="ea" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">단가 (선택)</label>
              <input name="unitPrice" type="number" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">희망일</label>
              <input name="requestedDate" type="date" defaultValue={today()} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">사유</label>
              <textarea name="reason" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {isPending ? '처리 중...' : '신청하기'}
          </button>
        </form>
      )}

      {!showForm && error && <p className="text-sm text-red-700">{error}</p>}

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

      {/* 발주 목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['종류', '제목', '품목', '수량', '금액', '희망일', '상태', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{ORDER_TYPE_LABELS[o.orderType]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{o.title}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.itemName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.quantity} {o.unit}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {o.totalPrice !== null ? `${o.totalPrice.toLocaleString('ko-KR')}원` : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{o.requestedDate}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status]}`}>
                    {APPROVAL_STATUS_LABELS[o.status]}
                  </span>
                  {o.receivedAt && <span className="ml-1 text-xs text-green-700">납품완료</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => openHistory(o.id)} className="text-purple-700 hover:text-purple-800 text-xs font-medium">이력</button>
                    {o.status === 'pending' && (
                      <button onClick={() => handleCancel(o.id)} disabled={isPending} className="text-red-700 hover:text-red-800 text-xs font-medium">취소</button>
                    )}
                    {o.status === 'rejected' && (
                      <button onClick={() => handleResubmit(o.id)} disabled={isPending} className="text-blue-700 hover:text-blue-800 text-xs font-medium">재신청</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-700">발주 신청 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
