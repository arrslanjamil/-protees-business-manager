import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTheme } from '@/context/ThemeContext'
import { classNames } from '@/lib/utils'
import { ChartTooltip } from './ChartTooltip'

interface TrendPoint {
  label: string
  expenses: number
  salaries: number
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const [view, setView] = useState<'line' | 'bar'>('line')
  const { theme } = useTheme()
  const hasData = data.some((d) => d.expenses > 0 || d.salaries > 0)

  // Recharts renders raw SVG and needs literal colors — CSS variables/classes
  // don't reach it, so the grid/axis/legend colors flip here in JS.
  const isLight = theme === 'light'
  const gridStroke = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'
  const axisLineStroke = isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.1)'
  const labelColor = isLight ? '#475569' : '#94a3b8'
  const axisTick = { fill: labelColor, fontSize: 11 }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Expenses vs Salaries</h3>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-base-900/60 p-0.5">
          {(['line', 'bar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={classNames(
                'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition',
                view === v ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          {view === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: axisLineStroke }} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: labelColor }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="salaries" name="Salaries" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: axisLineStroke }} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: labelColor }} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="salaries" name="Salaries" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (
        <EmptyState icon={TrendingUp} title="No data in this period" description="Try a wider date range." />
      )}
    </div>
  )
}
