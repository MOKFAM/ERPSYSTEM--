'use client'

import { useState, useEffect, useTransition } from 'react'
import { getMenuItems, createMenuItem, updateMenuItem, toggleMenuItem, getMenuRecipes, saveMenuRecipes } from '@/actions/menu'
import type { MenuItem, MenuRecipe } from '@/lib/types'

function formatWon(n: number) { return n.toLocaleString('ko-KR') + '원' }

export default function MenuClient() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [error, setError] = useState('')
  const [recipeMenuId, setRecipeMenuId] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<{ name: string; qty: number; unit: string }[]>([])

  const load = () => {
    setLoading(true)
    getMenuItems().then(setItems).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (editing) await updateMenuItem(editing.id, formData)
        else await createMenuItem(formData)
        setShowForm(false)
        setEditing(null)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류')
      }
    })
  }

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      await toggleMenuItem(id, !isActive)
      load()
    })
  }

  const openRecipe = async (menuId: string) => {
    setRecipeMenuId(menuId)
    const existing = await getMenuRecipes(menuId)
    setRecipes(existing.map((r) => ({ name: r.inventoryItemName, qty: r.requiredQty, unit: r.unit })))
  }

  const handleSaveRecipes = () => {
    if (!recipeMenuId) return
    startTransition(async () => {
      await saveMenuRecipes(recipeMenuId, recipes)
      setRecipeMenuId(null)
      setRecipes([])
    })
  }

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setShowForm(!showForm) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '메뉴 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">메뉴명</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">가격 (원)</label>
              <input name="price" type="number" min="0" required defaultValue={editing?.price ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">카테고리</label>
              <input name="category" defaultValue={editing?.category ?? '기본'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {editing ? '수정' : '추가'}
          </button>
        </form>
      )}

      {/* 레시피 편집 모달 */}
      {recipeMenuId && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            레시피 편집 — {items.find((i) => i.id === recipeMenuId)?.name}
          </h3>
          {recipes.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={r.name} onChange={(e) => { const c = [...recipes]; c[idx].name = e.target.value; setRecipes(c) }} placeholder="재료명" className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900" />
              <input type="number" step="0.001" value={r.qty} onChange={(e) => { const c = [...recipes]; c[idx].qty = Number(e.target.value); setRecipes(c) }} placeholder="수량" className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900" />
              <input value={r.unit} onChange={(e) => { const c = [...recipes]; c[idx].unit = e.target.value; setRecipes(c) }} placeholder="단위" className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900" />
              <button onClick={() => setRecipes(recipes.filter((_, i) => i !== idx))} className="text-red-700 text-sm">삭제</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setRecipes([...recipes, { name: '', qty: 0, unit: 'g' }])} className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-900">재료 추가</button>
            <button onClick={handleSaveRecipes} disabled={isPending} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">저장</button>
            <button onClick={() => { setRecipeMenuId(null); setRecipes([]) }} className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-900">취소</button>
          </div>
        </div>
      )}

      {/* 메뉴 목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['메뉴명', '카테고리', '가격', '상태', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{item.category}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatWon(item.price)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {item.isActive ? '판매중' : '중지'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(item); setShowForm(true) }} className="text-blue-700 hover:text-blue-800 text-xs font-medium">수정</button>
                    <button onClick={() => openRecipe(item.id)} className="text-purple-700 hover:text-purple-800 text-xs font-medium">레시피</button>
                    <button onClick={() => handleToggle(item.id, item.isActive)} disabled={isPending} className="text-orange-700 hover:text-orange-800 text-xs font-medium">
                      {item.isActive ? '중지' : '재개'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-700">등록된 메뉴가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
