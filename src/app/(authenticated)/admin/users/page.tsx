import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsers } from '@/actions/users'
import { getBranches } from '@/actions/branches'
import UsersClient from './users-client'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const [users, branches] = await Promise.all([getUsers(), getBranches()])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">직원 관리</h2>
      <UsersClient users={users} branches={branches} />
    </div>
  )
}
