import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSalesClient from './admin-sales-client'

export default async function AdminSalesPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">매출 현황</h2>
      <AdminSalesClient />
    </div>
  )
}
