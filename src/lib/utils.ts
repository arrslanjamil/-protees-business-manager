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
