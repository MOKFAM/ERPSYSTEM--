import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MyScheduleClient from './my-schedule-client'

export default async function MySchedulesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">내 스케줄</h2>
      <MyScheduleClient />
    </div>
  )
}
