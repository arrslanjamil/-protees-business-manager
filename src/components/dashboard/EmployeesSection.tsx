import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HandCoins, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from './ChartTooltip'
import { formatCurrency } from '@/lib/utils'

interface EmployeesSectionProps {
  totalEmployees: number
  activeEmployees: number
  periodSalaryPaid: number
  periodAdvancesGiven: number
  outstandingAdvances: number
  trend: { label: string; net: number }[]
}

export function EmployeesSection({
  totalEmployees,
  activeEmployees,
  periodSalaryPaid,
  periodAdvancesGiven,
  outstandingAdvances,
  trend,
}: EmployeesSectionProps) {
  const hasTrendData = trend.some((t) => t.net > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Employees" value={String(totalEmployees)} icon={Users} accent="cyan" />
        <StatCard label="Active Employees" value={String(activeEmployees)} icon={UserCheck} accent="green" hint="Paid this period" />
        <StatCard label="Salary Paid" value={formatCurrency(periodSalaryPaid)} icon={Wallet} accent="purple" hint="Selected period" />
        <StatCard label="Advances Given" value={formatCurrency(periodAdvancesGiven)} icon={HandCoins} accent="amber" hint="Selected period" />
        <StatCard label="Outstanding Advances" value={formatCurrency(outstandingAdvances)} icon={TrendingUp} accent="red" hint="Live balance" />
      </div>
      <div className="card">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Salary Payments Trend</h3>
        {hasTrendData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="net" name="Net Salaries" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Wallet} title="No salary payments in this period" description="Try a wider date range." />
        )}
      </div>
    </div>
  )
}
