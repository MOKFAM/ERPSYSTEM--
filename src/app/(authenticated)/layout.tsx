import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import MobileLayout from '@/components/mobile-layout'
import type { Role } from '@/lib/types'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const role = session.user.role as Role

  return (
    <MobileLayout role={role} userName={session.user.name ?? ''}>
      {children}
    </MobileLayout>
  )
}
