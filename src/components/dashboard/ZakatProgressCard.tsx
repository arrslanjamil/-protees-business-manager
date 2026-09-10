import { Link } from 'react-router-dom'
import { classNames, formatCurrency } from '@/lib/utils'

interface ZakatProgressCardProps {
  monthlyBudget: number
  distributed: number
}

/** Current-month Zakat distribution progress — mirrors the same
 * budget/distributed/remaining math shown on the Zakat Management page. */
export function ZakatProgressCard({ monthlyBudget, distributed }: ZakatProgressCardProps) {
  const remaining = Math.max(0, monthlyBudget - distributed)
  const percent = monthlyBudget > 0 ? Math.min(100, Math.round((distributed / monthlyBudget) * 100)) : 0

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Zakat Progress</h3>
        <Link to="/zakat" className="text-xs font-medium text-neon-cyan hover:underline">
          View Zakat
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center sm:text-left">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Monthly Target</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{formatCurrency(monthlyBudget)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Distributed</p>
          <p className="mt-1 font-display text-lg font-bold text-neon-green">{formatCurrency(distributed)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Remaining</p>
          <p className={classNames('mt-1 font-display text-lg font-bold', remaining > 0 ? 'text-neon-amber' : 'text-neon-green')}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="font-semibold text-neon-green">{percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-base-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-green transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
