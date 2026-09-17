import { useMemo } from 'react'
import { useData } from '@/context/DataContext'
import { INCREMENT_TYPE_LABELS, type Employee } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TimelineEntry {
  id: string
  date: string | null
  label: string
  previousSalary: number | null
  amount: number | null
  newSalary: number
  detail: string | null
  addedBy: string | null
  notes: string | null
}

/** Salary-only history — Joined Salary plus every increment since, oldest
 * first, as a connected vertical timeline. Distinct from the general
 * Transaction History (advances/salary payments/increments mixed) shown
 * elsewhere on the card — this one answers "how did their salary get to
 * what it is today", nothing else. */
export function SalaryHistoryTimeline({ employee }: { employee: Employee }) {
  const { salaryIncrements } = useData()

  const entries = useMemo<TimelineEntry[]>(() => {
    const increments = salaryIncrements
      .filter((i) => i.employee_id === employee.id)
      .sort((a, b) => new Date(a.increment_date).getTime() - new Date(b.increment_date).getTime())

    const out: TimelineEntry[] = [
      {
        id: 'joined',
        date: employee.join_date,
        label: 'Joined Salary',
        previousSalary: null,
        amount: null,
        newSalary: Number(employee.starting_salary),
        detail: null,
        addedBy: null,
        notes: null,
      },
    ]
    increments.forEach((inc, idx) => {
      out.push({
        id: `inc-${inc.id}`,
        date: inc.increment_date,
        label: `Increment #${idx + 1}`,
        previousSalary: Number(inc.previous_salary),
        amount: Number(inc.increment_amount),
        newSalary: Number(inc.new_salary),
        detail:
          inc.increment_type === 'percentage'
            ? `${INCREMENT_TYPE_LABELS.percentage} · ${inc.increment_value}%`
            : INCREMENT_TYPE_LABELS.fixed,
        addedBy: inc.created_by_username,
        notes: inc.notes,
      })
    })
    return out
  }, [salaryIncrements, employee])

  return (
    <div className="mt-4 space-y-0">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1
        return (
          <div key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span className="absolute left-[7px] top-4 h-full w-px bg-white/10" />}
            <span
              className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                entry.id === 'joined' ? 'border-neon-cyan bg-neon-cyan/20' : 'border-neon-green bg-neon-green/20'
              }`}
            />
            <div className="min-w-0 flex-1 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{entry.label}</p>
                {entry.date && <p className="text-xs text-slate-500">{formatDate(entry.date)}</p>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                {entry.previousSalary != null && (
                  <span>
                    Previous Salary: <span className="font-medium text-slate-300">{formatCurrency(entry.previousSalary)}</span>
                  </span>
                )}
                {entry.amount != null && (
                  <span>
                    Increment: <span className="font-medium text-neon-green">+{formatCurrency(entry.amount)}</span>
                    {entry.detail && <span className="text-slate-500"> ({entry.detail})</span>}
                  </span>
                )}
                <span>
                  New Salary: <span className="font-medium text-white">{formatCurrency(entry.newSalary)}</span>
                </span>
                {entry.addedBy && <span>Applied By: {entry.addedBy}</span>}
              </div>
              {entry.notes && <p className="mt-1 text-xs text-slate-500">{entry.notes}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
