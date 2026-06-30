import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LeavesClient from './leaves-client'

export default async function LeavesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">내 휴가</h2>
      <LeavesClient />
    </div>
  )
}
