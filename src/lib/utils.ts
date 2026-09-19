export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

/** Compact form for KPI cards: >=1M -> "Rs 2.05M", >=1K -> "Rs 23.5K",
 * else the full formatted amount. Trailing ".0"/".00" is dropped (707000
 * -> "707K", not "707.0K"). Pair with formatCurrency(amount) as a title/
 * tooltip so the exact value is still available on hover. */
export function formatCurrencyCompact(amount: number): string {
  const value = amount || 0
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}Rs ${parseFloat((abs / 1_000_000).toFixed(2))}M`
  }
  if (abs >= 1_000) {
    return `${sign}Rs ${parseFloat((abs / 1_000).toFixed(1))}K`
  }
  return formatCurrency(value)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Date + time, for timestamptz columns (created_at) where the exact
 * moment matters — e.g. "11 Sep 2026, 3:45 PM". */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

/** Formats a Date's LOCAL calendar date as YYYY-MM-DD. Unlike
 * `.toISOString()`, this never rolls over to the adjacent day for
 * timezones ahead of UTC (e.g. Pakistan, UTC+5) — `.toISOString()`
 * converts to UTC first, which pushes local midnight back a day. */
export function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function todayISO(): string {
  return toLocalISODate(new Date())
}

/** Ratio of outstanding advance balance to monthly salary, 0-100+. */
export function advanceRiskPercent(balance: number, monthlySalary: number): number {
  if (!monthlySalary || monthlySalary <= 0) return balance > 0 ? 100 : 0
  return Math.max(0, Math.min(150, (balance / monthlySalary) * 100))
}

export type RiskLevel = 'safe' | 'moderate' | 'high'

export function riskLevel(percent: number): RiskLevel {
  if (percent < 30) return 'safe'
  if (percent < 70) return 'moderate'
  return 'high'
}

export function riskColors(level: RiskLevel) {
  switch (level) {
    case 'safe':
      return {
        bar: 'bg-neon-green',
        text: 'text-neon-green',
        glow: 'shadow-glow-green',
        badgeBg: 'bg-neon-green/10',
        border: 'border-neon-green/30',
      }
    case 'moderate':
      return {
        bar: 'bg-neon-amber',
        text: 'text-neon-amber',
        glow: 'shadow-[0_0_16px_-2px_rgba(251,191,36,0.5)]',
        badgeBg: 'bg-neon-amber/10',
        border: 'border-neon-amber/30',
      }
    case 'high':
      return {
        bar: 'bg-neon-red',
        text: 'text-neon-red',
        glow: 'shadow-glow-red',
        badgeBg: 'bg-neon-red/10',
        border: 'border-neon-red/30',
      }
  }
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

/** Simple two-state warning used for advance-vs-pay comparisons: red once the
 * outstanding balance reaches the person's pay amount, green otherwise. */
export type AdvanceWarningLevel = 'green' | 'red'

export function advanceWarningLevel(balance: number, payAmount: number): AdvanceWarningLevel {
  if (payAmount <= 0) return balance > 0 ? 'red' : 'green'
  return balance >= payAmount ? 'red' : 'green'
}

export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export function presetDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date()
  const end = todayISO()
  if (preset === 'custom') {
    return { start: customStart || end, end: customEnd || end }
  }
  if (preset === 'today') {
    return { start: end, end }
  }
  if (preset === 'week') {
    const day = now.getDay()
    const diffToMonday = (day + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    return { start: toLocalISODate(monday), end }
  }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: toLocalISODate(first), end }
  }
  // year
  const firstOfYear = new Date(now.getFullYear(), 0, 1)
  return { start: toLocalISODate(firstOfYear), end }
}

export function isWithinRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end
}

export type DashboardDatePreset = 'today' | 'yesterday' | '15d' | 'monthly' | '6m' | 'annually' | 'custom'

export const DASHBOARD_DATE_PRESET_LABELS: Record<DashboardDatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '15d': 'Last 15 Days',
  monthly: 'Monthly',
  '6m': 'Last 6 Months',
  annually: 'Annually',
  custom: 'Custom Date Range',
}

/** Date range for the dashboard's global filter. */
export function dashboardDateRange(preset: DashboardDatePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date()
  const end = todayISO()
  switch (preset) {
    case 'today':
      return { start: end, end }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const iso = toLocalISODate(y)
      return { start: iso, end: iso }
    }
    case '15d': {
      const s = new Date(now)
      s.setDate(s.getDate() - 14)
      return { start: toLocalISODate(s), end }
    }
    case 'monthly': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: toLocalISODate(s), end }
    }
    case '6m': {
      const s = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate())
      return { start: toLocalISODate(s), end }
    }
    case 'annually': {
      const s = new Date(now.getFullYear(), 0, 1)
      return { start: toLocalISODate(s), end }
    }
    case 'custom':
    default:
      return { start: customStart || end, end: customEnd || end }
  }
}

/** Simple fuzzy match: scores how well `query` matches `target` by token overlap. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase().trim()
  if (!q || !t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 90
  if (t.includes(q)) return 70
  const qTokens = q.split(/\s+/)
  const tTokens = t.split(/\s+/)
  let hits = 0
  for (const qt of qTokens) {
    if (tTokens.some((tt) => tt.startsWith(qt) || qt.startsWith(tt))) hits++
  }
  return hits > 0 ? (hits / qTokens.length) * 60 : 0
}

/** Supabase/PostgREST errors are plain objects, not Error instances — so a
 * bare `err instanceof Error` check throws away the real reason. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return fallback
}
