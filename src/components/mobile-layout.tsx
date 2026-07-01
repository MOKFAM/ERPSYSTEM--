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
    <>
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바: 데스크톱 고정, 모바일 슬라이드 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={role} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* 메인 콘텐츠: 데스크톱에서 사이드바 너비만큼 왼쪽 여백 */}
      <div className="flex min-h-screen flex-col md:ml-56">
        <Header
          userName={userName}
          role={role}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-x-auto bg-gray-50 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </>
  )
}
