import { classNames } from '@/lib/utils'

export type KpiTone = 'info' | 'positive' | 'warning' | 'due'

interface KpiCardProps {
  label: string
  value: string
  tone?: KpiTone
  /** Exact value shown as a native tooltip on hover — used when `value` is
   * a compacted display string (e.g. "Rs 2.05M") so the precise amount is
   * still one hover away. */
  fullValue?: string
}

const toneMap: Record<KpiTone, string> = {
  info: 'text-neon-cyan',
  positive: 'text-neon-green',
  warning: 'text-neon-amber',
  due: 'text-neon-red',
}

/** Large-number KPI card for the top-of-dashboard row — minimal chrome,
 * no icon, so the number itself is what the eye lands on. */
export function KpiCard({ label, value, tone = 'info', fullValue }: KpiCardProps) {
  return (
    <div className="card group transition-all duration-300 hover:-translate-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={classNames('mt-3 font-display text-4xl font-bold tracking-tight', toneMap[tone])}
        title={fullValue && fullValue !== value ? fullValue : undefined}
      >
        {value}
      </p>
    </div>
  )
}
