import { classNames } from '@/lib/utils'

export type KpiTone = 'info' | 'positive' | 'warning' | 'due'

interface KpiCardProps {
  label: string
  value: string
  tone?: KpiTone
}

const toneMap: Record<KpiTone, string> = {
  info: 'text-neon-cyan',
  positive: 'text-neon-green',
  warning: 'text-neon-amber',
  due: 'text-neon-red',
}

/** Large-number KPI card for the top-of-dashboard row — minimal chrome,
 * no icon, so the number itself is what the eye lands on. */
export function KpiCard({ label, value, tone = 'info' }: KpiCardProps) {
  return (
    <div className="card group transition-all duration-300 hover:-translate-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={classNames('mt-3 font-display text-4xl font-bold tracking-tight', toneMap[tone])}>{value}</p>
    </div>
  )
}
