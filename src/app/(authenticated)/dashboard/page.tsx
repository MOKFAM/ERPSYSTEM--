import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/types'
import ClockButton from '@/components/clock-button'

const roleLabels: Record<Role, string> = {
  admin: '관리자',
  manager: '중간관리자',
  user: '사용자',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
        <p className="mt-1 text-sm text-gray-500">
          안녕하세요, {session.user.name}님. ({roleLabels[role]})
        </p>
      </div>

      <ClockButton />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="내 정보" value={session.user.name ?? ''} sub="현재 로그인" />
        <DashboardCard title="권한" value={roleLabels[role]} sub="시스템 역할" />
        <DashboardCard title="이메일" value={session.user.email ?? ''} sub="계정 이메일" />
      </div>

      {role === 'admin' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">관리자 메뉴</h3>
          <p className="mt-1 text-sm text-gray-500">
            좌측 사이드바에서 직원 관리, 지점 관리 메뉴를 이용하세요.
          </p>
        </div>
      )}
    </div>
  )
}

function DashboardCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  )
}
