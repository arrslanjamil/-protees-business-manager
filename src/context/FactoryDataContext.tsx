import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/utils'
import type {
  Color,
  CurrentOperationRate,
  FactoryRole,
  Product,
  ProductOperation,
  ProductionPlan,
  ProductionPlanSize,
  ProductSize,
  ProductionPlanStatus,
  Profile,
} from '@/lib/factoryTypes'

interface NewProductInput {
  name: string
  pictureUrl?: string | null
  productionType: 'normal' | 'digital_print'
  sizeGroup: 'adult' | 'kids'
  sizeLabels: string[]
  colorIds: number[]
}

interface NewOperationInput {
  productId: number
  departmentLabel: string
  operationName: string
  rate: number
}

interface NewPlanInput {
  productId: number
  colorId: number | null
  productionType: 'normal' | 'digital_print'
  planDate?: string
  expectedCompletionDate?: string | null
  remarks?: string | null
  sizes: { sizeLabel: string; plannedQty: number }[]
}

interface FactoryDataContextValue {
  loading: boolean
  error: string | null
  colors: Color[]
  products: Product[]
  productSizes: ProductSize[]
  productColorLinks: { product_id: number; color_id: number }[]
  operations: ProductOperation[]
  currentRates: CurrentOperationRate[]
  plans: ProductionPlan[]
  planSizes: ProductionPlanSize[]
  profiles: Profile[]
  refreshAll: () => Promise<void>
  updateProfileRole: (id: string, role: FactoryRole | null) => Promise<void>

  addColor: (name: string, hex: string) => Promise<Color>
  createProduct: (input: NewProductInput) => Promise<void>
  toggleProductActive: (id: number, isActive: boolean) => Promise<void>
  addOperation: (input: NewOperationInput) => Promise<void>
  updateOperationRate: (productOperationId: number, newRate: number) => Promise<void>
  deactivateOperation: (productOperationId: number) => Promise<void>

  createProductionPlan: (input: NewPlanInput) => Promise<void>
  updatePlanStatus: (id: number, status: ProductionPlanStatus) => Promise<void>
}

const FactoryDataContext = createContext<FactoryDataContextValue | null>(null)

export function FactoryDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colors, setColors] = useState<Color[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSizes, setProductSizes] = useState<ProductSize[]>([])
  const [productColorLinks, setProductColorLinks] = useState<{ product_id: number; color_id: number }[]>([])
  const [operations, setOperations] = useState<ProductOperation[]>([])
  const [currentRates, setCurrentRates] = useState<CurrentOperationRate[]>([])
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [planSizes, setPlanSizes] = useState<ProductionPlanSize[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [c, p, ps, pc, po, por, pp, pps, pr] = await Promise.all([
        supabase.from('colors').select('*').order('name'),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('product_sizes').select('*').order('sort_order'),
        supabase.from('product_colors').select('*'),
        supabase.from('product_operations').select('*').order('sort_order'),
        supabase.from('product_operation_current_rates').select('*'),
        supabase.from('production_plans').select('*').order('plan_date', { ascending: false }),
        supabase.from('production_plan_sizes').select('*'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])
      const firstError = [c, p, ps, pc, po, por, pp, pps, pr].find((r) => r.error)?.error
      if (firstError) throw firstError

      setColors(c.data ?? [])
      setProducts(p.data ?? [])
      setProductSizes(ps.data ?? [])
      setProductColorLinks(pc.data ?? [])
      setOperations(po.data ?? [])
      setCurrentRates(por.data ?? [])
      setPlans(pp.data ?? [])
      setPlanSizes(pps.data ?? [])
      setProfiles(pr.data ?? [])
      hasLoadedOnceRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load factory data from Supabase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const addColor: FactoryDataContextValue['addColor'] = async (name, hex) => {
    const trimmed = name.trim()
    const existing = colors.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const { data, error: err } = await supabase.from('colors').insert({ name: trimmed, hex }).select().single()
    if (err) throw err
    await refreshAll()
    return data
  }

  const createProduct: FactoryDataContextValue['createProduct'] = async (input) => {
    const { data: product, error: err } = await supabase
      .from('products')
      .insert({
        name: input.name.trim(),
        picture_url: input.pictureUrl ?? null,
        production_type: input.productionType,
        size_group: input.sizeGroup,
      })
      .select()
      .single()
    if (err) throw err

    if (input.sizeLabels.length > 0) {
      const rows = input.sizeLabels.map((size_label, i) => ({ product_id: product.id, size_label, sort_order: i }))
      const { error: sizeErr } = await supabase.from('product_sizes').insert(rows)
      if (sizeErr) throw sizeErr
    }
    if (input.colorIds.length > 0) {
      const rows = input.colorIds.map((color_id) => ({ product_id: product.id, color_id }))
      const { error: colorErr } = await supabase.from('product_colors').insert(rows)
      if (colorErr) throw colorErr
    }
    await refreshAll()
  }

  const toggleProductActive: FactoryDataContextValue['toggleProductActive'] = async (id, isActive) => {
    const { error: err } = await supabase.from('products').update({ is_active: isActive }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const addOperation: FactoryDataContextValue['addOperation'] = async (input) => {
    const { data: op, error: err } = await supabase
      .from('product_operations')
      .insert({
        product_id: input.productId,
        department_label: input.departmentLabel.trim(),
        operation_name: input.operationName.trim(),
      })
      .select()
      .single()
    if (err) throw err
    const { error: rateErr } = await supabase.from('product_operation_rates').insert({ product_operation_id: op.id, rate: input.rate })
    if (rateErr) throw rateErr
    await refreshAll()
  }

  const updateOperationRate: FactoryDataContextValue['updateOperationRate'] = async (productOperationId, newRate) => {
    const { error: err } = await supabase.from('product_operation_rates').insert({ product_operation_id: productOperationId, rate: newRate })
    if (err) throw err
    await refreshAll()
  }

  const deactivateOperation: FactoryDataContextValue['deactivateOperation'] = async (productOperationId) => {
    const { error: err } = await supabase.from('product_operations').update({ is_active: false }).eq('id', productOperationId)
    if (err) throw err
    await refreshAll()
  }

  const createProductionPlan: FactoryDataContextValue['createProductionPlan'] = async (input) => {
    const { data: plan, error: err } = await supabase
      .from('production_plans')
      .insert({
        product_id: input.productId,
        color_id: input.colorId,
        production_type: input.productionType,
        plan_date: input.planDate ?? todayISO(),
        expected_completion_date: input.expectedCompletionDate ?? null,
        remarks: input.remarks ?? null,
      })
      .select()
      .single()
    if (err) throw err

    const rows = input.sizes.filter((s) => s.plannedQty > 0).map((s) => ({
      production_plan_id: plan.id,
      size_label: s.sizeLabel,
      planned_qty: s.plannedQty,
    }))
    if (rows.length > 0) {
      const { error: sizeErr } = await supabase.from('production_plan_sizes').insert(rows)
      if (sizeErr) throw sizeErr
    }
    await refreshAll()
  }

  const updatePlanStatus: FactoryDataContextValue['updatePlanStatus'] = async (id, status) => {
    const { error: err } = await supabase.from('production_plans').update({ status }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const updateProfileRole: FactoryDataContextValue['updateProfileRole'] = async (id, role) => {
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const value = useMemo<FactoryDataContextValue>(
    () => ({
      loading,
      error,
      colors,
      products,
      productSizes,
      productColorLinks,
      operations,
      currentRates,
      plans,
      planSizes,
      profiles,
      refreshAll,
      updateProfileRole,
      addColor,
      createProduct,
      toggleProductActive,
      addOperation,
      updateOperationRate,
      deactivateOperation,
      createProductionPlan,
      updatePlanStatus,
    }),
    [loading, error, colors, products, productSizes, productColorLinks, operations, currentRates, plans, planSizes, profiles, refreshAll]
  )

  return <FactoryDataContext.Provider value={value}>{children}</FactoryDataContext.Provider>
}

export function useFactoryData(): FactoryDataContextValue {
  const ctx = useContext(FactoryDataContext)
  if (!ctx) throw new Error('useFactoryData must be used within a FactoryDataProvider')
  return ctx
}
