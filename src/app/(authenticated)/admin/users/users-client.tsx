'use client'

import { useState } from 'react'
import { createUser, updateUser, deleteUser } from '@/actions/users'
import type { User, Branch, Role, EmploymentType, PositionType } from '@/lib/types'

const roleLabels: Record<Role, string> = {
  admin: '관리자',
  manager: '중간관리자',
  user: '사용자',
}

const employmentLabels: Record<EmploymentType, string> = {
  full_time: '정직원',
  part_time: '아르바이트',
}

const positionLabels: Record<PositionType, string> = {
  hall: '홀',
  kitchen: '주방',
  both: '홀+주방',
}

// 직급 정렬 우선순위 (낮을수록 위)
const jobTitleOrder: Record<string, number> = {
  '점장': 0,
  '본사소속': 1,
  '실장': 2,
  '부장': 3,
  '사원': 4,
  'PT': 5,
}

function getJobTitleRank(title?: string | null): number {
  if (!title) return 99
  return jobTitleOrder[title] ?? 90
}

function sortUsers(list: User[]): User[] {
  return [...list].sort((a, b) => getJobTitleRank(a.jobTitle) - getJobTitleRank(b.jobTitle))
}

interface Props {
  users: User[]
  branches: Branch[]
}

export default function UsersClient({ users, branches }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const q = query.trim().toLowerCase()
  const filteredUsers = users.filter((u) => {
    const matchQuery = !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.jobTitle ?? '').toLowerCase().includes(q)
    const matchType = !typeFilter || u.employmentType === typeFilter
    return matchQuery && matchType
  })

  const fullTimeUsers = sortUsers(filteredUsers.filter(u => u.employmentType === 'full_time'))
  const partTimeUsers = sortUsers(filteredUsers.filter(u => u.employmentType === 'part_time'))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData)
      } else {
        await createUser(formData)
      }
      setShowForm(false)
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 직원을 비활성화하시겠습니까?`)) return
    try {
      await deleteUser(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setShowForm(true)
    setError('')
  }

  function openCreate() {
    setEditingUser(null)
    setShowForm(true)
    setError('')
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름/이메일/직책 검색"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          <option value="">전체</option>
          <option value="full_time">정직원</option>
          <option value="part_time">PT (아르바이트)</option>
        </select>
        <p className="text-sm text-gray-700">{filteredUsers.length}명</p>
        <button
          onClick={openCreate}
          className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          직원 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {editingUser ? '직원 수정' : '직원 추가'}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="이름" name="name" required defaultValue={editingUser?.name} />
            <Input label="이메일" name="email" type="email" required defaultValue={editingUser?.email} />
            <Input
              label={editingUser ? '비밀번호 (변경 시에만)' : '비밀번호'}
              name="password"
              type="password"
              required={!editingUser}
            />
            <Input label="연락처" name="phone" defaultValue={editingUser?.phone ?? ''} />

            <Select label="역할" name="role" defaultValue={editingUser?.role ?? 'user'}>
              <option value="admin">관리자</option>
              <option value="manager">중간관리자</option>
              <option value="user">사용자</option>
            </Select>

            <Select label="고용형태" name="employmentType" defaultValue={editingUser?.employmentType ?? 'full_time'}>
              <option value="full_time">정직원</option>
              <option value="part_time">아르바이트</option>
            </Select>

            <Select label="포지션" name="positionType" defaultValue={editingUser?.positionType ?? 'both'}>
              <option value="hall">홀</option>
              <option value="kitchen">주방</option>
              <option value="both">홀+주방</option>
            </Select>

            <Input label="직책" name="jobTitle" defaultValue={editingUser?.jobTitle ?? ''} />

            <Select label="소속 지점" name="branchId" defaultValue={editingUser?.branchId ?? ''}>
              <option value="">선택 안함</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>

            <Input label="입사일" name="hireDate" type="date" defaultValue={editingUser?.hireDate ?? ''} />
            <Input label="시급 (원)" name="hourlyRate" type="number" defaultValue={editingUser?.hourlyRate ?? ''} />
            <Input label="월급 (원)" name="monthlySalary" type="number" defaultValue={editingUser?.monthlySalary ?? ''} />

            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {editingUser ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingUser(null) }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-700">
          {users.length === 0 ? '등록된 직원이 없습니다.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-6">
          {fullTimeUsers.length > 0 && (
            <UserGroup
              title={`정직원 (${fullTimeUsers.length}명)`}
              users={fullTimeUsers}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          {partTimeUsers.length > 0 && (
            <UserGroup
              title={`PT / 아르바이트 (${partTimeUsers.length}명)`}
              users={partTimeUsers}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  )
}

function UserGroup({
  title,
  users,
  onEdit,
  onDelete,
}: {
  title: string
  users: User[]
  onEdit: (u: User) => void
  onDelete: (id: string, name: string) => void
}) {
  const headers = ['직급', '이름', '포지션', '입사일', '상태', '연락처', '']
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-slate-800 px-4 py-3 rounded-t-xl">
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className={!user.isActive ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {user.jobTitle ? (
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    user.jobTitle === '점장' ? 'bg-blue-100 text-blue-800' :
                    user.jobTitle === '본사소속' ? 'bg-purple-100 text-purple-800' :
                    user.jobTitle === '실장' ? 'bg-emerald-100 text-emerald-800' :
                    user.jobTitle === '부장' ? 'bg-amber-100 text-amber-800' :
                    user.jobTitle === 'PT' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.jobTitle}
                  </span>
                ) : '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {user.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{positionLabels[user.positionType]}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{user.hireDate ?? '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {user.isActive ? '재직' : '퇴직'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{user.phone ?? '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(user)}
                    title="수정"
                    className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {user.isActive && (
                    <button
                      onClick={() => onDelete(user.id, user.name)}
                      title="비활성화"
                      className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        {...props}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {children}
      </select>
    </div>
  )
}
