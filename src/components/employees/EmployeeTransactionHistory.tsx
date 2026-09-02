import { useMemo } from 'react'
import { Receipt } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TransactionRow {
  id: string
  date: string
  type: 'Advance' | 'Payment'
  amount: number
  note: string | null
}

export function EmployeeTransactionHistory({ employeeName }: { employeeName: string }) {
  const { advances, salaryPayments } = useData()

  const rows = useMemo<TransactionRow[]>(() => {
    const out: TransactionRow[] = []
    for (const a of advances) {
      if (a.employee_name === employeeName && a.department === 'cutting_department') {
        out.push({ id: `adv-${a.id}`, date: a.payment_date, type: 'Advance', amount: Number(a.amount), note: a.notes })
      }
    }
    for (const p of salaryPayments) {
      if (p.employee_name === employeeName) {
        out.push({ id: `sal-${p.id}`, date: p.payment_date, type: 'Payment', amount: Number(p.net_amount), note: p.notes })
      }
    }
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [advances, salaryPayments, employeeName])

  if (rows.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
        <Receipt size={18} className="mx-auto text-slate-600" />
        <p className="mx-auto text-sm text-slate-500">No transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Amount</th>
            <th className="px-4 py-2.5">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-2.5 text-slate-400">{formatDate(r.date)}</td>
              <td className="px-4 py-2.5">
                <Badge color={r.type === 'Advance' ? 'red' : 'green'}>{r.type}</Badge>
              </td>
              <td className={`px-4 py-2.5 font-medium ${r.type === 'Advance' ? 'text-neon-red' : 'text-neon-green'}`}>
                {r.type === 'Advance' ? '-' : '+'}
                {formatCurrency(r.amount)}
              </td>
              <td className="px-4 py-2.5 text-slate-500">{r.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
