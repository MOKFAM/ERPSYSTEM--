import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminPayrollClient from './admin-payroll-client'

export default async function AdminPayrollPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">급여 관리</h2>
      <AdminPayrollClient />
    </div>
  )
}
