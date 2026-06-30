import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AttendanceClient from './attendance-client'

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">내 근태</h2>
      <AttendanceClient />
    </div>
  )
}
