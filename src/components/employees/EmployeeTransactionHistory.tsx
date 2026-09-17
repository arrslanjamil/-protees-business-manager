import { useMemo } from 'react'
import { Receipt } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TransactionRow {
  id: string
  date: string
  type: 'Advance' | 'Salary Payment' | 'Increment'
  amount: number
  note: string | null
  addedBy: string | null
  paymentMethod: string | null
}

export function EmployeeTransactionHistory({ employeeId, employeeName }: { employeeId: number; employeeName: string }) {
  const { advances, salaryPayments, salaryIncrements } = useData()

  const rows = useMemo<TransactionRow[]>(() => {
    const out: TransactionRow[] = []
    for (const a of advances) {
      if (a.employee_name === employeeName && a.department === 'cutting_department') {
        out.push({
          id: `adv-${a.id}`,
          date: a.payment_date,
          type: 'Advance',
          amount: Number(a.amount),
          note: a.notes,
          addedBy: a.created_by_username,
          paymentMethod: a.payment_method,
        })
      }
    }
    for (const p of salaryPayments) {
      if (p.employee_name === employeeName) {
        out.push({
          id: `sal-${p.id}`,
          date: p.payment_date,
          type: 'Salary Payment',
          amount: Number(p.net_amount),
          note: p.notes,
          addedBy: p.created_by_username,
          paymentMethod: p.payment_method,
        })
      }
    }
    for (const inc of salaryIncrements) {
      if (inc.employee_id === employeeId) {
        out.push({
          id: `inc-${inc.id}`,
          date: inc.increment_date,
          type: 'Increment',
          amount: Number(inc.increment_amount),
          note: inc.notes,
          addedBy: inc.created_by_username,
          paymentMethod: null,
        })
      }
    }
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [advances, salaryPayments, salaryIncrements, employeeId, employeeName])

  if (rows.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
        <Receipt size={18} className="mx-auto text-slate-600" />
        <p className="mx-auto text-sm text-slate-500">No transactions yet.</p>
      </div>
    )
  }

  const accent: Record<TransactionRow['type'], { border: string; text: string; badge: 'red' | 'green' | 'cyan'; sign: string }> = {
    Advance: { border: 'border-l-neon-red/60', text: 'text-neon-red', badge: 'red', sign: '-' },
    'Salary Payment': { border: 'border-l-neon-green/60', text: 'text-neon-green', badge: 'green', sign: '+' },
    Increment: { border: 'border-l-neon-cyan/60', text: 'text-neon-cyan', badge: 'cyan', sign: '+' },
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const a = accent[r.type]
        return (
          <div key={r.id} className={`rounded-xl border-l-4 bg-white/[0.02] p-3.5 ${a.border}`}>
            <div className="flex items-center justify-between gap-2">
              <Badge color={a.badge}>{r.type}</Badge>
              <span className={`font-display text-sm font-bold ${a.text}`}>
                {a.sign}
                {formatCurrency(r.amount)}
              </span>
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-slate-400">
              <p>
                <span className="text-slate-500">Added By:</span> <span className="text-slate-300">{r.addedBy ?? '—'}</span>
              </p>
              {r.paymentMethod && (
                <p>
                  <span className="text-slate-500">Method:</span> <span className="text-slate-300">{r.paymentMethod}</span>
                </p>
              )}
              <p>
                <span className="text-slate-500">Date:</span> <span className="text-slate-300">{formatDate(r.date)}</span>
              </p>
              {r.note && (
                <p>
                  <span className="text-slate-500">Note:</span> <span className="text-slate-300">{r.note}</span>
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
