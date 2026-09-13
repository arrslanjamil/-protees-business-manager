import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface DrillDownPanelProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/** Inline drill-down section shown below the dashboard's KPI cards when
 * one is clicked — no modal, no navigation, per the "expand in place"
 * requirement. */
export function DrillDownPanel({ title, subtitle, onClose, children }: DrillDownPanelProps) {
  return (
    <div className="card border-neon-cyan/30 animate-in fade-in">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-200">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  )
}
