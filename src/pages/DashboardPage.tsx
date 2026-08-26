import { useMemo } from 'react'
import { HandCoins, Receipt, Users, Wallet } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '@/context/DataContext'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { MONTH_NAMES } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const PIE_COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#38bdf8']

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-base-850/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur">
      {label && <p className="mb-1 font-medium text-slate-300">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { employeesWithBalance, expenses, salaryPayments, advances } = useData()

  const activeEmployees = employeesWithBalance.filter((e) => e.status === 'active')
  const totalPayroll = activeEmployees.reduce((sum, e) => sum + Number(e.monthly_salary), 0)
  const totalOutstanding = employeesWithBalance.reduce((sum, e) => sum + Math.max(0, e.advanceBalance), 0)

  const now = new Date()
  const expensesThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const advanceVsSalaryData = useMemo(
    () =>
      employeesWithBalance
        .filter((e) => e.advanceBalance > 0 || e.monthly_salary > 0)
        .sort((a, b) => b.advanceBalance - a.advanceBalance)
        .slice(0, 8)
        .map((e) => ({
          name: e.name.length > 12 ? e.name.slice(0, 11) + '…' : e.name,
          Salary: Number(e.monthly_salary),
          Advance: Math.max(0, e.advanceBalance),
        })),
    [employeesWithBalance]
  )

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount))
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [expenses])

  const payrollTrend = useMemo(() => {
    const months: { key: string; label: string; net: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: MONTH_NAMES[d.getMonth()].slice(0, 3), net: 0 })
    }
    for (const p of salaryPayments) {
      const key = `${p.year}-${p.month}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket.net += Number(p.net_amount)
    }
    return months
  }, [salaryPayments, now])

  const riskiest = employeesWithBalance
    .filter((e) => e.advanceBalance > 0)
    .sort((a, b) => b.advanceBalance - a.advanceBalance)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">A live overview of your business.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Employees" value={String(activeEmployees.length)} icon={Users} accent="cyan" hint={`${employeesWithBalance.length} total`} />
        <StatCard label="Monthly Payroll" value={formatCurrency(totalPayroll)} icon={Wallet} accent="purple" />
        <StatCard label="Outstanding Advances" value={formatCurrency(totalOutstanding)} icon={HandCoins} accent="amber" hint={`${advances.length} advances given`} />
        <StatCard label="Expenses This Month" value={formatCurrency(expensesThisMonth)} icon={Receipt} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Advance vs Salary</h2>
          {advanceVsSalaryData.length === 0 ? (
            <EmptyState icon={HandCoins} title="No data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={advanceVsSalaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Salary" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Advance" fill="#f87171" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Expenses by Category</h2>
          {expenseByCategory.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {expenseByCategory.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="rgba(10,14,23,0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Net Payroll — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="net" name="Net Paid" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Highest Advance Risk</h2>
          {riskiest.length === 0 ? (
            <EmptyState icon={HandCoins} title="No outstanding advances" description="Everyone is settled up." />
          ) : (
            <div className="space-y-4">
              {riskiest.map((e) => (
                <div key={e.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{e.name}</span>
                    <span className="text-slate-400">{formatCurrency(e.advanceBalance)}</span>
                  </div>
                  <AdvanceProgressBar balance={e.advanceBalance} monthlySalary={e.monthly_salary} showLabel={false} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
