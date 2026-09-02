import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HandCoins, TrendingUp, Wallet, Zap } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from './ChartTooltip'
import { formatCurrency } from '@/lib/utils'

interface ProteesUnitSectionProps {
  periodUnitPayments: number
  periodUnitAdvances: number
  outstandingUnitBalance: number
  periodOvertimePaid: number
  trend: { label: string; net: number }[]
}

export function ProteesUnitSection({
  periodUnitPayments,
  periodUnitAdvances,
  outstandingUnitBalance,
  periodOvertimePaid,
  trend,
}: ProteesUnitSectionProps) {
  const hasTrendData = trend.some((t) => t.net > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unit Payments" value={formatCurrency(periodUnitPayments)} icon={Wallet} accent="purple" hint="Selected period" />
        <StatCard label="Unit Advances" value={formatCurrency(periodUnitAdvances)} icon={HandCoins} accent="amber" hint="Selected period" />
        <StatCard label="Outstanding Balance" value={formatCurrency(outstandingUnitBalance)} icon={TrendingUp} accent="red" hint="Live balance" />
        <StatCard label="Overtime Paid" value={formatCurrency(periodOvertimePaid)} icon={Zap} accent="cyan" hint="Selected period" />
      </div>
      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Unit Payments Trend</h3>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="net" name="Net Payments" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Wallet} title="No unit payments in this period" description="Try a wider date range." />
        )}
      </div>
    </div>
  )
}
