import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NotificationsClient from './notifications-client'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">알림센터</h2>
      <NotificationsClient />
    </div>
  )
}
