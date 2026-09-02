import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, Calculator, Receipt, Zap } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from './ChartTooltip'
import { formatCurrency } from '@/lib/utils'

interface SalarySectionProps {
  periodNetPaid: number
  periodOvertime: number
  periodPaymentCount: number
  periodAveragePayment: number
  composition: { label: string; value: number; fill: string }[]
}

export function SalarySection({ periodNetPaid, periodOvertime, periodPaymentCount, periodAveragePayment, composition }: SalarySectionProps) {
  const hasComposition = composition.some((c) => c.value > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net Salary Paid" value={formatCurrency(periodNetPaid)} icon={Banknote} accent="cyan" hint="Selected period" />
        <StatCard label="Overtime Paid" value={formatCurrency(periodOvertime)} icon={Zap} accent="amber" hint="Selected period" />
        <StatCard label="Payments Made" value={String(periodPaymentCount)} icon={Receipt} accent="purple" hint="Selected period" />
        <StatCard label="Average Payment" value={formatCurrency(periodAveragePayment)} icon={Calculator} accent="green" />
      </div>
      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Payment Composition — Selected Period</h3>
        {hasComposition ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={composition} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                {composition.map((c) => (
                  <Cell key={c.label} fill={c.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Banknote} title="No salary payments in this period" description="Try a wider date range." />
        )}
      </div>
    </div>
  )
}
