import { formatCurrency } from '@/lib/utils'
import { advanceRiskPercent, riskColors, riskLevel } from '@/lib/utils'

interface ProgressBarProps {
  balance: number
  monthlySalary: number
  showLabel?: boolean
  compact?: boolean
}

export function AdvanceProgressBar({ balance, monthlySalary, showLabel = true, compact = false }: ProgressBarProps) {
  const percent = advanceRiskPercent(balance, monthlySalary)
  const level = riskLevel(percent)
  const colors = riskColors(level)
  const widthPercent = Math.min(100, percent)

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {balance > 0 ? `${formatCurrency(balance)} owed` : 'No outstanding advance'}
          </span>
          <span className={colors.text + ' font-semibold'}>{percent.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-base-900 ${compact ? 'h-1.5' : 'h-2.5'} border border-white/5`}>
        <div
          className={`h-full rounded-full ${colors.bar} ${colors.glow} transition-all duration-500 ease-out`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  )
}
