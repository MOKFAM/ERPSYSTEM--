import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LeaveCalendarClient from './leave-calendar-client'

export default async function LeaveCalendarPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">휴가 캘린더</h2>
      <LeaveCalendarClient />
    </div>
  )
}
