import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { MasterDataItem, MasterDataType, MasterDataTypeKey } from '@/lib/types'

interface MasterDataContextValue {
  loading: boolean
  error: string | null
  types: MasterDataType[]
  items: MasterDataItem[]
  refreshAll: () => Promise<void>

  /** Active items for a type, sorted — what every dropdown in the app
   * should render. Falls back to [] for a type with no items yet. */
  itemsFor: (typeKey: MasterDataTypeKey | string) => MasterDataItem[]
  /** All items (active + archived) for a type — for the Settings/Master
   * Data management screen itself. */
  allItemsFor: (typeKey: MasterDataTypeKey | string) => MasterDataItem[]

  addItem: (typeKey: MasterDataTypeKey | string, name: string) => Promise<MasterDataItem>
  renameItem: (id: number, name: string) => Promise<void>
  setItemActive: (id: number, isActive: boolean) => Promise<void>
  deleteItem: (id: number) => Promise<void>
}

const MasterDataContext = createContext<MasterDataContextValue | null>(null)

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [types, setTypes] = useState<MasterDataType[]>([])
  const [items, setItems] = useState<MasterDataItem[]>([])

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!appUser) {
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [t, i] = await Promise.all([
        supabase.from('master_data_types').select('*').order('sort_order'),
        supabase.from('master_data_items').select('*').order('sort_order').order('name'),
      ])
      const firstError = [t, i].find((r) => r.error)?.error
      if (firstError) throw firstError
      setTypes(t.data ?? [])
      setItems(i.data ?? [])
      hasLoadedOnceRef.current = true
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load master data from Supabase.'
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const itemsByType = useMemo(() => {
    const map = new Map<string, MasterDataItem[]>()
    for (const item of items) {
      const list = map.get(item.type_key) ?? []
      list.push(item)
      map.set(item.type_key, list)
    }
    return map
  }, [items])

  const itemsFor = useCallback((typeKey: string) => (itemsByType.get(typeKey) ?? []).filter((i) => i.is_active), [itemsByType])
  const allItemsFor = useCallback((typeKey: string) => itemsByType.get(typeKey) ?? [], [itemsByType])

  const addItem: MasterDataContextValue['addItem'] = async (typeKey, name) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name cannot be empty.')
    const existing = allItemsFor(typeKey).find((i) => i.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      if (!existing.is_active) throw new Error(`"${trimmed}" already exists but is archived — restore it instead.`)
      return existing
    }
    const { data, error: err } = await supabase.from('master_data_items').insert({ type_key: typeKey, name: trimmed }).select().single()
    if (err) throw err
    await refreshAll()
    return data
  }

  const renameItem: MasterDataContextValue['renameItem'] = async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name cannot be empty.')
    const { error: err } = await supabase.from('master_data_items').update({ name: trimmed }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const setItemActive: MasterDataContextValue['setItemActive'] = async (id, isActive) => {
    const { error: err } = await supabase.from('master_data_items').update({ is_active: isActive }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const deleteItem: MasterDataContextValue['deleteItem'] = async (id) => {
    const { error: err } = await supabase.from('master_data_items').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const value: MasterDataContextValue = {
    loading,
    error,
    types,
    items,
    refreshAll,
    itemsFor,
    allItemsFor,
    addItem,
    renameItem,
    setItemActive,
    deleteItem,
  }

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>
}

export function useMasterData(): MasterDataContextValue {
  const ctx = useContext(MasterDataContext)
  if (!ctx) throw new Error('useMasterData must be used within a MasterDataProvider')
  return ctx
}
