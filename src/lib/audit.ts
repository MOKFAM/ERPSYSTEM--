import { supabase } from './supabase'

interface AuditEntry {
  actorId?: string | null
  actorName?: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary?: string | null
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
}

// 비밀번호 등 민감 필드는 기록에서 제외
function sanitize(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data) return null
  const clone: Record<string, unknown> = { ...data }
  delete clone.password
  return clone
}

// 감사 로그 기록 (best-effort: 실패해도 본 작업 흐름을 막지 않음)
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    summary: entry.summary ?? null,
    before_data: sanitize(entry.beforeData),
    after_data: sanitize(entry.afterData),
  })

  if (error) console.error('[audit] insert failed:', error.message)
}
