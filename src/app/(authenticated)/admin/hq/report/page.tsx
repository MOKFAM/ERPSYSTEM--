import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportClient from './report-client'

export default async function HqReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">요약 리포트</h2>
      <ReportClient />
    </div>
  )
}
