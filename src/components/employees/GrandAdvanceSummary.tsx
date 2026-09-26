import { Banknote } from 'lucide-react'
import { GrandAdvance } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface GrandAdvanceSummaryProps {
  grandAdvance: GrandAdvance | null
}

export function GrandAdvanceSummary({ grandAdvance }: GrandAdvanceSummaryProps) {
  if (!grandAdvance || grandAdvance.status === 'completed') {
    return null
  }

  return (
    <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4">
      <div className="flex items-start gap-3">
        <Banknote size={20} className="shrink-0 text-neon-amber" />
        <div className="flex-1">
          <h3 className="font-semibold text-white">Grand Advance (Loan)</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Original Amount:</span>
              <span className="font-medium text-white">{formatCurrency(grandAdvance.original_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recovered:</span>
              <span className="font-medium text-neon-green">{formatCurrency(grandAdvance.total_recovered)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Outstanding:</span>
              <span className="font-medium text-neon-amber">{formatCurrency(grandAdvance.outstanding_balance)}</span>
            </div>
            {grandAdvance.monthly_recovery_amount && (
              <div className="flex justify-between">
                <span className="text-slate-400">Suggested Monthly:</span>
                <span className="font-medium text-slate-300">{formatCurrency(grandAdvance.monthly_recovery_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={`font-medium ${grandAdvance.status === 'active' ? 'text-neon-green' : 'text-slate-500'}`}>
                {grandAdvance.status === 'active' ? 'Active' : 'Completed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
