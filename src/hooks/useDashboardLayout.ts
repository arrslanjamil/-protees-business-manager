import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type WidgetId =
  | 'total-money-out'
  | 'total-employees'
  | 'total-payroll'
  | 'salary-paid'
  | 'outstanding-advances'
  | 'total-expenses'
  | 'unit-expenses'
  | 'total-collections'
  | 'salary-due'
  | 'advances-given'
  | 'khadim'
  | 'zakat-distributed'

/** Every KPI card on the dashboard, in one reorderable grid — this is
 * also the priority order a fresh (or reset) layout starts with.
 * Total Money Out always leads: see sanitizeOrder below. */
export const KPI_CARD_IDS: WidgetId[] = [
  'total-money-out',
  'total-employees',
  'total-payroll',
  'salary-paid',
  'outstanding-advances',
  'total-expenses',
  'unit-expenses',
  'total-collections',
  'salary-due',
  'advances-given',
  'khadim',
  'zakat-distributed',
]

export const DEFAULT_WIDGET_ORDER: WidgetId[] = KPI_CARD_IDS

function sanitizeOrder(saved: string[] | null | undefined): WidgetId[] {
  if (!saved || saved.length === 0) return DEFAULT_WIDGET_ORDER
  const valid = saved.filter((id): id is WidgetId => (DEFAULT_WIDGET_ORDER as string[]).includes(id))
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !valid.includes(id))
  // Total Money Out is the headline KPI — it leads even for users who
  // already have a saved layout from before this widget existed,
  // instead of landing at the end like other newly-added widgets.
  const withoutMoneyOut = valid.filter((id) => id !== 'total-money-out')
  const leadsWithMoneyOut = valid.includes('total-money-out') ? valid : ['total-money-out' as WidgetId, ...withoutMoneyOut]
  const stillMissing = missing.filter((id) => id !== 'total-money-out')
  return [...leadsWithMoneyOut, ...stillMissing]
}

/** Loads and persists the current user's dashboard widget order in
 * `dashboard_layouts`, one row per user. Falls back to DEFAULT_WIDGET_ORDER
 * until the saved layout (if any) has loaded, and again for signed-out /
 * unconfigured states. */
export function useDashboardLayout() {
  const { appUser } = useAuth()
  const [order, setOrderState] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    if (!appUser) {
      setOrderState(DEFAULT_WIDGET_ORDER)
      setLoaded(true)
      return
    }
    setLoaded(false)
    supabase
      .from('dashboard_layouts')
      .select('widget_order')
      .eq('user_id', appUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setOrderState(sanitizeOrder(data?.widget_order))
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [appUser])

  const setOrder = useCallback(
    (updater: WidgetId[] | ((prev: WidgetId[]) => WidgetId[])) => {
      setOrderState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: WidgetId[]) => WidgetId[])(prev) : updater
        if (appUser) {
          supabase
            .from('dashboard_layouts')
            .upsert({ user_id: appUser.id, widget_order: next, updated_at: new Date().toISOString() })
            .then(({ error }) => {
              if (error) console.error('Failed to save dashboard layout:', error.message)
            })
        }
        return next
      })
    },
    [appUser]
  )

  return { order, setOrder, loaded }
}
