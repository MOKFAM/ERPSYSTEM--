'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toPurchaseOrder, toApprovalStep } from '@/lib/types'
import type { PurchaseOrder, ApprovalStep, ApprovalStatus } from '@/lib/types'
import { notifyManagers, notifyUser } from '@/lib/notify'
import { recordAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

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

// 결재 단계 이력 추가 (다음 step_no 자동 계산)
async function appendApprovalStep(
  approvalId: string,
  orderId: string,
  action: ApprovalStep['action'],
  actorId: string | null,
  comment?: string | null
): Promise<void> {
  const { data: last } = await supabase
    .from('approval_steps')
    .select('step_no')
    .eq('approval_id', approvalId)
    .order('step_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextStep = last ? Number(last.step_no) + 1 : 1

  const { error } = await supabase.from('approval_steps').insert({
    approval_id: approvalId,
    order_id: orderId,
    step_no: nextStep,
    action,
    actor_id: actorId,
    comment: comment || null,
  })

  if (error) throw new Error(error.message)
}

// 상태 전이 유효성 (현재 상태 → 다음 상태)
const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending: ['in_review', 'approved', 'rejected', 'on_hold'],
  in_review: ['approved', 'rejected', 'on_hold'],
  on_hold: ['in_review', 'approved', 'rejected'],
  approved: [],
  rejected: [],
}

function revalidateAll() {
  revalidatePath('/purchase-orders')
  revalidatePath('/admin/purchase-orders')
}

// 발주/구매 요청 생성
export async function createPurchaseOrder(formData: FormData): Promise<void> {
  const session = await requireAuth()

  const orderType = formData.get('orderType') as string
  if (orderType !== 'ingredient' && orderType !== 'welfare') {
    throw new Error('요청 종류가 올바르지 않습니다.')
  }

  const quantity = Number(formData.get('quantity') || 0)
  if (quantity <= 0) throw new Error('수량은 0보다 커야 합니다.')

  const unitPriceRaw = formData.get('unitPrice') as string
  const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null

  // 요청자의 지점 정보 조회
  const { data: user } = await supabase
    .from('users')
    .select('branch_id')
    .eq('id', session.user.id)
    .single()

  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .insert({
      requester_id: session.user.id,
      branch_id: user?.branch_id ?? null,
      order_type: orderType,
      title: formData.get('title') as string,
      item_name: formData.get('itemName') as string,
      quantity,
      unit: (formData.get('unit') as string) || 'ea',
      unit_price: unitPrice,
      vendor_name: (formData.get('vendorName') as string) || null,
      reason: (formData.get('reason') as string) || null,
      requested_date: (formData.get('requestedDate') as string) || new Date().toISOString().slice(0, 10),
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? '발주 요청 생성에 실패했습니다.')

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .insert({
      order_id: order.id,
      current_status: 'pending',
      requested_by: session.user.id,
    })
    .select('id')
    .single()

  if (approvalError || !approval) throw new Error(approvalError?.message ?? '결재 생성에 실패했습니다.')

  await appendApprovalStep(approval.id, order.id, 'requested', session.user.id, formData.get('reason') as string)

  await notifyManagers({
    type: 'approval_request',
    title: '신규 결재 요청',
    body: `${session.user.name}님의 발주 요청: ${formData.get('title') as string}`,
    link: '/admin/purchase-orders',
  })

  revalidateAll()
}

// 내 발주 요청 목록
export async function getMyPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  const session = await requireAuth()

  let query = supabase
    .from('purchase_orders')
    .select('*, branches(name)')
    .eq('requester_id', session.user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toPurchaseOrder)
}

// 전체 발주 요청 목록 (관리자/매니저)
export async function getAllPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  await requireManagerOrAdmin()

  let query = supabase
    .from('purchase_orders')
    .select('*, requester:requester_id(name), branches(name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toPurchaseOrder)
}

// 결재 이력 조회
export async function getApprovalSteps(orderId: string): Promise<ApprovalStep[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('approval_steps')
    .select('*, actor:actor_id(name)')
    .eq('order_id', orderId)
    .order('step_no', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toApprovalStep)
}

// 결재 처리 (검토중/승인/반려/보류)
export async function reviewPurchaseOrder(
  orderId: string,
  action: 'in_review' | 'approved' | 'rejected' | 'on_hold',
  comment?: string
): Promise<void> {
  const session = await requireManagerOrAdmin()

  const { data: approval, error: fetchError } = await supabase
    .from('approvals')
    .select('id, current_status, requested_by, purchase_orders(title)')
    .eq('order_id', orderId)
    .single()

  if (fetchError || !approval) throw new Error('결재 정보를 찾을 수 없습니다.')

  const current = approval.current_status as ApprovalStatus
  if (!ALLOWED_TRANSITIONS[current].includes(action)) {
    throw new Error(`현재 상태(${current})에서는 처리할 수 없습니다.`)
  }

  if (action === 'rejected' && !comment) {
    throw new Error('반려 시 사유를 입력해야 합니다.')
  }

  const isFinal = action === 'approved' || action === 'rejected'

  const { error: approvalError } = await supabase
    .from('approvals')
    .update({
      current_status: action,
      ...(isFinal
        ? { final_decided_by: session.user.id, final_decided_at: new Date().toISOString() }
        : { assigned_reviewer_id: session.user.id }),
    })
    .eq('id', approval.id)

  if (approvalError) throw new Error(approvalError.message)

  const { error: orderError } = await supabase
    .from('purchase_orders')
    .update({
      status: action,
      ...(action === 'rejected' ? { rejected_reason: comment || null } : {}),
    })
    .eq('id', orderId)

  if (orderError) throw new Error(orderError.message)

  await appendApprovalStep(approval.id, orderId, action, session.user.id, comment)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: action === 'approved' ? 'approve' : action === 'rejected' ? 'reject' : 'update',
    entityType: 'purchase_order',
    entityId: orderId,
    summary: `발주 결재: ${current} → ${action}${comment ? ` (${comment})` : ''}`,
    beforeData: { status: current },
    afterData: { status: action, comment: comment ?? null },
  })

  if (action === 'approved' || action === 'rejected') {
    const orderTitle =
      (approval.purchase_orders as { title?: string } | null)?.title ?? '발주 요청'
    await notifyUser(approval.requested_by as string, {
      type: action === 'approved' ? 'approval_approved' : 'approval_rejected',
      title: action === 'approved' ? '발주 승인됨' : '발주 반려됨',
      body:
        action === 'approved'
          ? `'${orderTitle}' 요청이 승인되었습니다.`
          : `'${orderTitle}' 요청이 반려되었습니다.${comment ? ` 사유: ${comment}` : ''}`,
      link: '/purchase-orders',
    })
  }

  revalidateAll()
}

// 반려된 요청 재신청 (기존 요청 복제 + 새 결재 생성)
export async function resubmitPurchaseOrder(orderId: string): Promise<void> {
  const session = await requireAuth()

  const { data: origin, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', orderId)
    .eq('requester_id', session.user.id)
    .single()

  if (fetchError || !origin) throw new Error('원본 요청을 찾을 수 없습니다.')
  if (origin.status !== 'rejected') throw new Error('반려된 요청만 재신청할 수 있습니다.')

  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .insert({
      requester_id: session.user.id,
      branch_id: origin.branch_id,
      order_type: origin.order_type,
      title: origin.title,
      item_name: origin.item_name,
      quantity: origin.quantity,
      unit: origin.unit,
      unit_price: origin.unit_price,
      vendor_name: origin.vendor_name,
      reason: origin.reason,
      requested_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      resubmitted_from: origin.id,
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error(orderError?.message ?? '재신청에 실패했습니다.')

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .insert({
      order_id: order.id,
      current_status: 'pending',
      requested_by: session.user.id,
    })
    .select('id')
    .single()

  if (approvalError || !approval) throw new Error(approvalError?.message ?? '결재 생성에 실패했습니다.')

  await appendApprovalStep(approval.id, order.id, 'resubmitted', session.user.id, `재신청 (원본: ${origin.id})`)

  await notifyManagers({
    type: 'approval_request',
    title: '발주 재신청',
    body: `${session.user.name}님이 '${origin.title}' 요청을 재신청했습니다.`,
    link: '/admin/purchase-orders',
  })

  revalidateAll()
}

// 발주 요청 취소 (본인 + 대기 상태만)
export async function cancelPurchaseOrder(orderId: string): Promise<void> {
  const session = await requireAuth()

  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', orderId)
    .eq('requester_id', session.user.id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
  revalidateAll()
}

// 납품 확인 (승인된 식자재 발주 → 재고 입고 연동)
export async function confirmDelivery(orderId: string, deliveredQty: number): Promise<void> {
  const session = await requireManagerOrAdmin()

  if (deliveredQty <= 0) throw new Error('납품 수량은 0보다 커야 합니다.')

  const { data: order, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('발주 요청을 찾을 수 없습니다.')
  if (order.status !== 'approved') throw new Error('승인된 발주만 납품 확인할 수 있습니다.')
  if (order.received_at) throw new Error('이미 납품 확인된 발주입니다.')

  // 식자재 발주인 경우 재고 입고 연동 (이름 매칭)
  if (order.order_type === 'ingredient') {
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, current_qty')
      .eq('name', order.item_name)
      .limit(1)

    if (items && items.length > 0) {
      const item = items[0]
      const afterQty = Number(item.current_qty) + deliveredQty

      await supabase.from('inventory_items').update({ current_qty: afterQty }).eq('id', item.id)
      await supabase.from('inventory_logs').insert({
        item_id: item.id,
        change_type: 'incoming',
        change_qty: deliveredQty,
        after_qty: afterQty,
        reason: `발주 납품 확인 (${order.title})`,
        created_by: session.user.id,
      })
    }
  }

  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      received_qty: deliveredQty,
      received_at: new Date().toISOString(),
      received_by: session.user.id,
    })
    .eq('id', orderId)

  if (updateError) throw new Error(updateError.message)

  const { data: approval } = await supabase
    .from('approvals')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (approval) {
    await appendApprovalStep(approval.id, orderId, 'delivered', session.user.id, `납품 수량: ${deliveredQty}`)
  }

  revalidateAll()
  revalidatePath('/admin/inventory')
}
