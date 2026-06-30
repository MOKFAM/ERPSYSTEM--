import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import HqClient from './hq-client'

export default async function HqDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">본사 대시보드</h2>
      <HqClient />
    </div>
  )
}
