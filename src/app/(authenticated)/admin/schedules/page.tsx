import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsers } from '@/actions/users'
import AdminScheduleClient from './admin-schedule-client'

export default async function AdminSchedulesPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') {
    redirect('/dashboard')
  }

  const users = await getUsers()
  const activeUsers = users.filter((u) => u.isActive)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">스케줄 관리</h2>
      <AdminScheduleClient users={activeUsers} />
    </div>
  )
}
