import type { LucideIcon } from 'lucide-react'
import { classNames } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  accent?: 'cyan' | 'purple' | 'green' | 'red' | 'amber'
  hint?: string
}

const accentMap = {
  cyan: { icon: 'text-neon-cyan bg-neon-cyan/10', ring: 'group-hover:shadow-glow' },
  purple: { icon: 'text-neon-purple bg-neon-purple/10', ring: 'group-hover:shadow-glow-purple' },
  green: { icon: 'text-neon-green bg-neon-green/10', ring: 'group-hover:shadow-glow-green' },
  red: { icon: 'text-neon-red bg-neon-red/10', ring: 'group-hover:shadow-glow-red' },
  amber: { icon: 'text-neon-amber bg-neon-amber/10', ring: '' },
}

export function StatCard({ label, value, icon: Icon, accent = 'cyan', hint }: StatCardProps) {
  const styles = accentMap[accent]
  return (
    <div className={classNames('card group transition-all duration-300 hover:-translate-y-0.5', styles.ring)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={classNames('rounded-xl p-2.5', styles.icon)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
