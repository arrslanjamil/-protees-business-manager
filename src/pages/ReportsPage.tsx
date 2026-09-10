import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { DEPARTMENT_LABELS, EMPLOYEE_TYPE_LABELS, EXPENSE_SCOPE_LABELS, KHADIM_TYPE_LABELS } from '@/lib/types'
import { exportReportExcel, exportReportPdf } from '@/lib/reportExport'
import { classNames, formatCurrency, formatDate, isWithinRange, presetDateRange, todayISO, type DateRangePreset } from '@/lib/utils'

type ReportView = 'overview' | 'unit-cost' | 'unit-payroll' | 'unit-expenses' | 'zakat' | 'advances'

const REPORT_VIEWS: { key: ReportView; label: string; periodScoped: boolean }[] = [
  { key: 'overview', label: 'Overview', periodScoped: true },
  { key: 'unit-cost', label: 'Unit Cost Summary', periodScoped: true },
  { key: 'unit-payroll', label: 'Unit Payroll', periodScoped: true },
  { key: 'unit-expenses', label: 'Unit Expenses', periodScoped: true },
  { key: 'zakat', label: 'Zakat Distribution', periodScoped: true },
  { key: 'advances', label: 'Outstanding Advances', periodScoped: false },
]

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
  { key: 'custom', label: 'Custom' },
]

interface ReportRow {
  date: string
  type: string
  context: string
  name: string
  amount: number
  notes: string
}

function SummaryCard({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={classNames('mt-2 font-display text-lg font-bold', tone)}>{value}</p>
    </div>
  )
}

export function ReportsPage() {
  const {
    unitPayments,
    salaryPayments,
    advances,
    expenses,
    khadimTransactions,
    khadimTotals,
    zakatTransactions,
    zakatSettings,
    employeesWithBalance,
    supervisorsWithBalance,
  } = useData()

  const [view, setView] = useState<ReportView>('overview')
  const [preset, setPreset] = useState<DateRangePreset>('month')
  const [customStart, setCustomStart] = useState(todayISO())
  const [customEnd, setCustomEnd] = useState(todayISO())

  const { start, end } = useMemo(() => presetDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])
  const activeView = REPORT_VIEWS.find((v) => v.key === view)!

  // =========================================================================
  // Overview — combined ledger (unchanged from before)
  // =========================================================================
  const overviewRows = useMemo<ReportRow[]>(() => {
    const out: ReportRow[] = []
    for (const p of unitPayments) {
      if (!isWithinRange(p.payment_date, start, end)) continue
      out.push({ date: p.payment_date, type: 'Unit Payment', context: 'Protees Unit', name: p.supervisor_name, amount: Number(p.net_amount), notes: p.notes ?? '' })
    }
    for (const p of salaryPayments) {
      if (!isWithinRange(p.payment_date, start, end)) continue
      out.push({ date: p.payment_date, type: 'Salary', context: DEPARTMENT_LABELS.cutting_department, name: p.employee_name, amount: Number(p.net_amount), notes: p.notes ?? '' })
    }
    for (const a of advances) {
      if (!isWithinRange(a.payment_date, start, end)) continue
      out.push({ date: a.payment_date, type: 'Advance', context: DEPARTMENT_LABELS[a.department], name: a.employee_name, amount: Number(a.amount), notes: a.notes ?? '' })
    }
    for (const e of expenses) {
      if (!isWithinRange(e.date, start, end)) continue
      out.push({ date: e.date, type: EXPENSE_SCOPE_LABELS[e.expense_scope], context: e.category, name: e.title, amount: Number(e.amount), notes: e.notes ?? '' })
    }
    for (const t of khadimTransactions) {
      if (!isWithinRange(t.date, start, end)) continue
      out.push({ date: t.date, type: KHADIM_TYPE_LABELS[t.type], context: 'Khadim Hussain Account', name: 'Khadim Hussain', amount: Number(t.amount), notes: t.description ?? t.notes ?? '' })
    }
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [unitPayments, salaryPayments, advances, expenses, khadimTransactions, start, end])

  const overviewTotals = useMemo(() => {
    const byType = new Map<string, number>()
    for (const r of overviewRows) byType.set(r.type, (byType.get(r.type) ?? 0) + r.amount)
    return byType
  }, [overviewRows])
  const overviewGrandTotal = overviewRows.reduce((sum, r) => sum + r.amount, 0)

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

  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const e of expenses) {
      if (!isWithinRange(e.date, start, end)) continue
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount))
    }
    return Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  }, [expenses, start, end])

  async function exportOverview(format: 'pdf' | 'excel') {
    const filenameBase = `protees-overview-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Protees Business Manager — Overview Report',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Date', 'Type', 'Context', 'Name', 'Amount', 'Notes'],
        rows: overviewRows.map((r) => [formatDate(r.date), r.type, r.context, r.name, formatCurrency(r.amount), r.notes]),
        footer: ['', '', '', 'Grand Total', formatCurrency(overviewGrandTotal), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: overviewRows.map((r) => ({ Date: r.date, Type: r.type, Context: r.context, Name: r.name, Amount: r.amount, Notes: r.notes })),
        sheetName: 'Overview',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Unit Cost Summary — unit advances + unit payments + unit expenses
  // =========================================================================
  const unitAdvancesInPeriod = useMemo(
    () => advances.filter((a) => a.department === 'protees_unit' && isWithinRange(a.payment_date, start, end)),
    [advances, start, end]
  )
  const unitPaymentsInPeriod = useMemo(() => unitPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [unitPayments, start, end])
  const unitExpensesInPeriod = useMemo(
    () => expenses.filter((e) => e.expense_scope === 'unit' && isWithinRange(e.date, start, end)),
    [expenses, start, end]
  )

  const unitCostSummary = useMemo(() => {
    const totalAdvancesGiven = unitAdvancesInPeriod.reduce((s, a) => s + Number(a.amount), 0)
    const totalPaymentsMade = unitPaymentsInPeriod.reduce((s, p) => s + Number(p.net_amount), 0)
    const totalUnitExpenses = unitExpensesInPeriod.reduce((s, e) => s + Number(e.amount), 0)
    return { totalAdvancesGiven, totalPaymentsMade, totalUnitExpenses, totalUnitCost: totalPaymentsMade + totalUnitExpenses }
  }, [unitAdvancesInPeriod, unitPaymentsInPeriod, unitExpensesInPeriod])

  const unitCostRows = useMemo<ReportRow[]>(() => {
    const out: ReportRow[] = []
    for (const a of unitAdvancesInPeriod) out.push({ date: a.payment_date, type: 'Advance', context: 'Protees Unit', name: a.employee_name, amount: Number(a.amount), notes: a.notes ?? '' })
    for (const p of unitPaymentsInPeriod) out.push({ date: p.payment_date, type: 'Payment', context: 'Protees Unit', name: p.supervisor_name, amount: Number(p.net_amount), notes: p.notes ?? '' })
    for (const e of unitExpensesInPeriod) out.push({ date: e.date, type: 'Unit Expense', context: e.category, name: e.title, amount: Number(e.amount), notes: e.notes ?? '' })
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [unitAdvancesInPeriod, unitPaymentsInPeriod, unitExpensesInPeriod])

  async function exportUnitCost(format: 'pdf' | 'excel') {
    const filenameBase = `protees-unit-cost-summary-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Unit Cost Summary',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}  ·  Total Unit Cost: ${formatCurrency(unitCostSummary.totalUnitCost)}`,
        head: ['Date', 'Type', 'Context', 'Name', 'Amount', 'Notes'],
        rows: unitCostRows.map((r) => [formatDate(r.date), r.type, r.context, r.name, formatCurrency(r.amount), r.notes]),
        footer: ['', '', '', 'Total Unit Cost', formatCurrency(unitCostSummary.totalUnitCost), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: unitCostRows.map((r) => ({ Date: r.date, Type: r.type, Context: r.context, Name: r.name, Amount: r.amount, Notes: r.notes })),
        sheetName: 'Unit Cost Summary',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Unit Payroll — salary_payments for employee_group='unit'
  // =========================================================================
  const unitPayrollRows = useMemo(() => {
    return salaryPayments
      .filter((p) => isWithinRange(p.payment_date, start, end) && employeesWithBalance.find((e) => e.name === p.employee_name)?.employee_group === 'unit')
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  }, [salaryPayments, employeesWithBalance, start, end])
  const unitPayrollTotal = unitPayrollRows.reduce((s, p) => s + Number(p.net_amount), 0)

  async function exportUnitPayroll(format: 'pdf' | 'excel') {
    const filenameBase = `protees-unit-payroll-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Unit Payroll',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Date', 'Employee', 'Type', 'Amount', 'Notes'],
        rows: unitPayrollRows.map((p) => [
          formatDate(p.payment_date),
          p.employee_name,
          EMPLOYEE_TYPE_LABELS[employeesWithBalance.find((e) => e.name === p.employee_name)?.employee_type ?? 'monthly'],
          formatCurrency(p.net_amount),
          p.notes ?? '',
        ]),
        footer: ['', '', 'Total', formatCurrency(unitPayrollTotal), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: unitPayrollRows.map((p) => ({ Date: p.payment_date, Employee: p.employee_name, Amount: p.net_amount, Notes: p.notes ?? '' })),
        sheetName: 'Unit Payroll',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Unit Expenses
  // =========================================================================
  const unitExpensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const e of unitExpensesInPeriod) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount))
    return Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  }, [unitExpensesInPeriod])
  const unitExpensesTotal = unitExpensesInPeriod.reduce((s, e) => s + Number(e.amount), 0)

  async function exportUnitExpenses(format: 'pdf' | 'excel') {
    const filenameBase = `protees-unit-expenses-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Unit Expenses',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Date', 'Title', 'Category', 'Amount', 'Notes'],
        rows: unitExpensesInPeriod.map((e) => [formatDate(e.date), e.title, e.category, formatCurrency(e.amount), e.notes ?? '']),
        footer: ['', '', 'Total', formatCurrency(unitExpensesTotal), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: unitExpensesInPeriod.map((e) => ({ Date: e.date, Title: e.title, Category: e.category, Amount: e.amount, Notes: e.notes ?? '' })),
        sheetName: 'Unit Expenses',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Zakat Distribution
  // =========================================================================
  const zakatRowsInPeriod = useMemo(
    () => zakatTransactions.filter((t) => isWithinRange(t.date, start, end)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [zakatTransactions, start, end]
  )
  const zakatDistributedInPeriod = zakatRowsInPeriod.reduce((s, t) => s + Number(t.amount), 0)
  const zakatMonthlyBudget = zakatSettings?.monthly_budget ?? 100_000

  async function exportZakat(format: 'pdf' | 'excel') {
    const filenameBase = `protees-zakat-distribution-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Zakat Distribution',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}  ·  Monthly Budget: ${formatCurrency(zakatMonthlyBudget)}`,
        head: ['Date', 'Recipient', 'Amount', 'Notes'],
        rows: zakatRowsInPeriod.map((t) => [formatDate(t.date), t.recipient_name, formatCurrency(t.amount), t.notes ?? '']),
        footer: ['', 'Total Distributed', formatCurrency(zakatDistributedInPeriod), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: zakatRowsInPeriod.map((t) => ({ Date: t.date, Recipient: t.recipient_name, Amount: t.amount, Notes: t.notes ?? '' })),
        sheetName: 'Zakat Distribution',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Outstanding Advances — live balances, not period-scoped
  // =========================================================================
  interface AdvanceBalanceRow {
    name: string
    department: string
    balance: number
  }
  const outstandingAdvanceRows = useMemo<AdvanceBalanceRow[]>(() => {
    const rows: AdvanceBalanceRow[] = []
    for (const e of employeesWithBalance) {
      if (e.advanceBalance > 0) rows.push({ name: e.name, department: DEPARTMENT_LABELS.cutting_department, balance: e.advanceBalance })
    }
    for (const s of supervisorsWithBalance) {
      if (s.advanceBalance > 0) rows.push({ name: s.name, department: DEPARTMENT_LABELS.protees_unit, balance: s.advanceBalance })
    }
    return rows.sort((a, b) => b.balance - a.balance)
  }, [employeesWithBalance, supervisorsWithBalance])
  const outstandingAdvancesTotal = outstandingAdvanceRows.reduce((s, r) => s + r.balance, 0)

  async function exportAdvances(format: 'pdf' | 'excel') {
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Outstanding Advances',
        subtitle: `As of ${formatDate(todayISO())} (live balance)`,
        head: ['Name', 'Department', 'Balance'],
        rows: outstandingAdvanceRows.map((r) => [r.name, r.department, formatCurrency(r.balance)]),
        footer: ['', 'Total Outstanding', formatCurrency(outstandingAdvancesTotal)],
        filename: 'protees-outstanding-advances.pdf',
      })
    } else {
      await exportReportExcel({
        rows: outstandingAdvanceRows.map((r) => ({ Name: r.name, Department: r.department, Balance: r.balance })),
        sheetName: 'Outstanding Advances',
        filename: 'protees-outstanding-advances.xlsx',
      })
    }
  }

  async function handleExport(format: 'pdf' | 'excel') {
    switch (view) {
      case 'overview':
        return exportOverview(format)
      case 'unit-cost':
        return exportUnitCost(format)
      case 'unit-payroll':
        return exportUnitPayroll(format)
      case 'unit-expenses':
        return exportUnitExpenses(format)
      case 'zakat':
        return exportZakat(format)
      case 'advances':
        return exportAdvances(format)
    }
  }

  const currentRowCount =
    view === 'overview'
      ? overviewRows.length
      : view === 'unit-cost'
        ? unitCostRows.length
        : view === 'unit-payroll'
          ? unitPayrollRows.length
          : view === 'unit-expenses'
            ? unitExpensesInPeriod.length
            : view === 'zakat'
              ? zakatRowsInPeriod.length
              : outstandingAdvanceRows.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Unit costs, payroll, expenses, Zakat, and outstanding advances — with PDF/Excel export.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORT_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              view === v.key ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          {activeView.periodScoped ? (
            <>
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
            </>
          ) : (
            <p className="text-xs text-slate-500">Live balances — not date-filtered.</p>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary" onClick={() => handleExport('pdf')} disabled={currentRowCount === 0}>
              <FileText size={16} /> Export PDF
            </button>
            <button className="btn-secondary" onClick={() => handleExport('excel')} disabled={currentRowCount === 0}>
              <FileSpreadsheet size={16} /> Export Excel
            </button>
          </div>
        </div>
        {activeView.periodScoped && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {formatDate(start)} – {formatDate(end)}
          </p>
        )}
      </div>

      {view === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Unit Payments" value={formatCurrency(overviewTotals.get('Unit Payment') ?? 0)} />
            <SummaryCard label="Salaries" value={formatCurrency(overviewTotals.get('Salary') ?? 0)} />
            <SummaryCard label="Advances" value={formatCurrency(overviewTotals.get('Advance') ?? 0)} tone="text-neon-amber" />
            <SummaryCard label="Unit Expenses" value={formatCurrency(overviewTotals.get('Unit Expense') ?? 0)} tone="text-neon-red" />
            <SummaryCard label="Grand Total" value={formatCurrency(overviewGrandTotal)} tone="text-neon-green" />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Khadim Hussain Account</h2>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <SummaryCard label="Total Payments Given" value={formatCurrency(khadimPeriodStats.totalGiven)} tone="text-neon-green" />
              <SummaryCard label="Total Bills Submitted" value={formatCurrency(khadimPeriodStats.totalBills)} tone="text-neon-red" />
              <SummaryCard
                label="Current Outstanding Balance"
                value={khadimTotals.balance === 0 ? '✅ Cleared' : formatCurrency(khadimTotals.balance)}
                tone={khadimTotals.balance === 0 ? 'text-neon-green' : 'text-neon-amber'}
              />
              <SummaryCard label="Number of Transactions" value={String(khadimPeriodStats.count)} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Payments/bills/transaction count are for the selected period; Outstanding Balance is the account's live running balance.</p>
          </div>

          {expensesByCategory.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Expenses by Category</h2>
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

          {overviewRows.length === 0 ? (
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
                  {overviewRows.map((r, idx) => (
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
        </>
      )}

      {view === 'unit-cost' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Advances Given" value={formatCurrency(unitCostSummary.totalAdvancesGiven)} tone="text-neon-amber" />
            <SummaryCard label="Total Payments Made" value={formatCurrency(unitCostSummary.totalPaymentsMade)} tone="text-neon-green" />
            <SummaryCard label="Total Unit Expenses" value={formatCurrency(unitCostSummary.totalUnitExpenses)} tone="text-neon-purple" />
            <SummaryCard label="Total Unit Cost" value={formatCurrency(unitCostSummary.totalUnitCost)} />
          </div>
          {unitCostRows.length === 0 ? (
            <EmptyReportState />
          ) : (
            <ReportTable rows={unitCostRows} columns={['Date', 'Type', 'Context', 'Name', 'Amount', 'Notes']} />
          )}
        </>
      )}

      {view === 'unit-payroll' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Unit Payroll Paid" value={formatCurrency(unitPayrollTotal)} tone="text-neon-green" />
            <SummaryCard label="Unit Employee Payments" value={String(unitPayrollRows.length)} />
          </div>
          {unitPayrollRows.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {unitPayrollRows.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{p.employee_name}</td>
                      <td className="px-5 py-3.5 text-slate-200">{formatCurrency(p.net_amount)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'unit-expenses' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Total Unit Expenses" value={formatCurrency(unitExpensesTotal)} tone="text-neon-purple" />
            <SummaryCard label="Number of Entries" value={String(unitExpensesInPeriod.length)} />
          </div>
          {unitExpensesByCategory.length > 0 && (
            <div className="card grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
              {unitExpensesByCategory.map(([cat, total]) => (
                <div key={cat} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-400">{cat}</span>
                  <span className="shrink-0 font-display font-semibold text-neon-purple">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          )}
          {unitExpensesInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Title</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {unitExpensesInPeriod.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(e.date)}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{e.title}</td>
                      <td className="px-5 py-3.5 text-slate-400">{e.category}</td>
                      <td className="px-5 py-3.5 text-slate-200">{formatCurrency(e.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'zakat' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Monthly Budget" value={formatCurrency(zakatMonthlyBudget)} />
            <SummaryCard label="Distributed (period)" value={formatCurrency(zakatDistributedInPeriod)} tone="text-neon-green" />
            <SummaryCard label="Recipients (period)" value={String(zakatRowsInPeriod.length)} />
          </div>
          {zakatRowsInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Recipient</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {zakatRowsInPeriod.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{t.recipient_name}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(t.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'advances' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Total Outstanding" value={formatCurrency(outstandingAdvancesTotal)} tone="text-neon-amber" />
            <SummaryCard label="People with a balance" value={String(outstandingAdvanceRows.length)} />
          </div>
          {outstandingAdvanceRows.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingAdvanceRows.map((r) => (
                    <tr key={`${r.department}-${r.name}`} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-white">{r.name}</td>
                      <td className="px-5 py-3.5 text-slate-400">{r.department}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-amber">{formatCurrency(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyReportState() {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <Download className="text-slate-600" size={28} />
      <p className="text-sm text-slate-400">No records in this period.</p>
    </div>
  )
}

function ReportTable({ rows, columns }: { rows: ReportRow[]; columns: string[] }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
            {columns.map((c) => (
              <th key={c} className="px-5 py-3.5">
                {c}
              </th>
            ))}
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
  )
}
