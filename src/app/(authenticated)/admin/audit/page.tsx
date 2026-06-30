import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AuditClient from './audit-client'

export default async function AdminAuditPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">감사 로그</h2>
      <AuditClient />
    </div>
  )
}
