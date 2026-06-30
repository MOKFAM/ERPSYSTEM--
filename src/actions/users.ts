'use server'

import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toUser } from '@/lib/types'
import type { User } from '@/lib/types'
import { recordAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('권한이 없습니다.')
  }
  return session
}

export async function getUsers(): Promise<User[]> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('users')
    .select('*, branches(name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const branchName = row.branches?.name ?? null
    return toUser({ ...row, branch_name: branchName })
  })
}

export async function createUser(formData: FormData): Promise<void> {
  const session = await requireAdmin()

  const password = formData.get('password') as string
  const hashedPassword = await bcrypt.hash(password, 10)

  const insertData = {
    email: formData.get('email') as string,
    password: hashedPassword,
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || null,
    role: formData.get('role') as string,
    employment_type: formData.get('employmentType') as string,
    position_type: formData.get('positionType') as string,
    job_title: (formData.get('jobTitle') as string) || null,
    branch_id: (formData.get('branchId') as string) || null,
    hire_date: (formData.get('hireDate') as string) || null,
    hourly_rate: formData.get('hourlyRate') ? Number(formData.get('hourlyRate')) : null,
    monthly_salary: formData.get('monthlySalary') ? Number(formData.get('monthlySalary')) : null,
  }

  const { data: created, error } = await supabase.from('users').insert(insertData).select('id').single()

  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'create',
    entityType: 'user',
    entityId: created?.id ?? null,
    summary: `직원 생성: ${insertData.name}`,
    afterData: insertData,
  })

  revalidatePath('/admin/users')
}

export async function updateUser(id: string, formData: FormData): Promise<void> {
  const session = await requireAdmin()

  const { data: before } = await supabase.from('users').select('*').eq('id', id).single()

  const updateData: Record<string, unknown> = {
    email: formData.get('email') as string,
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || null,
    role: formData.get('role') as string,
    employment_type: formData.get('employmentType') as string,
    position_type: formData.get('positionType') as string,
    job_title: (formData.get('jobTitle') as string) || null,
    branch_id: (formData.get('branchId') as string) || null,
    hire_date: (formData.get('hireDate') as string) || null,
    hourly_rate: formData.get('hourlyRate') ? Number(formData.get('hourlyRate')) : null,
    monthly_salary: formData.get('monthlySalary') ? Number(formData.get('monthlySalary')) : null,
  }

  const newPassword = formData.get('password') as string
  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 10)
  }

  const { error } = await supabase.from('users').update(updateData).eq('id', id)
  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'update',
    entityType: 'user',
    entityId: id,
    summary: `직원 수정: ${updateData.name}`,
    beforeData: before ?? null,
    afterData: updateData,
  })

  revalidatePath('/admin/users')
}

export async function deleteUser(id: string): Promise<void> {
  const session = await requireAdmin()

  const { data: before } = await supabase.from('users').select('*').eq('id', id).single()

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'delete',
    entityType: 'user',
    entityId: id,
    summary: `직원 비활성화: ${before?.name ?? id}`,
    beforeData: before ?? null,
  })

  revalidatePath('/admin/users')
}
