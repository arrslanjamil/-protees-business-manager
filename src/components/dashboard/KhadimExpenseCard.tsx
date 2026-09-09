import { formatCurrency } from '@/lib/utils'

export function KhadimExpenseCard({ amount }: { amount: number }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Khadim Sahib Expenses</p>
      <p className="mt-1.5 font-display text-2xl font-bold text-white">{formatCurrency(amount)}</p>
      <p className="mt-1 text-xs text-slate-500">Auto-classified from expense titles, categories, and notes mentioning "Khadim".</p>
    </div>
  )
}
