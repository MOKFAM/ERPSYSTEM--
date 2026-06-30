import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminPurchaseOrdersClient from './admin-purchase-orders-client'

export default async function AdminPurchaseOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">발주 / 구매 결재</h2>
      <AdminPurchaseOrdersClient />
    </div>
  )
}
