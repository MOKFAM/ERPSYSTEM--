'use client'

import { useState, useEffect, useTransition } from 'react'
import { getPayrollList, calculatePayroll, confirmPayroll, confirmAllPayroll } from '@/actions/payroll'
import type { Payroll } from '@/lib/types'
import { PAYROLL_STATUS_LABELS } from '@/lib/types'
import { downloadCsv } from '@/lib/csv'

function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
}

export default function AdminPayrollClient() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    getPayrollList(yearMonth)
      .then(setPayrolls)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [yearMonth])

  const handleCalculate = () => {
    setMessage('')
    startTransition(async () => {
      const result = await calculatePayroll(yearMonth)
      setMessage(`산정 완료: 신규 ${result.created}건, 갱신 ${result.updated}건`)
      load()
    })
  }

  const handleConfirm = (id: string) => {
    if (!confirm('이 급여를 확정하시겠습니까?')) return
    startTransition(async () => {
      await confirmPayroll(id)
      load()
    })
  }

  const handleConfirmAll = () => {
    if (!confirm(`${yearMonth} 전체 급여를 확정하시겠습니까?`)) return
    startTransition(async () => {
      await confirmAllPayroll(yearMonth)
      load()
    })
  }

  const handleExport = () => {
    downloadCsv(
      `급여_${yearMonth}`,
      ['직원', '고용형태', '근무일수', '근무시간', '기본급', '초과수당', '야간수당', '공휴일수당', '주휴수당', '공제', '총지급액', '상태'],
      payrolls.map((p) => [
        p.userName || '',
        p.employmentType === 'full_time' ? '정직원' : '아르바이트',
        p.workedDays,
        p.workedHours,
        p.basePay,
        p.overtimePay,
        p.nightPay,
        p.holidayPay,
        p.weeklyHolidayPay,
        p.deductions,
        p.totalPay,
        PAYROLL_STATUS_LABELS[p.status],
      ])
    )
  }

  const totalPay = payrolls.reduce((sum, p) => sum + p.totalPay, 0)
  const draftCount = payrolls.filter((p) => p.status === 'draft').length

  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <button
          onClick={handleCalculate}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '처리 중...' : '급여 산정'}
        </button>
        {draftCount > 0 && (
          <button
            onClick={handleConfirmAll}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            전체 확정 ({draftCount}건)
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={payrolls.length === 0}
          className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
      </div>

      {message && <p className="text-sm font-medium text-blue-700">{message}</p>}

      {/* 요약 카드 */}
      {!loading && payrolls.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">대상 인원</p>
            <p className="text-2xl font-bold text-gray-900">{payrolls.length}명</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">총 지급액</p>
            <p className="text-2xl font-bold text-gray-900">{formatWon(totalPay)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">산정중</p>
            <p className="text-2xl font-bold text-yellow-800">{draftCount}건</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">확정</p>
            <p className="text-2xl font-bold text-green-800">{payrolls.length - draftCount}건</p>
          </div>
        </div>
      )}

      {/* 급여 목록 테이블 */}
      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['직원', '고용형태', '근무일수', '근무시간', '기본급', '초과수당', '야간수당', '공휴일수당', '주휴수당', '총 지급액', '상태', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrolls.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{p.userName || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">
                    {p.employmentType === 'full_time' ? '정직원' : '아르바이트'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.workedDays}일</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.workedHours}h</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{formatWon(p.basePay)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.overtimePay > 0 ? formatWon(p.overtimePay) : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.nightPay > 0 ? formatWon(p.nightPay) : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.holidayPay > 0 ? formatWon(p.holidayPay) : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">{p.weeklyHolidayPay > 0 ? formatWon(p.weeklyHolidayPay) : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-gray-900">{formatWon(p.totalPay)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                      {PAYROLL_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {p.status === 'draft' && (
                      <button
                        onClick={() => handleConfirm(p.id)}
                        disabled={isPending}
                        className="text-green-700 hover:text-green-800 text-xs font-medium"
                      >
                        확정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-700">
                    해당 월의 급여 내역이 없습니다. &quot;급여 산정&quot; 버튼을 눌러 생성하세요.
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
