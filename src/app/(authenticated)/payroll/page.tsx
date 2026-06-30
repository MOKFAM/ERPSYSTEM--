import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PayrollClient from './payroll-client'

export default async function PayrollPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">내 급여</h2>
      <PayrollClient />
    </div>
  )
}
