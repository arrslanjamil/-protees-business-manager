import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from './ChartTooltip'

interface TrendPoint {
  label: string
  expenses: number
  salaries: number
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.expenses > 0 || d.salaries > 0)

  return (
    <div className="card">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Expenses vs Salaries</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="salaries" name="Salaries" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState icon={TrendingUp} title="No data in this period" description="Try a wider date range." />
      )}
    </div>
  )
}
