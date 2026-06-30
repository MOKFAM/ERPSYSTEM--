'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toAuditLog } from '@/lib/types'
import type { AuditLog } from '@/lib/types'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

interface AuditFilter {
  entityType?: string
  action?: string
  limit?: number
}

// 감사 로그 조회 (관리자 전용)
export async function getAuditLogs(filter: AuditFilter = {}): Promise<AuditLog[]> {
  await requireAdmin()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 100)

  if (filter.entityType) query = query.eq('entity_type', filter.entityType)
  if (filter.action) query = query.eq('action', filter.action)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toAuditLog)
}
