'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAllDocuments, getExpiringHealthCerts, deleteDocument } from '@/actions/documents'
import type { Document } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'

export default function DocumentsClient() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [expiring, setExpiring] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const load = () => {
    setLoading(true)
    Promise.all([getAllDocuments(), getExpiringHealthCerts(30)])
      .then(([docs, exp]) => { setDocuments(docs); setExpiring(exp) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (id: string) => {
    if (!confirm('이 서류를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteDocument(id)
      load()
    })
  }

  // 직원별 서류 제출 현황 집계
  const userDocMap = new Map<string, { name: string; types: Set<string> }>()
  for (const doc of documents) {
    const key = doc.userId
    if (!userDocMap.has(key)) {
      userDocMap.set(key, { name: doc.userName || '-', types: new Set() })
    }
    userDocMap.get(key)!.types.add(doc.type)
  }

  const allTypes = ['health_cert', 'resident_copy', 'bank_account', 'parental_consent'] as const

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-6">
      {/* 보건증 만기 임박 알림 */}
      {expiring.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-red-900">보건증 만기 임박 (30일 이내)</h3>
          <ul className="space-y-1">
            {expiring.map((doc) => {
              const daysLeft = Math.ceil(
                (new Date(doc.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )
              return (
                <li key={doc.id} className="text-sm text-red-800">
                  <span className="font-medium">{doc.userName}</span> —{' '}
                  {doc.expiryDate} ({daysLeft < 0 ? `${Math.abs(daysLeft)}일 경과` : `${daysLeft}일 남음`})
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 직원별 제출 현황 표 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">직원별 제출 현황</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">직원</th>
                {allTypes.map((t) => (
                  <th key={t} className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-700">
                    {DOCUMENT_TYPE_LABELS[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from(userDocMap.entries()).map(([userId, { name, types }]) => (
                <tr key={userId}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                  {allTypes.map((t) => (
                    <td key={t} className="whitespace-nowrap px-4 py-3 text-center text-sm">
                      {types.has(t) ? (
                        <span className="text-green-700 font-medium">제출</span>
                      ) : (
                        <span className="text-red-700 font-medium">미제출</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {userDocMap.size === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-700">
                    등록된 서류가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 전체 서류 목록 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">전체 서류 목록</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['직원', '서류 종류', '파일명', '만기일', '업로드일', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{doc.userName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{DOCUMENT_TYPE_LABELS[doc.type]}</td>
                  <td className="px-4 py-3 text-sm text-blue-700 max-w-xs truncate">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {doc.fileName}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{doc.expiryDate || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isPending}
                      className="text-red-700 hover:text-red-800 text-xs font-medium"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">
                    등록된 서류가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
