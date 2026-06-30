'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toSale } from '@/lib/types'
import type { Sale } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { deductInventoryBySale } from '@/actions/inventory'

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

// 매출 등록
export async function createSale(formData: FormData): Promise<void> {
  const session = await requireAuth()

  const quantity = Number(formData.get('quantity'))
  const unitPrice = Number(formData.get('unitPrice'))

  const { error } = await supabase.from('sales').insert({
    branch_id: (formData.get('branchId') as string) || null,
    date: formData.get('date') as string,
    menu_item_id: (formData.get('menuItemId') as string) || null,
    menu_name: formData.get('menuName') as string,
    quantity,
    unit_price: unitPrice,
    total_price: quantity * unitPrice,
    payment_method: (formData.get('paymentMethod') as string) || 'card',
    created_by: session.user.id,
  })

  if (error) throw new Error(error.message)

  // 레시피 기반 재고 자동 차감
  const menuItemId = formData.get('menuItemId') as string
  if (menuItemId) {
    try {
      await deductInventoryBySale(menuItemId, quantity)
    } catch {
      // 재고 차감 실패해도 매출 등록은 유지
    }
  }

  revalidatePath('/sales')
  revalidatePath('/admin/sales')
}

// 오늘 매출 조회
export async function getTodaySales(): Promise<Sale[]> {
  await requireAuth()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('sales')
    .select('*, creator:created_by(name)')
    .eq('date', today)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSale)
}

// 기간별 매출 조회
export async function getSales(startDate: string, endDate: string): Promise<Sale[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('sales')
    .select('*, creator:created_by(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toSale)
}

// 매출 통계 (일별/주별/월별)
export async function getSalesStats(yearMonth: string): Promise<{
  daily: { date: string; total: number; count: number }[]
  menuRanking: { menuName: string; quantity: number; total: number }[]
  paymentSummary: { method: string; total: number; count: number }[]
  grandTotal: number
}> {
  await requireManagerOrAdmin()

  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = `${yearMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('sales')
    .select('date, menu_name, quantity, total_price, payment_method')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error(error.message)
  const sales = data ?? []

  // 일별 집계
  const dailyMap = new Map<string, { total: number; count: number }>()
  for (const s of sales) {
    const entry = dailyMap.get(s.date) ?? { total: 0, count: 0 }
    entry.total += s.total_price
    entry.count += s.quantity
    dailyMap.set(s.date, entry)
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 메뉴별 집계
  const menuMap = new Map<string, { quantity: number; total: number }>()
  for (const s of sales) {
    const entry = menuMap.get(s.menu_name) ?? { quantity: 0, total: 0 }
    entry.quantity += s.quantity
    entry.total += s.total_price
    menuMap.set(s.menu_name, entry)
  }
  const menuRanking = Array.from(menuMap.entries())
    .map(([menuName, v]) => ({ menuName, ...v }))
    .sort((a, b) => b.total - a.total)

  // 결제수단별 집계
  const paymentMap = new Map<string, { total: number; count: number }>()
  for (const s of sales) {
    const method = s.payment_method ?? 'other'
    const entry = paymentMap.get(method) ?? { total: 0, count: 0 }
    entry.total += s.total_price
    entry.count++
    paymentMap.set(method, entry)
  }
  const paymentSummary = Array.from(paymentMap.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = sales.reduce((sum, s) => sum + s.total_price, 0)

  return { daily, menuRanking, paymentSummary, grandTotal }
}

// 매출 삭제
export async function deleteSale(id: string): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/sales')
  revalidatePath('/admin/sales')
}
