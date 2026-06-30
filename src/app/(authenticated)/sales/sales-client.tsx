'use client'

import { useState, useEffect, useTransition } from 'react'
import { createSale, getTodaySales } from '@/actions/sales'
import { getMenuItems } from '@/actions/menu'
import type { Sale, MenuItem } from '@/lib/types'
import { PAYMENT_METHOD_LABELS } from '@/lib/types'

function formatWon(n: number) { return n.toLocaleString('ko-KR') + '원' }

export default function SalesClient() {
  const [sales, setSales] = useState<Sale[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getTodaySales(), getMenuItems(true)])
      .then(([s, m]) => { setSales(s); setMenuItems(m) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createSale(formData)
        load()
        ;(e.target as HTMLFormElement).reset()
        setSelectedMenu(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleMenuSelect = (menuId: string) => {
    const menu = menuItems.find((m) => m.id === menuId) ?? null
    setSelectedMenu(menu)
  }

  const todayTotal = sales.reduce((sum, s) => sum + s.totalPrice, 0)
  const todayCount = sales.reduce((sum, s) => sum + s.quantity, 0)

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-6">
      {/* 오늘 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700">오늘 매출</p>
          <p className="text-2xl font-bold text-gray-900">{formatWon(todayTotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700">판매 수량</p>
          <p className="text-2xl font-bold text-gray-900">{todayCount}건</p>
        </div>
      </div>

      {/* 매출 등록 폼 */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">매출 등록</h3>
        <input type="hidden" name="date" value={new Date().toISOString().split('T')[0]} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">메뉴 선택</label>
            <select
              name="menuItemId"
              onChange={(e) => handleMenuSelect(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value="">직접 입력</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({formatWon(m.price)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">메뉴명</label>
            <input
              name="menuName"
              required
              value={selectedMenu?.name ?? ''}
              onChange={(e) => { if (!selectedMenu) return; setSelectedMenu({ ...selectedMenu, name: e.target.value }) }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">수량</label>
            <input name="quantity" type="number" min="1" defaultValue="1" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">단가 (원)</label>
            <input
              name="unitPrice"
              type="number"
              min="0"
              required
              value={selectedMenu?.price ?? ''}
              onChange={(e) => { if (!selectedMenu) return; setSelectedMenu({ ...selectedMenu, price: Number(e.target.value) }) }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">결제수단</label>
            <select name="paymentMethod" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '처리 중...' : '등록'}
        </button>
      </form>

      {/* 오늘 매출 목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['메뉴', '수량', '단가', '합계', '결제', '등록자', '시간'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{s.menuName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{s.quantity}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatWon(s.unitPrice)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{formatWon(s.totalPrice)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{PAYMENT_METHOD_LABELS[s.paymentMethod]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{s.creatorName || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {new Date(s.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-700">오늘 매출이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
