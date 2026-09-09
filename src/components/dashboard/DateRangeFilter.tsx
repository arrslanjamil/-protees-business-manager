import { Calendar } from 'lucide-react'
import { DASHBOARD_DATE_PRESET_LABELS, formatDate, classNames, type DashboardDatePreset } from '@/lib/utils'

const PRESET_ORDER: DashboardDatePreset[] = ['today', 'yesterday', '15d', 'monthly', '6m', 'annually', 'custom']

interface DateRangeFilterProps {
  preset: DashboardDatePreset
  onPresetChange: (preset: DashboardDatePreset) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
  rangeStart: string
  rangeEnd: string
}

export function DateRangeFilter({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  rangeStart,
  rangeEnd,
}: DateRangeFilterProps) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_ORDER.map((key) => (
          <button
            key={key}
            onClick={() => onPresetChange(key)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              preset === key
                ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {DASHBOARD_DATE_PRESET_LABELS[key]}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input-field" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)} />
            <span className="text-slate-500">to</span>
            <input type="date" className="input-field" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} />
          </div>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar size={12} />
        Showing {formatDate(rangeStart)} – {formatDate(rangeEnd)}
      </p>
    </div>
  )
}
