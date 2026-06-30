'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { BranchSalesSummary, BranchInventorySummary, HqReportData } from '@/lib/types'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

// 지점별 매출 요약 (8-1)
export async function getHqSalesSummary(yearMonth: string): Promise<BranchSalesSummary[]> {
  await requireAdmin()

  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .order('name')

  const { data: sales, error } = await supabase
    .from('sales')
    .select('branch_id, date, total_price')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error(error.message)

  const branchMap = new Map((branches ?? []).map((b) => [b.id, b.name as string]))
  // 미지정 지점 포함
  const result: Map<string, BranchSalesSummary> = new Map()

  for (const [id, name] of branchMap) {
    result.set(id, { branchId: id, branchName: name, totalSales: 0, totalCount: 0, daily: [] })
  }

  const dailyMap: Map<string, Map<string, { total: number; count: number }>> = new Map()

  for (const sale of sales ?? []) {
    const bid = sale.branch_id ?? 'unassigned'
    if (!result.has(bid)) {
      result.set(bid, { branchId: bid, branchName: '미지정', totalSales: 0, totalCount: 0, daily: [] })
    }
    const entry = result.get(bid)!
    entry.totalSales += Number(sale.total_price)
    entry.totalCount += 1

    if (!dailyMap.has(bid)) dailyMap.set(bid, new Map())
    const dm = dailyMap.get(bid)!
    const d = sale.date as string
    if (!dm.has(d)) dm.set(d, { total: 0, count: 0 })
    const dd = dm.get(d)!
    dd.total += Number(sale.total_price)
    dd.count += 1
  }

  for (const [bid, dm] of dailyMap) {
    const entry = result.get(bid)!
    entry.daily = Array.from(dm.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return Array.from(result.values())
}

// 지점별 재고 요약 (8-2)
export async function getHqInventorySummary(): Promise<BranchInventorySummary[]> {
  await requireAdmin()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .order('name')

  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('branch_id, name, current_qty, min_qty, unit')

  if (error) throw new Error(error.message)

  const branchMap = new Map((branches ?? []).map((b) => [b.id, b.name as string]))
  const result: Map<string, BranchInventorySummary> = new Map()

  for (const [id, name] of branchMap) {
    result.set(id, { branchId: id, branchName: name, totalItems: 0, lowStockCount: 0, items: [] })
  }

  for (const item of items ?? []) {
    const bid = item.branch_id ?? 'unassigned'
    if (!result.has(bid)) {
      result.set(bid, { branchId: bid, branchName: '미지정', totalItems: 0, lowStockCount: 0, items: [] })
    }
    const entry = result.get(bid)!
    entry.totalItems += 1
    const currentQty = Number(item.current_qty)
    const minQty = Number(item.min_qty)
    if (currentQty < minQty) entry.lowStockCount += 1
    entry.items.push({
      name: item.name as string,
      currentQty,
      minQty,
      unit: item.unit as string,
    })
  }

  return Array.from(result.values())
}

// 지점별 비교 분석 데이터 (8-3) — 매출 + 재고 + 인건비
export async function getHqComparison(yearMonth: string): Promise<HqReportData> {
  await requireAdmin()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .order('name')

  // 매출
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  const { data: sales } = await supabase
    .from('sales')
    .select('branch_id, total_price')
    .gte('date', startDate)
    .lte('date', endDate)

  // 급여
  const { data: payroll } = await supabase
    .from('payroll')
    .select('users(branch_id), total_pay')
    .eq('year_month', yearMonth)
    .eq('status', 'confirmed')

  // 재고 부족
  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('branch_id, current_qty, min_qty')

  const branchMap = new Map((branches ?? []).map((b) => [b.id as string, b.name as string]))

  // 집계
  const salesByBranch: Map<string, { total: number; count: number }> = new Map()
  for (const s of sales ?? []) {
    const bid = (s.branch_id ?? 'unassigned') as string
    if (!salesByBranch.has(bid)) salesByBranch.set(bid, { total: 0, count: 0 })
    const e = salesByBranch.get(bid)!
    e.total += Number(s.total_price)
    e.count += 1
  }

  const payrollByBranch: Map<string, number> = new Map()
  for (const p of payroll ?? []) {
    const user = p.users as unknown as Record<string, unknown> | null
    const bid = ((user?.branch_id as string) ?? 'unassigned') as string
    payrollByBranch.set(bid, (payrollByBranch.get(bid) ?? 0) + Number(p.total_pay))
  }

  const lowStockByBranch: Map<string, number> = new Map()
  for (const item of inventory ?? []) {
    const bid = (item.branch_id ?? 'unassigned') as string
    if (Number(item.current_qty) < Number(item.min_qty)) {
      lowStockByBranch.set(bid, (lowStockByBranch.get(bid) ?? 0) + 1)
    }
  }

  let grandSalesTotal = 0
  let grandPayrollTotal = 0

  const branchResults = Array.from(branchMap.entries()).map(([id, name]) => {
    const s = salesByBranch.get(id) ?? { total: 0, count: 0 }
    const pt = payrollByBranch.get(id) ?? 0
    grandSalesTotal += s.total
    grandPayrollTotal += pt
    return {
      branchId: id,
      branchName: name,
      salesTotal: s.total,
      salesCount: s.count,
      payrollTotal: pt,
      payrollRatio: s.total > 0 ? Math.round((pt / s.total) * 100) : 0,
      lowStockCount: lowStockByBranch.get(id) ?? 0,
    }
  })

  return {
    period: yearMonth,
    branches: branchResults,
    grandSalesTotal,
    grandPayrollTotal,
  }
}

// 주간/월간 요약 리포트 (8-4)
export async function getHqReport(
  type: 'weekly' | 'monthly',
  date: string
): Promise<HqReportData> {
  await requireAdmin()

  let yearMonth: string
  if (type === 'monthly') {
    yearMonth = date.slice(0, 7) // YYYY-MM
  } else {
    // 주간: 해당 날짜가 속한 주의 월요일~일요일
    // 간단하게 해당 날짜의 월을 기준으로 사용
    yearMonth = date.slice(0, 7)
  }

  return getHqComparison(yearMonth)
}
