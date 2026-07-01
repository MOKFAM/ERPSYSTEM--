'use client'

import { useState, useEffect, Fragment } from 'react'
import { getAuditLogs } from '@/actions/audit'
import type { AuditLog } from '@/lib/types'
import { AUDIT_ENTITY_LABELS, AUDIT_ACTION_LABELS } from '@/lib/types'

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-green-100 text-green-800',
  reject: 'bg-red-100 text-red-800',
  confirm: 'bg-purple-100 text-purple-800',
}

const entityOptions = [
  { value: '', label: '전체 대상' },
  { value: 'user', label: '직원' },
  { value: 'payroll', label: '급여' },
  { value: 'purchase_order', label: '발주' },
  { value: 'branch', label: '지점' },
  { value: 'interview', label: '면담/인사' },
]

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getAuditLogs({ entityType: entityType || undefined })
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [entityType])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          {entityOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-700">{logs.length}건</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['일시', '처리자', '대상', '작업', '내용', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {new Date(log.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{log.actorName || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {AUDIT_ENTITY_LABELS[log.entityType] ?? log.entityType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] ?? 'bg-gray-100 text-gray-800'}`}>
                        {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{log.summary || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {(log.beforeData || log.afterData) && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-blue-700 hover:text-blue-800 text-xs font-medium"
                        >
                          {expandedId === log.id ? '닫기' : '상세'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-4 py-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-semibold text-gray-700">변경 전</p>
                            <pre className="overflow-x-auto rounded bg-white p-3 text-xs text-gray-800 border border-gray-200">
                              {log.beforeData ? JSON.stringify(log.beforeData, null, 2) : '-'}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-gray-700">변경 후</p>
                            <pre className="overflow-x-auto rounded bg-white p-3 text-xs text-gray-800 border border-gray-200">
                              {log.afterData ? JSON.stringify(log.afterData, null, 2) : '-'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">감사 로그가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
