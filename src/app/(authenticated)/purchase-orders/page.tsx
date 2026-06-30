import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PurchaseOrdersClient from './purchase-orders-client'

export default async function PurchaseOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">발주 / 구매 신청</h2>
      <PurchaseOrdersClient />
    </div>
  )
}
