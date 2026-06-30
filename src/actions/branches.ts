'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toBranch } from '@/lib/types'
import type { Branch } from '@/lib/types'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

export async function getBranches(): Promise<Branch[]> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(toBranch)
}

export async function createBranch(formData: FormData): Promise<void> {
  await requireAdmin()

  const { error } = await supabase.from('branches').insert({
    name: formData.get('name') as string,
    code: (formData.get('code') as string) || null,
    address: (formData.get('address') as string) || null,
    phone: (formData.get('phone') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/branches')
}

export async function updateBranch(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from('branches')
    .update({
      name: formData.get('name') as string,
      code: (formData.get('code') as string) || null,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/branches')
}

export async function deleteBranch(id: string): Promise<void> {
  await requireAdmin()

  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/branches')
}
