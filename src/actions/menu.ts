'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toMenuItem, toMenuRecipe } from '@/lib/types'
import type { MenuItem, MenuRecipe } from '@/lib/types'
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

// 메뉴 목록 조회
export async function getMenuItems(activeOnly = false): Promise<MenuItem[]> {
  await requireAuth()

  let query = supabase.from('menu_items').select('*').order('category').order('name')
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(toMenuItem)
}

// 메뉴 생성
export async function createMenuItem(formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('menu_items').insert({
    name: formData.get('name') as string,
    price: Number(formData.get('price')),
    category: (formData.get('category') as string) || '기본',
    is_active: true,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

// 메뉴 수정
export async function updateMenuItem(id: string, formData: FormData): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('menu_items').update({
    name: formData.get('name') as string,
    price: Number(formData.get('price')),
    category: (formData.get('category') as string) || '기본',
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

// 메뉴 판매중지/재개
export async function toggleMenuItem(id: string, isActive: boolean): Promise<void> {
  await requireManagerOrAdmin()

  const { error } = await supabase.from('menu_items').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

// 메뉴 레시피 조회
export async function getMenuRecipes(menuItemId: string): Promise<MenuRecipe[]> {
  await requireAuth()

  const { data, error } = await supabase
    .from('menu_recipes')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .order('inventory_item_name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(toMenuRecipe)
}

// 레시피 저장 (기존 삭제 후 재생성)
export async function saveMenuRecipes(menuItemId: string, recipes: { name: string; qty: number; unit: string }[]): Promise<void> {
  await requireManagerOrAdmin()

  await supabase.from('menu_recipes').delete().eq('menu_item_id', menuItemId)

  if (recipes.length > 0) {
    const { error } = await supabase.from('menu_recipes').insert(
      recipes.map((r) => ({
        menu_item_id: menuItemId,
        inventory_item_name: r.name,
        required_qty: r.qty,
        unit: r.unit,
      }))
    )
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/menu')
}
