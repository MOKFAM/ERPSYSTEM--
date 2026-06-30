'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toInterview } from '@/lib/types'
import type { Interview } from '@/lib/types'
import { recordAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

// 면담/인사 기록은 마스터 관리자(admin) 전용
async function requireMaster() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

// 면담/인사 기록 조회 (열람 로그 기록 — 7-17)
export async function getInterviews(userId?: string): Promise<Interview[]> {
  const session = await requireMaster()

  let query = supabase
    .from('interviews')
    .select('*, users(name), interviewer:interviewer_id(name)')
    .order('interview_date', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // 민감 정보 열람 로그 기록
  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'view',
    entityType: 'interview',
    entityId: userId ?? null,
    summary: userId ? `면담/인사 기록 열람 (직원 ${userId})` : '면담/인사 기록 전체 열람',
  })

  return (data ?? []).map(toInterview)
}

// 면담/인사 기록 생성
export async function createInterview(formData: FormData): Promise<void> {
  const session = await requireMaster()

  const insertData = {
    user_id: formData.get('userId') as string,
    interviewer_id: session.user.id,
    category: (formData.get('category') as string) || 'interview',
    title: formData.get('title') as string,
    content: (formData.get('content') as string) || null,
    interview_date: (formData.get('interviewDate') as string) || new Date().toISOString().slice(0, 10),
  }

  const { data: created, error } = await supabase.from('interviews').insert(insertData).select('id').single()
  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'create',
    entityType: 'interview',
    entityId: created?.id ?? null,
    summary: `면담/인사 기록 생성: ${insertData.title}`,
    afterData: insertData,
  })

  revalidatePath('/admin/interviews')
}

// 면담/인사 기록 수정
export async function updateInterview(id: string, formData: FormData): Promise<void> {
  const session = await requireMaster()

  const { data: before } = await supabase.from('interviews').select('*').eq('id', id).single()

  const updateData = {
    category: (formData.get('category') as string) || 'interview',
    title: formData.get('title') as string,
    content: (formData.get('content') as string) || null,
    interview_date: (formData.get('interviewDate') as string) || new Date().toISOString().slice(0, 10),
  }

  const { error } = await supabase.from('interviews').update(updateData).eq('id', id)
  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'update',
    entityType: 'interview',
    entityId: id,
    summary: `면담/인사 기록 수정: ${updateData.title}`,
    beforeData: before ?? null,
    afterData: updateData,
  })

  revalidatePath('/admin/interviews')
}

// 면담/인사 기록 삭제
export async function deleteInterview(id: string): Promise<void> {
  const session = await requireMaster()

  const { data: before } = await supabase.from('interviews').select('*').eq('id', id).single()

  const { error } = await supabase.from('interviews').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'delete',
    entityType: 'interview',
    entityId: id,
    summary: `면담/인사 기록 삭제: ${before?.title ?? id}`,
    beforeData: before ?? null,
  })

  revalidatePath('/admin/interviews')
}
