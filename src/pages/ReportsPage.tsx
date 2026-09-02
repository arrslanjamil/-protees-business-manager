import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { DEPARTMENT_LABELS, KHADIM_TYPE_LABELS } from '@/lib/types'
import { classNames, formatCurrency, formatDate, isWithinRange, presetDateRange, todayISO, type DateRangePreset } from '@/lib/utils'

interface ReportRow {
  date: string
  type: string
  context: string
  name: string
  amount: number
  notes: string
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
  { key: 'custom', label: 'Custom' },
]

export function ReportsPage() {
  const { unitPayments, salaryPayments, advances, expenses, khadimTransactions, khadimTotals } = useData()
  const [preset, setPreset] = useState<DateRangePreset>('month')
  const [customStart, setCustomStart] = useState(todayISO())
  const [customEnd, setCustomEnd] = useState(todayISO())

  const { start, end } = useMemo(() => presetDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const rows = useMemo<ReportRow[]>(() => {
    const out: ReportRow[] = []
    for (const p of unitPayments) {
      if (!isWithinRange(p.payment_date, start, end)) continue
      out.push({
        date: p.payment_date,
        type: 'Unit Payment',
        context: 'Protees Unit',
        name: p.supervisor_name,
        amount: Number(p.net_amount),
        notes: p.notes ?? '',
      })
    }
    for (const p of salaryPayments) {
      if (!isWithinRange(p.payment_date, start, end)) continue
      out.push({
        date: p.payment_date,
        type: 'Salary',
        context: DEPARTMENT_LABELS.cutting_department,
        name: p.employee_name,
        amount: Number(p.net_amount),
        notes: p.notes ?? '',
      })
    }
    for (const a of advances) {
      if (!isWithinRange(a.payment_date, start, end)) continue
      out.push({
        date: a.payment_date,
        type: 'Advance',
        context: DEPARTMENT_LABELS[a.department],
        name: a.employee_name,
        amount: Number(a.amount),
        notes: a.notes ?? '',
      })
    }
    for (const e of expenses) {
      if (!isWithinRange(e.date, start, end)) continue
      out.push({
        date: e.date,
        type: 'Unit Expense',
        context: e.category,
        name: e.title,
        amount: Number(e.amount),
        notes: e.notes ?? '',
      })
    }
    for (const t of khadimTransactions) {
      if (!isWithinRange(t.date, start, end)) continue
      out.push({
        date: t.date,
        type: KHADIM_TYPE_LABELS[t.type],
        context: 'Khadim Hussain Account',
        name: 'Khadim Hussain',
        amount: Number(t.amount),
        notes: t.description ?? t.notes ?? '',
      })
    }
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [unitPayments, salaryPayments, advances, expenses, khadimTransactions, start, end])

  const totals = useMemo(() => {
    const byType = new Map<string, number>()
    for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + r.amount)
    return byType
  }, [rows])

  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0)

  const khadimPeriodStats = useMemo(() => {
    let totalGiven = 0
    let totalBills = 0
    let count = 0
    for (const t of khadimTransactions) {
      if (!isWithinRange(t.date, start, end)) continue
      count += 1
      if (t.type === 'payment_given') totalGiven += Number(t.amount)
      else totalBills += Number(t.amount)
    }
    return { totalGiven, totalBills, count }
  }, [khadimTransactions, start, end])

  // Fully dynamic — groups by whatever category string each expense has, so
  // custom categories added via "+ Add New Category" show up automatically.
  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const e of expenses) {
      if (!isWithinRange(e.date, start, end)) continue
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount))
    }
    return Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  }, [expenses, start, end])

  async function exportPdf() {
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const autoTable = autoTableModule.default
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Protees Business Manager — Report', 14, 16)
    doc.setFontSize(10)
    doc.text(`Period: ${formatDate(start)} – ${formatDate(end)}`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Type', 'Context', 'Name', 'Amount', 'Notes']],
      body: rows.map((r) => [formatDate(r.date), r.type, r.context, r.name, formatCurrency(r.amount), r.notes]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 211, 238] },
      foot: [['', '', '', 'Grand Total', formatCurrency(grandTotal), '']],
    })
    doc.save(`protees-report-${start}-to-${end}.pdf`)
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Date: r.date,
        Type: r.type,
        Context: r.context,
        Name: r.name,
        Amount: r.amount,
        Notes: r.notes,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
    XLSX.writeFile(workbook, `protees-report-${start}-to-${end}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Unit payments, salaries, advances, and unit expenses in one ledger.</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={classNames(
                'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
                preset === p.key
                  ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                  : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
              )}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input-field" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-slate-500">to</span>
              <input type="date" className="input-field" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary" onClick={exportPdf} disabled={rows.length === 0}>
              <FileText size={16} /> Export PDF
            </button>
            <button className="btn-secondary" onClick={exportExcel} disabled={rows.length === 0}>
              <FileSpreadsheet size={16} /> Export Excel
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {formatDate(start)} – {formatDate(end)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Unit Payments</p>
          <p className="mt-2 font-display text-lg font-bold text-white">{formatCurrency(totals.get('Unit Payment') ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Salaries</p>
          <p className="mt-2 font-display text-lg font-bold text-white">{formatCurrency(totals.get('Salary') ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Advances</p>
          <p className="mt-2 font-display text-lg font-bold text-neon-amber">{formatCurrency(totals.get('Advance') ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Unit Expenses</p>
          <p className="mt-2 font-display text-lg font-bold text-neon-red">{formatCurrency(totals.get('Unit Expense') ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Grand Total</p>
          <p className="mt-2 font-display text-lg font-bold text-neon-green">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Khadim Hussain Account</h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Payments Given</p>
            <p className="mt-2 font-display text-lg font-bold text-neon-green">{formatCurrency(khadimPeriodStats.totalGiven)}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Bills Submitted</p>
            <p className="mt-2 font-display text-lg font-bold text-neon-red">{formatCurrency(khadimPeriodStats.totalBills)}</p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-slate-400">Current Outstanding Balance</p>
            <p className={`mt-2 font-display text-lg font-bold ${khadimTotals.balance === 0 ? 'text-neon-green' : 'text-neon-amber'}`}>
              {khadimTotals.balance === 0 ? '✅ Cleared' : formatCurrency(khadimTotals.balance)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-slate-400">Number of Transactions</p>
            <p className="mt-2 font-display text-lg font-bold text-white">{khadimPeriodStats.count}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Payments/bills/transaction count are for the selected period; Outstanding Balance is the account's live running balance.</p>
      </div>

      {expensesByCategory.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Unit Expenses by Category</h2>
          <div className="card grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
            {expensesByCategory.map(([cat, total]) => (
              <div key={cat} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-400">{cat}</span>
                <span className="shrink-0 font-display font-semibold text-neon-red">{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Download className="text-slate-600" size={28} />
          <p className="text-sm text-slate-400">No records in this period.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Context</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(r.date)}</td>
                  <td className="px-5 py-3.5 text-slate-300">{r.type}</td>
                  <td className="px-5 py-3.5 text-slate-400">{r.context}</td>
                  <td className="px-5 py-3.5 font-medium text-white">{r.name}</td>
                  <td className="px-5 py-3.5 text-slate-200">{formatCurrency(r.amount)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
