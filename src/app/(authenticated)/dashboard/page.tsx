import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/types'
import ClockButton from '@/components/clock-button'
import Link from 'next/link'

const roleLabels: Record<Role, string> = {
  admin: '관리자',
  manager: '중간관리자',
  user: '사용자',
}

const quickMenus = [
  { label: '매출 등록', href: '/sales', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-blue-50 text-blue-600' },
  { label: '재고 관리', href: '/admin/inventory', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z', color: 'bg-emerald-50 text-emerald-600', roles: ['admin', 'manager'] },
  { label: '스케줄 관리', href: '/admin/schedules', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5', color: 'bg-purple-50 text-purple-600', roles: ['admin', 'manager'] },
  { label: '직원 관리', href: '/admin/users', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color: 'bg-amber-50 text-amber-600', roles: ['admin'] },
  { label: '발주/구매', href: '/purchase-orders', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z', color: 'bg-rose-50 text-rose-600' },
  { label: '매출 현황', href: '/admin/sales', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', color: 'bg-indigo-50 text-indigo-600', roles: ['admin', 'manager'] },
] as const

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role as Role

  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white shadow-lg">
        <h2 className="text-xl font-bold">안녕하세요, {session.user.name}님</h2>
        <p className="mt-1 text-sm text-slate-300">{roleLabels[role]} · {session.user.email}</p>
      </div>

      {/* 출퇴근 */}
      <ClockButton />

      {/* 빠른 메뉴 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">빠른 메뉴</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickMenus
            .filter((m) => !('roles' in m) || (m.roles as readonly string[] | undefined)?.includes(role))
            .map((menu) => (
              <Link
                key={menu.href}
                href={menu.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${menu.color}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={menu.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">{menu.label}</span>
              </Link>
            ))}
        </div>
      </div>

      {/* 정보 카드 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard title="내 정보" value={session.user.name ?? ''} sub="현재 로그인" color="border-l-blue-500" />
        <DashboardCard title="권한" value={roleLabels[role]} sub="시스템 역할" color="border-l-emerald-500" />
        <DashboardCard title="이메일" value={session.user.email ?? ''} sub="계정 이메일" color="border-l-purple-500" />
      </div>
    </div>
  )
}

function DashboardCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className={`rounded-xl border border-gray-100 border-l-4 ${color} bg-white p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">{title}</p>
      <p className="mt-2 truncate text-lg font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-700">{sub}</p>
    </div>
  )
}
