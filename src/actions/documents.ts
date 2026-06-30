'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toDocument } from '@/lib/types'
import type { Document } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { notifyUser } from '@/lib/notify'

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return session
}

async function requireManagerOrAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role === 'user') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

// 서류 업로드 (파일 URL은 클라이언트에서 Supabase Storage 업로드 후 전달)
export async function createDocument(formData: FormData): Promise<void> {
  const session = await requireAuth()

  const userId = (formData.get('userId') as string) || session.user.id

  // 일반 사용자는 본인 서류만 업로드 가능
  if (session.user.role === 'user' && userId !== session.user.id) {
    throw new Error('권한이 없습니다.')
  }

  const { error } = await supabase.from('documents').insert({
    user_id: userId,
    type: formData.get('type') as string,
    file_url: formData.get('fileUrl') as string,
    file_name: formData.get('fileName') as string,
    expiry_date: (formData.get('expiryDate') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

// 직원별 서류 조회
export async function getUserDocuments(userId: string): Promise<Document[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('documents')
    .select('*, users(name)')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toDocument)
}

// 전체 서류 현황 (관리자)
export async function getAllDocuments(): Promise<Document[]> {
  await requireManagerOrAdmin()

  const { data, error } = await supabase
    .from('documents')
    .select('*, users(name)')
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toDocument)
}

// 보건증 만기 임박 조회 (30일 이내)
export async function getExpiringHealthCerts(daysAhead: number = 30): Promise<Document[]> {
  await requireManagerOrAdmin()

  const today = new Date()
  const deadline = new Date(today)
  deadline.setDate(deadline.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('documents')
    .select('*, users(name)')
    .eq('type', 'health_cert')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', deadline.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toDocument)
}

// 보건증 만기 임박 자동 알림 (관리자 페이지 진입 시 호출)
// 30일 이내 만기인 보건증에 대해, 아직 알림이 없으면 해당 직원에게 알림 생성
export async function checkAndNotifyExpiringHealthCerts(): Promise<number> {
  await requireManagerOrAdmin()

  const expiring = await getExpiringHealthCerts(30)
  if (expiring.length === 0) return 0

  // 이미 발송된 알림 확인 (최근 7일 내 같은 사용자에게 보건증 만기 알림)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'health_cert_expiry')
    .gte('created_at', sevenDaysAgo.toISOString())

  const alreadyNotified = new Set((existingNotifs ?? []).map((n) => n.user_id as string))

  let sent = 0
  for (const doc of expiring) {
    if (alreadyNotified.has(doc.userId)) continue

    const daysLeft = Math.ceil(
      (new Date(doc.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    const label = daysLeft <= 0 ? '만기됨' : `${daysLeft}일 남음`

    await notifyUser(doc.userId, {
      type: 'health_cert_expiry',
      title: `보건증 만기 임박 (${label})`,
      body: `보건증 만기일: ${doc.expiryDate}. 갱신이 필요합니다.`,
      link: '/admin/documents',
    })
    sent++
  }

  return sent
}

// 서류 삭제
export async function deleteDocument(id: string): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}
