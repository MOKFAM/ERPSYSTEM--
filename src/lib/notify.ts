import { supabase } from './supabase'
import type { NotificationType } from './types'

interface NotificationPayload {
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}

// 지정한 사용자들에게 알림 생성 (best-effort: 실패해도 본 작업 흐름을 막지 않음)
export async function notifyUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
  const targets = Array.from(new Set(userIds.filter(Boolean)))
  if (targets.length === 0) return

  const rows = targets.map((userId) => ({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.error('[notify] insert failed:', error.message)
}

// 단일 사용자 알림
export async function notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
  await notifyUsers([userId], payload)
}

// 관리자/매니저 전체에게 알림 (결재 요청 도착 등)
export async function notifyManagers(payload: NotificationPayload): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)

  if (error) {
    console.error('[notify] manager lookup failed:', error.message)
    return
  }

  await notifyUsers((data ?? []).map((u) => u.id as string), payload)
}
