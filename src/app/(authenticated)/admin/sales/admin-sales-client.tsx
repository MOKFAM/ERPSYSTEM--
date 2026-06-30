'use client'

import { useState, useEffect } from 'react'
import { getSalesStats } from '@/actions/sales'
import { PAYMENT_METHOD_LABELS } from '@/lib/types'
import type { PaymentMethod } from '@/lib/types'
import { downloadCsv } from '@/lib/csv'

function formatWon(n: number) { return n.toLocaleString('ko-KR') + '원' }

export default function AdminSalesClient() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [stats, setStats] = useState<{
    daily: { date: string; total: number; count: number }[]
    menuRanking: { menuName: string; quantity: number; total: number }[]
    paymentSummary: { method: string; total: number; count: number }[]
    grandTotal: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSalesStats(yearMonth)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [yearMonth])

  const handleExport = () => {
    if (!stats) return
    downloadCsv(
      `매출_${yearMonth}`,
      ['날짜', '매출액', '건수'],
      stats.daily.map((d) => [d.date, d.total, d.count])
    )
  }

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>
  if (!stats) return null

  const maxDaily = Math.max(...stats.daily.map((d) => d.total), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <span className="text-lg font-bold text-gray-900">총 매출: {formatWon(stats.grandTotal)}</span>
        <button
          onClick={handleExport}
          disabled={stats.daily.length === 0}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
      </div>

      {/* 일별 매출 차트 (간이 바 차트) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">일별 매출</h3>
        {stats.daily.length === 0 ? (
          <p className="text-sm text-gray-700">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {stats.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-gray-900">{d.date.slice(5)}</span>
                <div className="flex-1">
                  <div
                    className="h-6 rounded bg-blue-500"
                    style={{ width: `${(d.total / maxDaily) * 100}%` }}
                  />
                </div>
                <span className="w-28 text-right text-xs font-medium text-gray-900">{formatWon(d.total)}</span>
                <span className="w-12 text-right text-xs text-gray-700">{d.count}건</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* 메뉴별 판매 순위 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">메뉴별 판매 순위</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {['순위', '메뉴', '수량', '매출'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.menuRanking.map((m, i) => (
                  <tr key={m.menuName}>
                    <td className="px-3 py-2 text-sm font-bold text-gray-900">{i + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{m.menuName}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{m.quantity}개</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{formatWon(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 결제수단별 집계 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">결제수단별</h3>
          <div className="space-y-3">
            {stats.paymentSummary.map((p) => (
              <div key={p.method} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatWon(p.total)}</p>
                  <p className="text-xs text-gray-700">{p.count}건</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
