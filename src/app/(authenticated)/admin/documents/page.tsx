import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { checkAndNotifyExpiringHealthCerts } from '@/actions/documents'
import DocumentsClient from './documents-client'

export default async function AdminDocumentsPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') redirect('/dashboard')

  // 페이지 진입 시 보건증 만기 임박 자동 알림 (best-effort)
  checkAndNotifyExpiringHealthCerts().catch(() => {})

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">서류 관리</h2>
      <DocumentsClient />
    </div>
  )
}
