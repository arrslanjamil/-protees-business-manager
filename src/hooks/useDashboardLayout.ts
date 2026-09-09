import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type WidgetId =
  | 'total-expenses'
  | 'total-salaries'
  | 'outstanding-advances'
  | 'total-payroll'
  | 'trend-chart'
  | 'khadim'
  | 'recent-activity'

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'total-expenses',
  'total-salaries',
  'outstanding-advances',
  'total-payroll',
  'trend-chart',
  'khadim',
  'recent-activity',
]

function sanitizeOrder(saved: string[] | null | undefined): WidgetId[] {
  if (!saved || saved.length === 0) return DEFAULT_WIDGET_ORDER
  const valid = saved.filter((id): id is WidgetId => (DEFAULT_WIDGET_ORDER as string[]).includes(id))
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !valid.includes(id))
  return [...valid, ...missing]
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
