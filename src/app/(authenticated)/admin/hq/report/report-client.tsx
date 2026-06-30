'use client'

import { useState, useEffect, useTransition } from 'react'
import { getHqReport } from '@/actions/hq'
import { downloadCsv } from '@/lib/csv'
import type { HqReportData } from '@/lib/types'

function getDefaultYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ReportClient() {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly')
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth)
  const [data, setData] = useState<HqReportData | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getHqReport(reportType, `${yearMonth}-01`)
      setData(result)
    })
  }, [reportType, yearMonth])

  function handleExportCsv() {
    if (!data) return
    const headers = ['지점', '매출', '건수', '인건비', '인건비 비율(%)', '재고 부족']
    const rows = data.branches.map((b) => [
      b.branchName,
      b.salesTotal,
      b.salesCount,
      b.payrollTotal,
      b.payrollRatio,
      b.lowStockCount,
    ])
    rows.push(['합계', data.grandSalesTotal, '', data.grandPayrollTotal, data.grandSalesTotal > 0 ? Math.round((data.grandPayrollTotal / data.grandSalesTotal) * 100) : 0, ''])
    downloadCsv(`리포트_${yearMonth}.csv`, headers, rows)
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => setReportType('monthly')}
            className={`rounded-l-lg px-4 py-2 text-sm font-medium ${
              reportType === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            월간
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`rounded-r-lg px-4 py-2 text-sm font-medium ${
              reportType === 'weekly' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            주간
          </button>
        </div>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleExportCsv}
          disabled={!data}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
      </div>

      {isPending && <p className="text-sm text-gray-700">불러오는 중...</p>}

      {data && !isPending && (
        <>
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

          {/* 지점별 상세 테이블 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {reportType === 'monthly' ? '월간' : '주간'} 요약 — {yearMonth}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium text-gray-700">지점</th>
                    <th className="py-2 text-right font-medium text-gray-700">매출</th>
                    <th className="py-2 text-right font-medium text-gray-700">건수</th>
                    <th className="py-2 text-right font-medium text-gray-700">인건비</th>
                    <th className="py-2 text-right font-medium text-gray-700">인건비 비율</th>
                    <th className="py-2 text-right font-medium text-gray-700">재고 부족</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.map((b) => (
                    <tr key={b.branchId} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-900">{b.branchName}</td>
                      <td className="py-2 text-right text-gray-900">
                        {b.salesTotal.toLocaleString('ko-KR')}원
                      </td>
                      <td className="py-2 text-right text-gray-900">{b.salesCount}건</td>
                      <td className="py-2 text-right text-gray-900">
                        {b.payrollTotal.toLocaleString('ko-KR')}원
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.payrollRatio > 40
                              ? 'bg-red-100 text-red-700'
                              : b.payrollRatio > 30
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {b.payrollRatio}%
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {b.lowStockCount > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {b.lowStockCount}개
                          </span>
                        ) : (
                          <span className="text-gray-700">정상</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-2 text-gray-900">합계</td>
                    <td className="py-2 text-right text-gray-900">
                      {data.grandSalesTotal.toLocaleString('ko-KR')}원
                    </td>
                    <td className="py-2 text-right text-gray-900">
                      {data.branches.reduce((s, b) => s + b.salesCount, 0)}건
                    </td>
                    <td className="py-2 text-right text-gray-900">
                      {data.grandPayrollTotal.toLocaleString('ko-KR')}원
                    </td>
                    <td className="py-2 text-right">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-900">
                        {data.grandSalesTotal > 0
                          ? Math.round((data.grandPayrollTotal / data.grandSalesTotal) * 100)
                          : 0}
                        %
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 매출 시각화 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">매출 시각화</h3>
            <div className="space-y-3">
              {data.branches.map((b) => {
                const maxS = Math.max(...data.branches.map((x) => x.salesTotal), 1)
                return (
                  <div key={b.branchId} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-gray-900 shrink-0">{b.branchName}</span>
                    <div className="flex-1 h-8 rounded bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded bg-blue-500"
                        style={{ width: `${Math.max((b.salesTotal / maxS) * 100, 1)}%` }}
                      />
                    </div>
                    <span className="w-28 text-right text-sm text-gray-900 shrink-0">
                      {b.salesTotal.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 인건비 비율 시각화 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">인건비 비율 시각화</h3>
            <div className="space-y-3">
              {data.branches.map((b) => {
                const color =
                  b.payrollRatio > 40 ? 'bg-red-500' : b.payrollRatio > 30 ? 'bg-yellow-500' : 'bg-green-500'
                return (
                  <div key={b.branchId} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-gray-900 shrink-0">{b.branchName}</span>
                    <div className="flex-1 h-8 rounded bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded ${color}`}
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
        </>
      )}
    </div>
  )
}
