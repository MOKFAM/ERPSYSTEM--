'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/actions/notifications'
import type { Notification } from '@/lib/types'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/types'

const typeColors: Record<string, string> = {
  approval_request: 'bg-blue-100 text-blue-800',
  approval_approved: 'bg-green-100 text-green-800',
  approval_rejected: 'bg-red-100 text-red-800',
  leave_reviewed: 'bg-purple-100 text-purple-800',
  low_stock: 'bg-orange-100 text-orange-800',
  health_cert_expiry: 'bg-yellow-100 text-yellow-800',
  general: 'bg-gray-100 text-gray-800',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(() => {
    getUnreadCount().then(setCount).catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = setInterval(refreshCount, 60000)
    return () => clearInterval(timer)
  }, [refreshCount])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      getMyNotifications(10).then(setItems).catch(() => {})
    }
  }

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) {
      startTransition(async () => {
        await markAsRead(n.id)
        setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)))
        refreshCount()
      })
    }
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead()
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })))
      setCount(0)
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="알림"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-900">알림</span>
            <button onClick={handleMarkAll} className="text-xs text-blue-700 hover:text-blue-800">모두 읽음</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">알림이 없습니다.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <div className={`border-b border-gray-50 px-4 py-3 hover:bg-gray-50 ${n.isRead ? '' : 'bg-blue-50/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[n.type]}`}>
                        {NOTIFICATION_TYPE_LABELS[n.type]}
                      </span>
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      <span className="ml-auto text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{n.body}</p>}
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { handleItemClick(n); setOpen(false) }}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} onClick={() => handleItemClick(n)} className="cursor-pointer">
                    {content}
                  </div>
                )
              })
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            전체 보기
          </Link>
        </div>
      )}
    </div>
  )
}
