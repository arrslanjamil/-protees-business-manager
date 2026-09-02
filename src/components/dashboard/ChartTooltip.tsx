import { formatCurrency } from '@/lib/utils'

export function ChartTooltip({ active, payload, label }: any) {
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
