import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsers } from '@/actions/users'
import InterviewsClient from './interviews-client'

export default async function AdminInterviewsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')

  const users = await getUsers()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">면담 / 인사 기록</h2>
      <p className="text-sm text-gray-700">마스터 관리자 전용. 모든 열람·생성·수정·삭제는 감사 로그에 기록됩니다.</p>
      <InterviewsClient employees={users.map((u) => ({ id: u.id, name: u.name }))} />
    </div>
  )
}
