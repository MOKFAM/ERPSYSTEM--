'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toNotification } from '@/lib/types'
import type { Notification } from '@/lib/types'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return session
}

// 내 알림 목록
export async function getMyNotifications(limit = 30): Promise<Notification[]> {
  const session = await requireAuth()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map(toNotification)
}

// 안 읽은 알림 개수
export async function getUnreadCount(): Promise<number> {
  const session = await requireAuth()

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

// 단일 알림 읽음 처리
export async function markAsRead(id: string): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/notifications')
}

// 전체 읽음 처리
export async function markAllAsRead(): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
  revalidatePath('/notifications')
}

// 알림 삭제
export async function deleteNotification(id: string): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/notifications')
}
