import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PieChart as PieChartIcon, Receipt, Tags, TrendingUp, Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from './ChartTooltip'
import { formatCurrency } from '@/lib/utils'

interface CategorySlice {
  name: string
  value: number
  fill: string
}

interface MonthlyExpensePoint {
  label: string
  total: number
}

interface ExpensesSectionProps {
  periodTotalExpenses: number
  categoryCount: number
  topCategory: CategorySlice | null
  categoryBreakdown: CategorySlice[]
  monthlyTrend: MonthlyExpensePoint[]
}

export function ExpensesSection({ periodTotalExpenses, categoryCount, topCategory, categoryBreakdown, monthlyTrend }: ExpensesSectionProps) {
  const topFive = categoryBreakdown.slice(0, 5)
  const hasCategoryData = categoryBreakdown.length > 0
  const hasTrendData = monthlyTrend.some((m) => m.total > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Expenses" value={formatCurrency(periodTotalExpenses)} icon={Wallet} accent="red" hint="Selected period" />
        <StatCard label="Categories Used" value={String(categoryCount)} icon={Tags} accent="cyan" hint="Selected period" />
        <StatCard label="Top Category" value={topCategory ? topCategory.name : '—'} icon={PieChartIcon} accent="purple" hint={topCategory ? formatCurrency(topCategory.value) : undefined} />
        <StatCard label="Records" value={String(categoryBreakdown.length > 0 ? categoryBreakdown.length : 0)} icon={Receipt} accent="amber" hint="Distinct categories" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Category-wise Expenses</h3>
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {categoryBreakdown.map((c) => (
                    <Cell key={c.name} fill={c.fill} stroke="rgba(5,7,13,0.6)" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={PieChartIcon} title="No expenses in this period" description="Try a wider date range." />
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Highest Spending Categories</h3>
          {topFive.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topFive} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                  {topFive.map((c) => (
                    <Cell key={c.name} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Receipt} title="No expenses in this period" description="Try a wider date range." />
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Monthly Expense Trend</h3>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="total" name="Monthly Expenses" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3, fill: '#f87171' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} title="No expense trend to show" description="Try a wider date range." />
        )}
      </div>
    </div>
  )
}
