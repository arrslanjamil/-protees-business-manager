import { ArrowRight, FileBarChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'

interface ReportsSectionProps {
  periodGrandTotal: number
  periodTransactionCount: number
  unitPaymentCount: number
  salaryPaymentCount: number
  advanceCount: number
  expenseCount: number
}

export function ReportsSection({
  periodGrandTotal,
  periodTransactionCount,
  unitPaymentCount,
  salaryPaymentCount,
  advanceCount,
  expenseCount,
}: ReportsSectionProps) {
  return (
    <div className="card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Selected Period Summary</h3>
          <p className="mt-1 text-xs text-slate-500">Unit payments, salaries, advances, and unit expenses combined.</p>
        </div>
        <Link to="/reports" className="btn-secondary self-start sm:self-auto">
          <FileBarChart size={16} /> Open Full Reports <ArrowRight size={14} />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Grand Total" value={formatCurrency(periodGrandTotal)} icon={FileBarChart} accent="green" />
        <StatCard label="Transactions" value={String(periodTransactionCount)} icon={FileBarChart} accent="cyan" />
        <StatCard label="Unit Payments" value={String(unitPaymentCount)} icon={FileBarChart} accent="purple" />
        <StatCard label="Salary Payments" value={String(salaryPaymentCount)} icon={FileBarChart} accent="amber" />
        <StatCard label="Advances" value={String(advanceCount)} icon={FileBarChart} accent="red" hint={`${expenseCount} expenses`} />
      </div>
    </div>
  )
}
