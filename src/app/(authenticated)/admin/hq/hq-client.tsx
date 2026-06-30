'use client'

import { useState, useEffect, useTransition } from 'react'
import { getHqSalesSummary, getHqInventorySummary, getHqComparison } from '@/actions/hq'
import type { BranchSalesSummary, BranchInventorySummary, HqReportData } from '@/lib/types'

type Tab = 'sales' | 'inventory' | 'comparison'

function getDefaultYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function HqClient() {
  const [tab, setTab] = useState<Tab>('sales')
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth)
  const [salesData, setSalesData] = useState<BranchSalesSummary[]>([])
  const [inventoryData, setInventoryData] = useState<BranchInventorySummary[]>([])
  const [comparisonData, setComparisonData] = useState<HqReportData | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (tab === 'sales') {
      startTransition(async () => {
        const data = await getHqSalesSummary(yearMonth)
        setSalesData(data)
      })
    } else if (tab === 'inventory') {
      startTransition(async () => {
        const data = await getHqInventorySummary()
        setInventoryData(data)
      })
    } else {
      startTransition(async () => {
        const data = await getHqComparison(yearMonth)
        setComparisonData(data)
      })
    }
  }, [tab, yearMonth])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: '매출 현황' },
    { key: 'inventory', label: '재고 현황' },
    { key: 'comparison', label: '비교 분석' },
  ]

  return (
    <div className="space-y-6">
      {/* 탭 + 월 선택 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${t.key === 'sales' ? 'rounded-l-lg' : ''} ${t.key === 'comparison' ? 'rounded-r-lg' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'inventory' && (
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}
      </div>

      {isPending && <p className="text-sm text-gray-700">불러오는 중...</p>}

      {/* 매출 현황 탭 */}
      {tab === 'sales' && !isPending && <SalesTab data={salesData} />}

      {/* 재고 현황 탭 */}
      {tab === 'inventory' && !isPending && <InventoryTab data={inventoryData} />}

      {/* 비교 분석 탭 */}
      {tab === 'comparison' && !isPending && comparisonData && (
        <ComparisonTab data={comparisonData} />
      )}
    </div>
  )
}

function SalesTab({ data }: { data: BranchSalesSummary[] }) {
  const maxSales = Math.max(...data.map((d) => d.totalSales), 1)

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-sm text-gray-700">매출 데이터가 없습니다.</p>
      ) : (
        <>
          {/* 지점별 매출 바 차트 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">지점별 월 매출</h3>
            <div className="space-y-3">
              {data.map((b) => (
                <div key={b.branchId} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium text-gray-900 shrink-0">{b.branchName}</span>
                  <div className="flex-1 h-8 rounded bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded bg-blue-500 transition-all"
                      style={{ width: `${Math.max((b.totalSales / maxSales) * 100, 1)}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-sm font-medium text-gray-900 shrink-0">
                    {b.totalSales.toLocaleString('ko-KR')}원
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 지점별 상세 테이블 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">지점별 상세</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium text-gray-700">지점</th>
                  <th className="py-2 text-right font-medium text-gray-700">총 매출</th>
                  <th className="py-2 text-right font-medium text-gray-700">건수</th>
                  <th className="py-2 text-right font-medium text-gray-700">평균 단가</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.branchId} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{b.branchName}</td>
                    <td className="py-2 text-right text-gray-900">{b.totalSales.toLocaleString('ko-KR')}원</td>
                    <td className="py-2 text-right text-gray-900">{b.totalCount}건</td>
                    <td className="py-2 text-right text-gray-900">
                      {b.totalCount > 0
                        ? Math.round(b.totalSales / b.totalCount).toLocaleString('ko-KR')
                        : 0}
                      원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 일별 추이 (지점별) */}
          {data
            .filter((b) => b.daily.length > 0)
            .map((b) => {
              const maxDaily = Math.max(...b.daily.map((d) => d.total), 1)
              return (
                <div key={b.branchId} className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    {b.branchName} — 일별 매출
                  </h3>
                  <div className="space-y-1">
                    {b.daily.map((d) => (
                      <div key={d.date} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-gray-700 shrink-0">{d.date.slice(5)}</span>
                        <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded bg-blue-400"
                            style={{ width: `${(d.total / maxDaily) * 100}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-gray-900 shrink-0">
                          {d.total.toLocaleString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </>
      )}
    </div>
  )
}

function InventoryTab({ data }: { data: BranchInventorySummary[] }) {
  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-sm text-gray-700">재고 데이터가 없습니다.</p>
      ) : (
        data.map((b) => (
          <div key={b.branchId} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{b.branchName}</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700">총 {b.totalItems}개 품목</span>
                {b.lowStockCount > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
                    부족 {b.lowStockCount}개
                  </span>
                )}
              </div>
            </div>

            {b.items.length > 0 && (
              <div className="space-y-2">
                {b.items
                  .sort((a, c) => a.currentQty / Math.max(a.minQty, 0.1) - c.currentQty / Math.max(c.minQty, 0.1))
                  .slice(0, 10)
                  .map((item, i) => {
                    const ratio = item.minQty > 0 ? item.currentQty / item.minQty : 1
                    const barColor = ratio < 0.5 ? 'bg-red-500' : ratio < 1 ? 'bg-yellow-500' : 'bg-green-500'
                    const pct = Math.min(ratio * 100, 100)
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-gray-900 font-medium shrink-0 truncate">{item.name}</span>
                        <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded ${barColor}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-gray-900 shrink-0">
                          {item.currentQty} / {item.minQty} {item.unit}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function ComparisonTab({ data }: { data: HqReportData }) {
  const maxSales = Math.max(...data.branches.map((b) => b.salesTotal), 1)
  const maxPayroll = Math.max(...data.branches.map((b) => b.payrollTotal), 1)

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">총 매출</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {data.grandSalesTotal.toLocaleString('ko-KR')}원
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">총 인건비</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {data.grandPayrollTotal.toLocaleString('ko-KR')}원
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">인건비 비율</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {data.grandSalesTotal > 0
              ? Math.round((data.grandPayrollTotal / data.grandSalesTotal) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* 매출 비교 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">지점별 매출 비교</h3>
        <div className="space-y-3">
          {data.branches.map((b) => (
            <div key={b.branchId} className="flex items-center gap-3">
              <span className="w-20 text-sm font-medium text-gray-900 shrink-0">{b.branchName}</span>
              <div className="flex-1 h-8 rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded bg-blue-500"
                  style={{ width: `${Math.max((b.salesTotal / maxSales) * 100, 1)}%` }}
                />
              </div>
              <span className="w-28 text-right text-sm text-gray-900 shrink-0">
                {b.salesTotal.toLocaleString('ko-KR')}원
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 인건비 비교 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">지점별 인건비 비율</h3>
        <div className="space-y-3">
          {data.branches.map((b) => {
            const ratioColor = b.payrollRatio > 40 ? 'bg-red-500' : b.payrollRatio > 30 ? 'bg-yellow-500' : 'bg-green-500'
            return (
              <div key={b.branchId} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-gray-900 shrink-0">{b.branchName}</span>
                <div className="flex-1 h-8 rounded bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded ${ratioColor}`}
                    style={{ width: `${Math.min(b.payrollRatio, 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-900 shrink-0">
                  {b.payrollRatio}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 재고 부족 비교 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">지점별 재고 부족 품목</h3>
        <div className="space-y-3">
          {data.branches.map((b) => (
            <div key={b.branchId} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{b.branchName}</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  b.lowStockCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {b.lowStockCount > 0 ? `${b.lowStockCount}개 부족` : '정상'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
