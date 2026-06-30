'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toInventoryItem, toInventoryLog } from '@/lib/types'
import type { InventoryItem, InventoryLog } from '@/lib/types'
import { notifyManagers } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

// 재고가 최소 기준 아래로 떨어졌을 때 관리자에게 부족 알림 (best-effort)
async function maybeNotifyLowStock(itemId: string, afterQty: number): Promise<void> {
  const { data: item } = await supabase
    .from('inventory_items')
    .select('name, min_qty, unit')
    .eq('id', itemId)
    .single()

  if (!item) return
  if (afterQty < Number(item.min_qty)) {
    await notifyManagers({
      type: 'low_stock',
      title: '재고 부족 알림',
      body: `${item.name} 재고가 부족합니다. (현재 ${afterQty}${item.unit} / 최소 ${item.min_qty}${item.unit})`,
      link: '/admin/inventory',
    })
  }
}

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

// 재고 품목 목록
export async function getInventoryItems(): Promise<InventoryItem[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('category')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(toInventoryItem)
}

// 재고 부족 품목 (현재수량 < 최소기준)
export async function getLowStockItems(): Promise<InventoryItem[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).filter((row) => Number(row.current_qty) < Number(row.min_qty)).map(toInventoryItem)
}

// 재고 품목 생성
export async function createInventoryItem(formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('inventory_items').insert({
    name: formData.get('name') as string,
    category: (formData.get('category') as string) || '식재료',
    unit: (formData.get('unit') as string) || 'kg',
    current_qty: Number(formData.get('currentQty') || 0),
    min_qty: Number(formData.get('minQty') || 0),
    branch_id: (formData.get('branchId') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/inventory')
}

// 재고 품목 수정
export async function updateInventoryItem(id: string, formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('inventory_items').update({
    name: formData.get('name') as string,
    category: (formData.get('category') as string) || '식재료',
    unit: (formData.get('unit') as string) || 'kg',
    min_qty: Number(formData.get('minQty') || 0),
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/inventory')
}

// 재고 입고/출고/실사조정
export async function adjustInventory(
  itemId: string,
  changeType: 'incoming' | 'outgoing' | 'adjustment',
  changeQty: number,
  reason?: string
): Promise<void> {
  const session = await requireAuth()

  // 현재 수량 조회
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('current_qty')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) throw new Error('품목을 찾을 수 없습니다.')

  const currentQty = Number(item.current_qty)
  let afterQty: number
  let logChangeQty: number

  if (changeType === 'incoming') {
    afterQty = currentQty + changeQty
    logChangeQty = changeQty
  } else if (changeType === 'outgoing') {
    afterQty = currentQty - changeQty
    logChangeQty = -changeQty
  } else {
    // 실사조정: changeQty가 실제 수량
    afterQty = changeQty
    logChangeQty = changeQty - currentQty
  }

  // 수량 업데이트
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ current_qty: afterQty })
    .eq('id', itemId)

  if (updateError) throw new Error(updateError.message)

  // 변동 이력 기록
  const { error: logError } = await supabase.from('inventory_logs').insert({
    item_id: itemId,
    change_type: changeType,
    change_qty: logChangeQty,
    after_qty: afterQty,
    reason: reason || null,
    created_by: session.user.id,
  })

  if (logError) throw new Error(logError.message)

  await maybeNotifyLowStock(itemId, afterQty)

  revalidatePath('/admin/inventory')
}

// 매출 기반 재고 자동 차감 (메뉴 레시피 연동)
export async function deductInventoryBySale(menuItemId: string, quantity: number): Promise<void> {
  const session = await requireAuth()

  // 해당 메뉴의 레시피 조회
  const { data: recipes, error: recipeError } = await supabase
    .from('menu_recipes')
    .select('inventory_item_name, required_qty')
    .eq('menu_item_id', menuItemId)

  if (recipeError || !recipes || recipes.length === 0) return

  for (const recipe of recipes) {
    const deductQty = Number(recipe.required_qty) * quantity

    // 이름으로 재고 품목 매칭
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, current_qty')
      .eq('name', recipe.inventory_item_name)
      .limit(1)

    if (!items || items.length === 0) continue

    const item = items[0]
    const afterQty = Number(item.current_qty) - deductQty

    await supabase.from('inventory_items').update({ current_qty: afterQty }).eq('id', item.id)

    await supabase.from('inventory_logs').insert({
      item_id: item.id,
      change_type: 'outgoing',
      change_qty: -deductQty,
      after_qty: afterQty,
      reason: `판매 차감`,
      created_by: session.user.id,
    })

    await maybeNotifyLowStock(item.id, afterQty)
  }

  revalidatePath('/admin/inventory')
}

// 재고 변동 이력 조회
export async function getInventoryLogs(itemId?: string, limit = 50): Promise<InventoryLog[]> {
  await requireAuth()

  let query = supabase
    .from('inventory_logs')
    .select('*, inventory_items(name), creator:created_by(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (itemId) query = query.eq('item_id', itemId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toInventoryLog)
}
