import { HandCoins, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { DEPARTMENT_LABELS, type Department } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface RiskiestPerson {
  name: string
  department: Department
  payAmount: number
  advanceBalance: number
}

interface AdvancesSectionProps {
  periodAdvancesGiven: number
  periodAdvancesRepaid: number
  outstandingAdvances: number
  riskiest: RiskiestPerson[]
}

export function AdvancesSection({ periodAdvancesGiven, periodAdvancesRepaid, outstandingAdvances, riskiest }: AdvancesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Advances Given" value={formatCurrency(periodAdvancesGiven)} icon={HandCoins} accent="amber" hint="Selected period" />
        <StatCard label="Advances Repaid" value={formatCurrency(periodAdvancesRepaid)} icon={TrendingDown} accent="green" hint="Deducted from pay, selected period" />
        <StatCard label="Outstanding Balance" value={formatCurrency(outstandingAdvances)} icon={TrendingUp} accent="red" hint="Live balance, both departments" />
      </div>
      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Highest Advance Risk</h3>
        {riskiest.length === 0 ? (
          <EmptyState icon={Wallet} title="No outstanding advances" description="Everyone is settled up." />
        ) : (
          <div className="space-y-4">
            {riskiest.map((p) => (
              <div key={`${p.department}-${p.name}`}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-200">
                    {p.name} <span className="text-xs text-slate-500">— {DEPARTMENT_LABELS[p.department]}</span>
                  </span>
                  <span className="text-slate-400">{formatCurrency(p.advanceBalance)}</span>
                </div>
                {p.payAmount > 0 && <AdvanceProgressBar balance={p.advanceBalance} monthlySalary={p.payAmount} showLabel={false} compact />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
