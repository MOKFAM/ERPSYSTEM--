'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Role } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  roles: Role[]
}

interface NavGroup {
  title: string
  roles: Role[]
  items: NavItem[]
  defaultOpen?: boolean
}

const navGroups: NavGroup[] = [
  {
    title: '내 업무',
    roles: ['admin', 'manager', 'user'],
    defaultOpen: true,
    items: [
      { label: '대시보드', href: '/dashboard', roles: ['admin', 'manager', 'user'] },
      { label: '내 근태', href: '/attendance', roles: ['admin', 'manager', 'user'] },
      { label: '내 스케줄', href: '/schedules', roles: ['admin', 'manager', 'user'] },
      { label: '내 휴가', href: '/leaves', roles: ['admin', 'manager', 'user'] },
      { label: '휴가 캘린더', href: '/leaves/calendar', roles: ['admin', 'manager', 'user'] },
      { label: '내 급여', href: '/payroll', roles: ['admin', 'manager', 'user'] },
      { label: '매출 등록', href: '/sales', roles: ['admin', 'manager', 'user'] },
      { label: '발주/구매 신청', href: '/purchase-orders', roles: ['admin', 'manager', 'user'] },
    ],
  },
  {
    title: '매장 관리',
    roles: ['admin', 'manager'],
    defaultOpen: false,
    items: [
      { label: '근태 관리', href: '/admin/attendance', roles: ['admin', 'manager'] },
      { label: '스케줄 관리', href: '/admin/schedules', roles: ['admin', 'manager'] },
      { label: '휴가 관리', href: '/admin/leaves', roles: ['admin', 'manager'] },
      { label: '매출 현황', href: '/admin/sales', roles: ['admin', 'manager'] },
      { label: '재고 관리', href: '/admin/inventory', roles: ['admin', 'manager'] },
      { label: '발주 결재', href: '/admin/purchase-orders', roles: ['admin', 'manager'] },
      { label: '메뉴 관리', href: '/admin/menu', roles: ['admin', 'manager'] },
      { label: '급여 관리', href: '/admin/payroll', roles: ['admin', 'manager'] },
      { label: '서류 관리', href: '/admin/documents', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: '시스템 관리',
    roles: ['admin'],
    defaultOpen: false,
    items: [
      { label: '직원 관리', href: '/admin/users', roles: ['admin'] },
      { label: '지점 관리', href: '/admin/branches', roles: ['admin'] },
      { label: '면담/인사 기록', href: '/admin/interviews', roles: ['admin'] },
      { label: '감사 로그', href: '/admin/audit', roles: ['admin'] },
    ],
  },
  {
    title: '본사',
    roles: ['admin'],
    defaultOpen: false,
    items: [
      { label: '본사 대시보드', href: '/admin/hq', roles: ['admin'] },
      { label: '요약 리포트', href: '/admin/hq/report', roles: ['admin'] },
    ],
  },
]

export default function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()

  const initialOpen: Record<string, boolean> = {}
  navGroups.forEach((group) => {
    const hasActive = group.items.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
    initialOpen[group.title] = hasActive || !!group.defaultOpen
  })

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)

  function toggleGroup(title: string) {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-5">
        <h1 className="text-lg font-bold text-gray-900">이문면옥 ERP</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group) => {
          if (!group.roles.includes(role)) return null
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          const isOpen = openGroups[group.title] ?? false

          return (
            <div key={group.title} className="mb-2">
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
              >
                <span>{group.title}</span>
                <svg
                  className={`h-4 w-4 text-gray-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 하위 메뉴 */}
              {isOpen && (
                <div className="bg-gray-50 py-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`block px-5 py-2 pl-8 text-sm font-medium transition-colors ${
                          isActive
                            ? 'border-l-3 border-blue-600 bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
