export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
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
    return { start: monday.toISOString().slice(0, 10), end }
  }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: first.toISOString().slice(0, 10), end }
  }
  // year
  const firstOfYear = new Date(now.getFullYear(), 0, 1)
  return { start: firstOfYear.toISOString().slice(0, 10), end }
}

export function isWithinRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end
}

export type DashboardDatePreset = '15d' | '30d' | '3m' | '6m' | '12m' | 'custom'

export const DASHBOARD_DATE_PRESET_LABELS: Record<DashboardDatePreset, string> = {
  '15d': 'Last 15 Days',
  '30d': 'Last 30 Days',
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '12m': 'Last 12 Months',
  custom: 'Custom Range',
}

/** Date range for the dashboard's flexible filter — separate from the
 * Reports page's own presets since the dashboard needs longer, rolling
 * windows (15/30 days, 3/6/12 months) rather than calendar-aligned ones. */
export function dashboardDateRange(preset: DashboardDatePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const end = todayISO()
  if (preset === 'custom') {
    return { start: customStart || end, end: customEnd || end }
  }
  const now = new Date()
  let start: Date
  switch (preset) {
    case '15d':
      start = new Date(now)
      start.setDate(start.getDate() - 14)
      break
    case '30d':
      start = new Date(now)
      start.setDate(start.getDate() - 29)
      break
    case '3m':
      start = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
      break
    case '6m':
      start = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate())
      break
    case '12m':
      start = new Date(now.getFullYear(), now.getMonth() - 11, now.getDate())
      break
  }
  return { start: start.toISOString().slice(0, 10), end }
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
