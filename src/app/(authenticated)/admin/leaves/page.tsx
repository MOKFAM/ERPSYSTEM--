import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLeavesClient from './admin-leaves-client'

export default async function AdminLeavesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">휴가 관리</h2>
      <AdminLeavesClient />
    </div>
  )
}
