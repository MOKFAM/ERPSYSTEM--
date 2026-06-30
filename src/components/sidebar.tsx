'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/dashboard', roles: ['admin', 'manager', 'user'] },
  { label: '내 근태', href: '/attendance', roles: ['admin', 'manager', 'user'] },
  { label: '내 스케줄', href: '/schedules', roles: ['admin', 'manager', 'user'] },
  { label: '내 휴가', href: '/leaves', roles: ['admin', 'manager', 'user'] },
  { label: '휴가 캘린더', href: '/leaves/calendar', roles: ['admin', 'manager', 'user'] },
  { label: '매출 등록', href: '/sales', roles: ['admin', 'manager', 'user'] },
  { label: '내 급여', href: '/payroll', roles: ['admin', 'manager', 'user'] },
  { label: '발주/구매 신청', href: '/purchase-orders', roles: ['admin', 'manager', 'user'] },
  { label: '근태 관리', href: '/admin/attendance', roles: ['admin', 'manager'] },
  { label: '스케줄 관리', href: '/admin/schedules', roles: ['admin', 'manager'] },
  { label: '휴가 관리', href: '/admin/leaves', roles: ['admin', 'manager'] },
  { label: '매출 현황', href: '/admin/sales', roles: ['admin', 'manager'] },
  { label: '재고 관리', href: '/admin/inventory', roles: ['admin', 'manager'] },
  { label: '발주 결재', href: '/admin/purchase-orders', roles: ['admin', 'manager'] },
  { label: '메뉴 관리', href: '/admin/menu', roles: ['admin', 'manager'] },
  { label: '급여 관리', href: '/admin/payroll', roles: ['admin', 'manager'] },
  { label: '서류 관리', href: '/admin/documents', roles: ['admin', 'manager'] },
  { label: '직원 관리', href: '/admin/users', roles: ['admin'] },
  { label: '지점 관리', href: '/admin/branches', roles: ['admin'] },
  { label: '본사 대시보드', href: '/admin/hq', roles: ['admin'] },
  { label: '요약 리포트', href: '/admin/hq/report', roles: ['admin'] },
  { label: '면담/인사 기록', href: '/admin/interviews', roles: ['admin'] },
  { label: '감사 로그', href: '/admin/audit', roles: ['admin'] },
]

export default function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()
  const filteredItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-lg font-bold text-gray-900">이문면옥 ERP</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
