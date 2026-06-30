'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  getMyNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '@/actions/notifications'
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

export default function NotificationsClient() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const load = () => {
    setLoading(true)
    getMyNotifications(100).then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id)
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isRead: true } : it)))
    })
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead()
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })))
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteNotification(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
    })
  }

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  const unread = items.filter((it) => !it.isRead).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">안 읽은 알림 {unread}건</p>
        <button
          onClick={handleMarkAll}
          disabled={isPending || unread === 0}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
        >
          모두 읽음
        </button>
      </div>

      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              n.isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50/50'
            }`}
          >
            <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[n.type]}`}>
              {NOTIFICATION_TYPE_LABELS[n.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>}
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                <span>{new Date(n.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                {n.link && (
                  <Link href={n.link} onClick={() => handleRead(n.id)} className="text-blue-700 hover:text-blue-800">
                    바로가기
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!n.isRead && (
                <button onClick={() => handleRead(n.id)} disabled={isPending} className="text-xs text-blue-700 hover:text-blue-800">읽음</button>
              )}
              <button onClick={() => handleDelete(n.id)} disabled={isPending} className="text-xs text-gray-400 hover:text-red-700">삭제</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-700">
            알림이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
