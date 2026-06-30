import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MenuClient from './menu-client'

export default async function AdminMenuPage() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">메뉴 관리</h2>
      <MenuClient />
    </div>
  )
}
