'use client'

import { useState } from 'react'
import { createBranch, updateBranch, deleteBranch } from '@/actions/branches'
import type { Branch } from '@/lib/types'

interface Props {
  branches: Branch[]
}

export default function BranchesClient({ branches }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, formData)
      } else {
        await createBranch(formData)
      }
      setShowForm(false)
      setEditingBranch(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 지점을 삭제하시겠습니까?`)) return
    try {
      await deleteBranch(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">총 {branches.length}개 지점</p>
        <button
          onClick={() => { setEditingBranch(null); setShowForm(true); setError('') }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          지점 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {editingBranch ? '지점 수정' : '지점 추가'}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">지점명</label>
              <input
                name="name"
                required
                defaultValue={editingBranch?.name}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">지점 코드</label>
              <input
                name="code"
                placeholder="예: ILSAN"
                defaultValue={editingBranch?.code ?? ''}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">연락처</label>
              <input
                name="phone"
                defaultValue={editingBranch?.phone ?? ''}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">주소</label>
              <input
                name="address"
                defaultValue={editingBranch?.address ?? ''}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {editingBranch ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingBranch(null) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['지점명', '코드', '주소', '연락처', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{branch.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{branch.code ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{branch.address ?? '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{branch.phone ?? '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBranch(branch); setShowForm(true); setError('') }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id, branch.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-700">
                  등록된 지점이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
