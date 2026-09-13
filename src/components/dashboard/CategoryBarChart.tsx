import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/context/ThemeContext'
import { ChartTooltip } from './ChartTooltip'

const BAR_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#e879f9']

interface CategoryBarChartProps {
  data: [category: string, amount: number][]
  color?: string
}

/** Horizontal bar chart for category breakdowns (e.g. Expenses by
 * Category) — reads better than a plain grid when amounts vary widely
 * across categories. Expects data already sorted descending. */
export function CategoryBarChart({ data, color }: CategoryBarChartProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const gridStroke = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'
  const axisLineStroke = isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.1)'
  const labelColor = isLight ? '#475569' : '#94a3b8'
  const axisTick = { fill: labelColor, fontSize: 12 }

  const chartData = data.map(([name, amount]) => ({ name, amount }))
  const height = Math.max(120, chartData.length * 40)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
        <XAxis type="number" tick={axisTick} axisLine={{ stroke: axisLineStroke }} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={entry.name} fill={color ?? BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
