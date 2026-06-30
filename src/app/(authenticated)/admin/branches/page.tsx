import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getBranches } from '@/actions/branches'
import BranchesClient from './branches-client'

export default async function BranchesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const branches = await getBranches()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">지점 관리</h2>
      <BranchesClient branches={branches} />
    </div>
  )
}
