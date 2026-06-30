'use client'

import { signOut } from 'next-auth/react'
import NotificationBell from './notification-bell'
import type { Role } from '@/lib/types'

const roleLabels: Record<Role, string> = {
  admin: '관리자',
  manager: '중간관리자',
  user: '사용자',
}

interface HeaderProps {
  userName: string
  role: Role
  onMenuToggle?: () => void
}

export default function Header({ userName, role, onMenuToggle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
        aria-label="메뉴"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {roleLabels[role]}
        </span>
        <span className="text-sm font-medium text-gray-900">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
