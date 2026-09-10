import { Link } from 'react-router-dom'
import { classNames, formatCurrency } from '@/lib/utils'
import type { ZakatProgressSnapshot } from '@/lib/zakat'

/** Dashboard Zakat widget — Target/Distributed/Remaining/Percent all come
 * from the same running-balance snapshot as the Zakat page, so
 * "Remaining" here always matches "Outstanding Zakat Balance" above it. */
export function ZakatProgressCard({ grossAccrued, totalDistributed, remaining, percent }: ZakatProgressSnapshot) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Zakat Progress</h3>
        <Link to="/zakat" className="text-xs font-medium text-neon-cyan hover:underline">
          View Zakat
        </Link>
      </div>

      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Outstanding Zakat Balance</p>
        <p className="mt-1 font-display text-2xl font-bold text-neon-amber">{formatCurrency(remaining)}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/5 pt-4 text-center sm:text-left">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Target</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{formatCurrency(grossAccrued)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Distributed</p>
          <p className="mt-1 font-display text-lg font-bold text-neon-green">{formatCurrency(totalDistributed)}</p>
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
