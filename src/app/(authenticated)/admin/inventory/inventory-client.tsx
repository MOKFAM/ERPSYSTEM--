'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getInventoryItems, getLowStockItems, createInventoryItem,
  updateInventoryItem, adjustInventory, getInventoryLogs,
} from '@/actions/inventory'
import type { InventoryItem, InventoryLog, InventoryChangeType } from '@/lib/types'
import { CHANGE_TYPE_LABELS } from '@/lib/types'
import { downloadCsv } from '@/lib/csv'

const changeTypeColors: Record<string, string> = {
  incoming: 'bg-green-100 text-green-800',
  outgoing: 'bg-red-100 text-red-800',
  adjustment: 'bg-blue-100 text-blue-800',
}

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lowStock, setLowStock] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [logItemId, setLogItemId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getInventoryItems(), getLowStockItems()])
      .then(([it, low]) => { setItems(it); setLowStock(low) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (editing) await updateInventoryItem(editing.id, formData)
        else await createInventoryItem(formData)
        setShowForm(false)
        setEditing(null)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류')
      }
    })
  }

  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!adjustingId) return
    const formData = new FormData(e.currentTarget)
    const changeType = formData.get('changeType') as InventoryChangeType
    const qty = Number(formData.get('qty'))
    const reason = formData.get('reason') as string
    startTransition(async () => {
      await adjustInventory(adjustingId, changeType, qty, reason)
      setAdjustingId(null)
      load()
    })
  }

  const openLogs = async (itemId: string) => {
    setLogItemId(itemId)
    const l = await getInventoryLogs(itemId)
    setLogs(l)
  }

  const handleExport = () => {
    downloadCsv(
      `재고_${new Date().toISOString().slice(0, 10)}`,
      ['품목명', '카테고리', '현재수량', '최소기준', '단위', '상태'],
      items.map((it) => [
        it.name, it.category, it.currentQty, it.minQty, it.unit,
        it.currentQty < it.minQty ? '부족' : '정상',
      ])
    )
  }

  if (loading) return <p className="text-sm text-gray-700">로딩 중...</p>

  const categories = Array.from(new Set(items.map((it) => it.category))).sort()
  const q = query.trim().toLowerCase()
  const filteredItems = items.filter((it) => {
    const matchQuery = !q || it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
    const matchCategory = !categoryFilter || it.category === categoryFilter
    return matchQuery && matchCategory
  })

  return (
    <div className="space-y-6">
      {/* 재고 부족 알림 */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-red-900">재고 부족 알림 ({lowStock.length}건)</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded bg-white px-3 py-2 border border-red-100">
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                <span className="text-sm text-red-800">
                  {item.currentQty}{item.unit} / 최소 {item.minQty}{item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색/필터 + 추가 버튼 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="품목명 검색"
          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-sm text-gray-700">{filteredItems.length}건</span>
        <button
          onClick={handleExport}
          disabled={items.length === 0}
          className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          CSV 내보내기
        </button>
        <button
          onClick={() => { setEditing(null); setShowForm(!showForm) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '품목 추가'}
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">품목명</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">카테고리</label>
              <input name="category" defaultValue={editing?.category ?? '식재료'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">단위</label>
              <input name="unit" defaultValue={editing?.unit ?? 'kg'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">초기 수량</label>
                <input name="currentQty" type="number" step="0.001" defaultValue="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">최소 기준량</label>
              <input name="minQty" type="number" step="0.001" defaultValue={editing?.minQty ?? '0'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {editing ? '수정' : '추가'}
          </button>
        </form>
      )}

      {/* 입고/출고/실사 폼 */}
      {adjustingId && (
        <form onSubmit={handleAdjust} className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            재고 조정 — {items.find((i) => i.id === adjustingId)?.name}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">유형</label>
              <select name="changeType" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                <option value="incoming">입고</option>
                <option value="outgoing">출고</option>
                <option value="adjustment">실사조정 (실제 수량 입력)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">수량</label>
              <input name="qty" type="number" step="0.001" min="0" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">사유</label>
              <input name="reason" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">처리</button>
            <button type="button" onClick={() => setAdjustingId(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900">취소</button>
          </div>
        </form>
      )}

      {/* 변동 이력 */}
      {logItemId && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              변동 이력 — {items.find((i) => i.id === logItemId)?.name}
            </h3>
            <button onClick={() => setLogItemId(null)} className="text-sm text-gray-700 hover:text-gray-900">닫기</button>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['유형', '변동량', '변동 후', '사유', '처리자', '일시'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${changeTypeColors[l.changeType]}`}>
                      {CHANGE_TYPE_LABELS[l.changeType]}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-sm font-medium ${l.changeQty >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {l.changeQty >= 0 ? '+' : ''}{l.changeQty}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{l.afterQty}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{l.reason || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{l.creatorName || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {new Date(l.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-700">이력이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 재고 목록 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['품목명', '카테고리', '현재 수량', '최소 기준', '상태', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const isLow = item.currentQty < item.minQty
              return (
                <tr key={item.id} className={isLow ? 'bg-red-50' : ''}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{item.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-900">{item.currentQty} {item.unit}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{item.minQty} {item.unit}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {isLow ? '부족' : '정상'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => setAdjustingId(item.id)} className="text-blue-700 hover:text-blue-800 text-xs font-medium">입출고</button>
                      <button onClick={() => openLogs(item.id)} className="text-purple-700 hover:text-purple-800 text-xs font-medium">이력</button>
                      <button onClick={() => { setEditing(item); setShowForm(true) }} className="text-gray-700 hover:text-gray-900 text-xs font-medium">수정</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-700">
                  {items.length === 0 ? '등록된 재고 품목이 없습니다.' : '검색 결과가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
