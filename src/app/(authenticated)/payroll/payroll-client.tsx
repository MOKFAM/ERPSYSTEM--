'use client'

import { useState, useEffect } from 'react'
import { getMyPayroll, getMyPayrollHistory } from '@/actions/payroll'
import type { Payroll } from '@/lib/types'

function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

export default function PayrollClient() {
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [history, setHistory] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getMyPayroll(yearMonth), getMyPayrollHistory()])
      .then(([p, h]) => { setPayroll(p); setHistory(h) })
      .finally(() => setLoading(false))
  }, [yearMonth])

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-6">
      <input
        type="month"
        value={yearMonth}
        onChange={(e) => setYearMonth(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />

      {/* 급여 명세서 */}
      {payroll ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{yearMonth} 급여 명세서</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              payroll.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {payroll.status === 'confirmed' ? '확정' : '산정중'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-700">근무일수</p>
              <p className="text-lg font-bold text-gray-900">{payroll.workedDays}일</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">근무시간</p>
              <p className="text-lg font-bold text-gray-900">{payroll.workedHours}시간</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">기본급</p>
              <p className="text-lg font-bold text-gray-900">{formatWon(payroll.basePay)}</p>
            </div>
            {payroll.overtimePay > 0 && (
              <div>
                <p className="text-sm text-gray-700">초과근무수당</p>
                <p className="text-lg font-bold text-gray-900">{formatWon(payroll.overtimePay)}</p>
              </div>
            )}
            {payroll.nightPay > 0 && (
              <div>
                <p className="text-sm text-gray-700">야간수당</p>
                <p className="text-lg font-bold text-gray-900">{formatWon(payroll.nightPay)}</p>
              </div>
            )}
            {payroll.holidayPay > 0 && (
              <div>
                <p className="text-sm text-gray-700">공휴일수당</p>
                <p className="text-lg font-bold text-gray-900">{formatWon(payroll.holidayPay)}</p>
              </div>
            )}
            {payroll.weeklyHolidayPay > 0 && (
              <div>
                <p className="text-sm text-gray-700">주휴수당</p>
                <p className="text-lg font-bold text-gray-900">{formatWon(payroll.weeklyHolidayPay)}</p>
              </div>
            )}
            {payroll.deductions > 0 && (
              <div>
                <p className="text-sm text-gray-700">공제액</p>
                <p className="text-lg font-bold text-red-700">-{formatWon(payroll.deductions)}</p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">총 지급액</p>
              <p className="text-2xl font-bold text-blue-700">{formatWon(payroll.totalPay)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-700">해당 월의 급여 내역이 없습니다.</p>
        </div>
      )}

      {/* 급여 이력 */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">급여 이력</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['년월', '근무일', '근무시간', '기본급', '수당합계', '총 지급액'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setYearMonth(p.yearMonth)}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{p.yearMonth}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{p.workedDays}일</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{p.workedHours}h</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatWon(p.basePay)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatWon(p.overtimePay + p.nightPay + p.holidayPay + p.weeklyHolidayPay)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{formatWon(p.totalPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
