export const DASHBOARD_SECTION_IDS = [
  'financial',
  'employees',
  'protees_unit',
  'salary',
  'advances',
  'expenses',
  'reports',
] as const

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number]

const STORAGE_KEY = 'protees_dashboard_layout_v1'

function isSectionId(value: string): value is DashboardSectionId {
  return (DASHBOARD_SECTION_IDS as readonly string[]).includes(value)
}

/** Reads the saved section order from localStorage. Falls back to the
 * default order, and appends any section the saved layout is missing (e.g.
 * after an app update adds a new section) so nothing is ever hidden. */
export function loadDashboardOrder(): DashboardSectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DASHBOARD_SECTION_IDS]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DASHBOARD_SECTION_IDS]
    const valid = parsed.filter((id): id is DashboardSectionId => typeof id === 'string' && isSectionId(id))
    const missing = DASHBOARD_SECTION_IDS.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return [...DASHBOARD_SECTION_IDS]
  }
}

export function saveDashboardOrder(order: DashboardSectionId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    // Storage unavailable (private browsing, quota) — layout just won't persist.
  }
}
