import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { classNames } from '@/lib/utils'

interface AccountCardProps {
  icon: ReactNode
  name: string
  subtitle: ReactNode
  balance: string
  /** Small caption under the balance figure, e.g. "12 collections" or
   * "Selected period" — mirrors the count/period line the old thin-row
   * layout showed next to the amount. */
  balanceHint?: ReactNode
  balanceTone?: 'default' | 'positive' | 'negative'
  badge?: ReactNode
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

/** One account as a full, self-contained card — logo/name/balance never
 * cramped into a thin row, and clicking it expands its own transaction
 * history directly beneath itself (true accordion — see CollectionsPage,
 * which keeps only one of these open across the whole page at a time). */
export function AccountCard({ icon, name, subtitle, balance, balanceHint, balanceTone = 'default', badge, expanded, onToggle, children }: AccountCardProps) {
  return (
    <div className={classNames('card overflow-hidden transition-colors', expanded && 'border-neon-cyan/30')}>
      <button type="button" onClick={onToggle} className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:gap-3.5">
        {/* Icon + name/subtitle — its own full-width row on mobile (so a
            long account name has the whole card width to wrap into,
            instead of fighting the balance for space); on sm+ these
            become plain siblings in the single original row via
            `contents`. */}
        <div className="flex items-center gap-3.5 sm:contents">
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-semibold text-white">{name}</p>
              {badge}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {/* Balance + chevron — right-aligned on its own row on mobile. */}
        <div className="flex items-center justify-end gap-3 sm:contents">
          <div className="text-right">
            <p
              className={classNames(
                'font-display text-lg font-bold',
                balanceTone === 'positive' ? 'text-neon-green' : balanceTone === 'negative' ? 'text-neon-red' : 'text-white'
              )}
            >
              {balance}
            </p>
            {balanceHint && <p className="text-[11px] text-slate-500">{balanceHint}</p>}
          </div>
          <ChevronDown size={18} className={classNames('shrink-0 text-slate-500 transition-transform duration-200', expanded && 'rotate-180 text-neon-cyan')} />
        </div>
      </button>
      {expanded && <div className="mt-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  )
}
