'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getInterviews, createInterview, updateInterview, deleteInterview,
} from '@/actions/interviews'
import type { Interview, InterviewCategory } from '@/lib/types'
import { INTERVIEW_CATEGORY_LABELS } from '@/lib/types'
import { downloadCsv } from '@/lib/csv'

const categoryColors: Record<string, string> = {
  interview: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  reprimand: 'bg-red-100 text-red-800',
  reward: 'bg-green-100 text-green-800',
}

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  employees: { id: string; name: string }[]
}

export default function InterviewsClient({ employees }: Props) {
  const [records, setRecords] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Interview | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const load = () => {
    setLoading(true)
    getInterviews(userFilter || undefined)
      .then(setRecords)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userFilter])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (editing) await updateInterview(editing.id, formData)
        else await createInterview(formData)
        setShowForm(false)
        setEditing(null)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    startTransition(async () => {
      try {
        await deleteInterview(id)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      }
    })
  }

  const openCreate = () => { setEditing(null); setShowForm(true); setError('') }
  const openEdit = (r: Interview) => { setEditing(r); setShowForm(true); setError('') }

  const filtered = records.filter((r) => !categoryFilter || r.category === categoryFilter)

  const handleExport = () => {
    downloadCsv(
      `면담인사기록_${today()}`,
      ['대상직원', '구분', '제목', '내용', '면담일', '작성자'],
      filtered.map((r) => [
        r.userName ?? '',
        INTERVIEW_CATEGORY_LABELS[r.category],
        r.title,
        r.content ?? '',
        r.interviewDate,
        r.interviewerName ?? '',
      ])
    )
  }

  return (
    <div className="space-y-4">
      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          <option value="">전체 직원</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          <option value="">전체 구분</option>
          {(Object.entries(INTERVIEW_CATEGORY_LABELS) as [InterviewCategory, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="text-sm text-gray-700">{filtered.length}건</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            CSV 내보내기
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            기록 추가
          </button>
        </div>
      </div>

      {/* 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">대상 직원</label>
              <select
                name="userId"
                required
                defaultValue={editing?.userId ?? ''}
                disabled={!!editing}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
              >
                <option value="" disabled>선택</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">구분</label>
              <select name="category" defaultValue={editing?.category ?? 'interview'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {(Object.entries(INTERVIEW_CATEGORY_LABELS) as [InterviewCategory, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">제목</label>
              <input name="title" required defaultValue={editing?.title ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">면담일</label>
              <input name="interviewDate" type="date" defaultValue={editing?.interviewDate ?? today()} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">내용</label>
              <textarea name="content" rows={4} defaultValue={editing?.content ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {editing ? '수정' : '추가'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900">취소</button>
          </div>
        </form>
      )}

      {!showForm && error && <p className="text-sm text-red-700">{error}</p>}

      {/* 목록 */}
      {loading ? (
        <p className="text-sm text-gray-700">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['대상', '구분', '제목', '내용', '면담일', '작성자', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{r.userName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[r.category]}`}>
                      {INTERVIEW_CATEGORY_LABELS[r.category]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">{r.content || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{r.interviewDate}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{r.interviewerName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(r)} className="text-blue-700 hover:text-blue-800 text-xs font-medium">수정</button>
                      <button onClick={() => handleDelete(r.id)} disabled={isPending} className="text-red-700 hover:text-red-800 text-xs font-medium">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-700">기록이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
