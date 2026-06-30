import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SalesClient from './sales-client'

export default async function SalesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">매출 등록</h2>
      <SalesClient />
    </div>
  )
}
