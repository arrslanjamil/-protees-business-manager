import { Banknote, HandCoins, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'

interface FinancialSummarySectionProps {
  currentMonthCost: number
  currentYearCost: number
  totalOutstandingAdvances: number
  khadimBalance: number
  periodExpenses: number
  periodPayroll: number
  periodAdvancesGiven: number
}

export function FinancialSummarySection({
  currentMonthCost,
  currentYearCost,
  totalOutstandingAdvances,
  khadimBalance,
  periodExpenses,
  periodPayroll,
  periodAdvancesGiven,
}: FinancialSummarySectionProps) {
  const totalOutflow = periodExpenses + periodPayroll + periodAdvancesGiven
  const netPosition = -totalOutflow

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current Month Cost" value={formatCurrency(currentMonthCost)} icon={TrendingUp} accent="cyan" />
        <StatCard label="Current Year Cost" value={formatCurrency(currentYearCost)} icon={TrendingUp} accent="purple" />
        <StatCard label="Total Outstanding Advances" value={formatCurrency(totalOutstandingAdvances)} icon={HandCoins} accent="amber" />
        <StatCard
          label="Khadim Hussain Balance"
          value={formatCurrency(khadimBalance)}
          icon={Banknote}
          accent={khadimBalance === 0 ? 'green' : 'amber'}
          hint={khadimBalance === 0 ? '✅ Account Cleared' : undefined}
        />
      </div>

      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Financial Overview — Selected Period</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Income" value={formatCurrency(0)} icon={TrendingUp} accent="green" hint="No income source tracked yet" />
          <StatCard label="Total Expenses" value={formatCurrency(periodExpenses)} icon={Wallet} accent="red" />
          <StatCard label="Total Salary Paid" value={formatCurrency(periodPayroll)} icon={Banknote} accent="cyan" hint="Employees + Protees Unit" />
          <StatCard label="Total Advances" value={formatCurrency(periodAdvancesGiven)} icon={HandCoins} accent="amber" />
          <StatCard
            label="Net Position"
            value={formatCurrency(netPosition)}
            icon={netPosition < 0 ? TrendingDown : Scale}
            accent={netPosition < 0 ? 'red' : 'green'}
            hint="Income − (expenses + salary + advances)"
          />
        </div>
      </div>
    </div>
  )
}
