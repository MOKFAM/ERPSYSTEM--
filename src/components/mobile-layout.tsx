'use client'

import { useState } from 'react'
import Sidebar from './sidebar'
import Header from './header'
import type { Role } from '@/lib/types'

interface Props {
  role: Role
  userName: string
  children: React.ReactNode
}

export default function MobileLayout({ role, userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바: 데스크톱에서 항상 표시, 모바일에서 토글 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={role} onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          role={role}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
