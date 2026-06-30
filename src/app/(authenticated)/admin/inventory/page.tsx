import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import InventoryClient from './inventory-client'

export default async function AdminInventoryPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">재고 관리</h2>
      <InventoryClient />
    </div>
  )
}
