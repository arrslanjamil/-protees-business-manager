import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { CategoryBarChart } from '@/components/dashboard/CategoryBarChart'
import { DEPARTMENT_LABELS, EMPLOYEE_TYPE_LABELS, EXPENSE_SCOPE_LABELS, KHADIM_TYPE_LABELS } from '@/lib/types'
import { exportReportExcel, exportReportPdf } from '@/lib/reportExport'
import { computeZakatOutstanding, monthsAccruedInRange } from '@/lib/zakat'
import { classNames, formatCurrency, formatDate, isWithinRange, presetDateRange, todayISO, type DateRangePreset } from '@/lib/utils'

type ReportView =
  | 'overview'
  | 'unit-cost'
  | 'unit-payroll'
  | 'unit-expenses'
  | 'zakat'
  | 'advances'
  | 'shopify-collections'
  | 'courier-collections'
  | 'bank-summary'
  | 'cash-ledger'
  | 'monthly-collections'

const REPORT_VIEWS: { key: ReportView; label: string; periodScoped: boolean }[] = [
  { key: 'overview', label: 'Overview', periodScoped: true },
  { key: 'unit-cost', label: 'Unit Cost Summary', periodScoped: true },
  { key: 'unit-payroll', label: 'Unit Payroll', periodScoped: true },
  { key: 'unit-expenses', label: 'Unit Expenses', periodScoped: true },
  { key: 'zakat', label: 'Zakat Distribution', periodScoped: true },
  { key: 'advances', label: 'Outstanding Advances', periodScoped: false },
  { key: 'shopify-collections', label: 'Shopify Collection Report', periodScoped: true },
  { key: 'courier-collections', label: 'Courier Collection Report', periodScoped: true },
  { key: 'bank-summary', label: 'Bank Ledger', periodScoped: true },
  { key: 'cash-ledger', label: 'Cash Ledger', periodScoped: true },
  { key: 'monthly-collections', label: 'Monthly Collection Summary', periodScoped: true },
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
  const { shopifyOrders, couriers, courierCollections, bankAccountsWithBalance, bankTransactions, cashTransactions, cashSettings } = useCollections()

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
  const zakatOpeningBalance = zakatSettings?.opening_balance ?? 0
  const zakatOpeningMonth = zakatSettings?.opening_month ?? todayISO().slice(0, 8) + '01'
  const zakatMonthlyAddedInPeriod = monthsAccruedInRange(start, end, zakatOpeningMonth) * zakatMonthlyBudget
  const zakatTotalDistributedSinceOpening = useMemo(
    () => zakatTransactions.filter((t) => t.date >= zakatOpeningMonth).reduce((s, t) => s + Number(t.amount), 0),
    [zakatTransactions, zakatOpeningMonth]
  )
  const zakatOutstandingBalance = computeZakatOutstanding({
    openingBalance: zakatOpeningBalance,
    openingMonth: zakatOpeningMonth,
    monthlyTarget: zakatMonthlyBudget,
    totalDistributedSinceOpening: zakatTotalDistributedSinceOpening,
  })

  async function exportZakat(format: 'pdf' | 'excel') {
    const filenameBase = `protees-zakat-distribution-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Zakat Distribution',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}  ·  Opening Balance: ${formatCurrency(zakatOpeningBalance)}  ·  Outstanding Balance: ${formatCurrency(zakatOutstandingBalance)}`,
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

  // =========================================================================
  // Shopify Collection Report
  // =========================================================================
  const shopifyRowsInPeriod = useMemo(
    () =>
      shopifyOrders
        .filter((o) => isWithinRange(o.order_date.slice(0, 10), start, end))
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()),
    [shopifyOrders, start, end]
  )
  const shopifyTotalInPeriod = shopifyRowsInPeriod.reduce((s, o) => s + Number(o.total_amount), 0)

  async function exportShopifyCollections(format: 'pdf' | 'excel') {
    const filenameBase = `protees-shopify-collections-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Shopify Collection Report',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Order #', 'Date', 'Customer', 'Amount', 'Payment Method', 'Status'],
        rows: shopifyRowsInPeriod.map((o) => [o.order_number, formatDate(o.order_date), o.customer_name ?? '', formatCurrency(o.total_amount), o.payment_method ?? '', o.financial_status]),
        footer: ['', '', '', 'Total', formatCurrency(shopifyTotalInPeriod), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: shopifyRowsInPeriod.map((o) => ({
          'Order #': o.order_number,
          Date: o.order_date,
          Customer: o.customer_name ?? '',
          Amount: o.total_amount,
          'Payment Method': o.payment_method ?? '',
          Status: o.financial_status,
        })),
        sheetName: 'Shopify Collections',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Courier Collection Report
  // =========================================================================
  const courierNameById = useMemo(() => new Map(couriers.map((c) => [c.id, c.name])), [couriers])
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])
  const courierDestinationById = useMemo(
    () =>
      new Map(
        couriers.map((c) => [
          c.id,
          c.payment_method === 'bank_transfer' ? (c.bank_account_id ? bankNameById.get(c.bank_account_id) ?? 'Bank Transfer' : 'Bank Transfer') : 'Cash',
        ])
      ),
    [couriers, bankNameById]
  )
  const courierCollectionRowsInPeriod = useMemo(
    () =>
      courierCollections
        .filter((c) => isWithinRange(c.invoice_date, start, end))
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()),
    [courierCollections, start, end]
  )
  const courierCollectionsTotalInPeriod = courierCollectionRowsInPeriod.reduce((s, c) => s + Number(c.amount), 0)

  async function exportCourierCollections(format: 'pdf' | 'excel') {
    const filenameBase = `protees-courier-collections-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Courier Collection Report',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Date', 'Courier', 'Invoice #', 'Amount', 'Posted To'],
        rows: courierCollectionRowsInPeriod.map((c) => [
          formatDate(c.invoice_date),
          courierNameById.get(c.courier_id) ?? '',
          c.invoice_number ?? '',
          formatCurrency(c.amount),
          courierDestinationById.get(c.courier_id) ?? '',
        ]),
        footer: ['', '', 'Total Received', formatCurrency(courierCollectionsTotalInPeriod), ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: courierCollectionRowsInPeriod.map((c) => ({
          Date: c.invoice_date,
          Courier: courierNameById.get(c.courier_id) ?? '',
          'Invoice #': c.invoice_number ?? '',
          Amount: c.amount,
          'Posted To': courierDestinationById.get(c.courier_id) ?? '',
        })),
        sheetName: 'Courier Collections',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Bank Account Summary — live balances plus period transaction history
  // =========================================================================
  const bankTransactionsInPeriod = useMemo(
    () =>
      bankTransactions
        .filter((t) => isWithinRange(t.date, start, end))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bankTransactions, start, end]
  )
  const totalBankBalance = bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0)

  async function exportBankSummary(format: 'pdf' | 'excel') {
    const filenameBase = `protees-bank-account-summary-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Bank Account Summary',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}  ·  Total Balance (live): ${formatCurrency(totalBankBalance)}`,
        head: ['Bank', 'Type', 'Amount', 'Date', 'Reference'],
        rows: bankTransactionsInPeriod.map((t) => [
          bankNameById.get(t.bank_account_id) ?? '',
          t.type === 'credit' ? 'Credit' : 'Debit',
          formatCurrency(t.amount),
          formatDate(t.date),
          t.reference_type ?? '',
        ]),
        footer: ['', '', '', '', ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: bankTransactionsInPeriod.map((t) => ({
          Bank: bankNameById.get(t.bank_account_id) ?? '',
          Type: t.type,
          Amount: t.amount,
          Date: t.date,
          Reference: t.reference_type ?? '',
        })),
        sheetName: 'Bank Account Summary',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Cash Ledger
  // =========================================================================
  const cashTransactionsInPeriod = useMemo(
    () =>
      cashTransactions
        .filter((t) => isWithinRange(t.date, start, end))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [cashTransactions, start, end]
  )
  const cashInTotalInPeriod = cashTransactionsInPeriod.filter((t) => t.type === 'cash_in').reduce((s, t) => s + Number(t.amount), 0)
  const cashOutTotalInPeriod = cashTransactionsInPeriod.filter((t) => t.type === 'cash_out').reduce((s, t) => s + Number(t.amount), 0)
  const cashOpeningBalance = cashSettings?.opening_balance ?? 0

  async function exportCashLedger(format: 'pdf' | 'excel') {
    const filenameBase = `protees-cash-ledger-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Cash Ledger',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}  ·  Opening Balance: ${formatCurrency(cashOpeningBalance)}`,
        head: ['Date', 'Type', 'Category', 'Amount', 'Bank', 'Notes'],
        rows: cashTransactionsInPeriod.map((t) => [
          formatDate(t.date),
          t.type === 'cash_in' ? 'Cash In' : 'Cash Out',
          t.category,
          formatCurrency(t.amount),
          t.bank_account_id ? bankNameById.get(t.bank_account_id) ?? '' : '',
          t.notes ?? '',
        ]),
        footer: ['', '', 'Net', formatCurrency(cashInTotalInPeriod - cashOutTotalInPeriod), '', ''],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: cashTransactionsInPeriod.map((t) => ({
          Date: t.date,
          Type: t.type,
          Category: t.category,
          Amount: t.amount,
          Bank: t.bank_account_id ? bankNameById.get(t.bank_account_id) ?? '' : '',
          Notes: t.notes ?? '',
        })),
        sheetName: 'Cash Ledger',
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  // =========================================================================
  // Monthly Collection Summary — Shopify + Courier totals grouped by month
  // =========================================================================
  interface MonthlyCollectionRow {
    month: string
    shopify: number
    courier: number
    total: number
  }
  const monthlyCollectionRows = useMemo<MonthlyCollectionRow[]>(() => {
    const byMonth = new Map<string, { shopify: number; courier: number }>()
    for (const o of shopifyOrders) {
      const dateStr = o.order_date.slice(0, 10)
      if (!isWithinRange(dateStr, start, end)) continue
      const key = dateStr.slice(0, 7)
      const bucket = byMonth.get(key) ?? { shopify: 0, courier: 0 }
      bucket.shopify += Number(o.total_amount)
      byMonth.set(key, bucket)
    }
    for (const c of courierCollections) {
      if (!isWithinRange(c.invoice_date, start, end)) continue
      const key = c.invoice_date.slice(0, 7)
      const bucket = byMonth.get(key) ?? { shopify: 0, courier: 0 }
      bucket.courier += Number(c.amount)
      byMonth.set(key, bucket)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => ({ month, shopify: v.shopify, courier: v.courier, total: v.shopify + v.courier }))
  }, [shopifyOrders, courierCollections, start, end])
  const monthlyCollectionGrandTotal = monthlyCollectionRows.reduce((s, r) => s + r.total, 0)

  async function exportMonthlyCollections(format: 'pdf' | 'excel') {
    const filenameBase = `protees-monthly-collection-summary-${start}-to-${end}`
    if (format === 'pdf') {
      await exportReportPdf({
        title: 'Monthly Collection Summary',
        subtitle: `Period: ${formatDate(start)} – ${formatDate(end)}`,
        head: ['Month', 'Shopify', 'Courier', 'Total'],
        rows: monthlyCollectionRows.map((r) => [r.month, formatCurrency(r.shopify), formatCurrency(r.courier), formatCurrency(r.total)]),
        footer: ['Grand Total', '', '', formatCurrency(monthlyCollectionGrandTotal)],
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: monthlyCollectionRows.map((r) => ({ Month: r.month, Shopify: r.shopify, Courier: r.courier, Total: r.total })),
        sheetName: 'Monthly Collections',
        filename: `${filenameBase}.xlsx`,
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
      case 'shopify-collections':
        return exportShopifyCollections(format)
      case 'courier-collections':
        return exportCourierCollections(format)
      case 'bank-summary':
        return exportBankSummary(format)
      case 'cash-ledger':
        return exportCashLedger(format)
      case 'monthly-collections':
        return exportMonthlyCollections(format)
    }
  }

  const REPORT_ROW_COUNTS: Record<ReportView, number> = {
    overview: overviewRows.length,
    'unit-cost': unitCostRows.length,
    'unit-payroll': unitPayrollRows.length,
    'unit-expenses': unitExpensesInPeriod.length,
    zakat: zakatRowsInPeriod.length,
    advances: outstandingAdvanceRows.length,
    'shopify-collections': shopifyRowsInPeriod.length,
    'courier-collections': courierCollectionRowsInPeriod.length,
    'bank-summary': bankTransactionsInPeriod.length,
    'cash-ledger': cashTransactionsInPeriod.length,
    'monthly-collections': monthlyCollectionRows.length,
  }
  const currentRowCount = REPORT_ROW_COUNTS[view]

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
              <div className="card">
                <CategoryBarChart data={expensesByCategory} color="#f87171" />
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
            <div className="card">
              <CategoryBarChart data={unitExpensesByCategory} color="#a78bfa" />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="Opening Balance" value={formatCurrency(zakatOpeningBalance)} />
            <SummaryCard label="Monthly Added Zakat (period)" value={formatCurrency(zakatMonthlyAddedInPeriod)} />
            <SummaryCard label="Total Distributed (period)" value={formatCurrency(zakatDistributedInPeriod)} tone="text-neon-green" />
            <SummaryCard label="Current Outstanding Balance" value={formatCurrency(zakatOutstandingBalance)} tone="text-neon-amber" />
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

      {view === 'shopify-collections' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Shopify Collections (period)" value={formatCurrency(shopifyTotalInPeriod)} tone="text-neon-purple" />
            <SummaryCard label="Orders" value={String(shopifyRowsInPeriod.length)} />
          </div>
          {shopifyRowsInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Order #</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shopifyRowsInPeriod.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-white">{o.order_number}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(o.order_date)}</td>
                      <td className="px-5 py-3.5 text-slate-300">{o.customer_name || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(o.total_amount)}</td>
                      <td className="px-5 py-3.5 text-slate-400">{o.payment_method || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{o.financial_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'courier-collections' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Courier Collections Received (period)" value={formatCurrency(courierCollectionsTotalInPeriod)} tone="text-neon-green" />
            <SummaryCard label="Collections" value={String(courierCollectionRowsInPeriod.length)} />
          </div>
          {courierCollectionRowsInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Courier</th>
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Posted To</th>
                  </tr>
                </thead>
                <tbody>
                  {courierCollectionRowsInPeriod.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(c.invoice_date)}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{courierNameById.get(c.courier_id) ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{c.invoice_number || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(c.amount)}</td>
                      <td className="px-5 py-3.5 text-slate-400">{courierDestinationById.get(c.courier_id) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'bank-summary' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Bank Balance (live)" value={formatCurrency(totalBankBalance)} />
            {bankAccountsWithBalance.map((b) => (
              <SummaryCard key={b.id} label={b.name} value={formatCurrency(b.balance)} tone="text-neon-purple" />
            ))}
          </div>
          {bankTransactionsInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Bank</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {bankTransactionsInPeriod.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-white">{bankNameById.get(t.bank_account_id) ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={t.type === 'credit' ? 'text-neon-green' : 'text-neon-red'}>{t.type === 'credit' ? 'Credit' : 'Debit'}</span>
                      </td>
                      <td className={`px-5 py-3.5 font-semibold ${t.type === 'credit' ? 'text-neon-green' : 'text-neon-red'}`}>
                        {t.type === 'credit' ? '+' : '−'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                      <td className="px-5 py-3.5 text-slate-400">{t.reference_type ? t.reference_type.replace('_', ' ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'cash-ledger' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Opening Balance" value={formatCurrency(cashOpeningBalance)} />
            <SummaryCard label="Cash In (period)" value={formatCurrency(cashInTotalInPeriod)} tone="text-neon-green" />
            <SummaryCard label="Cash Out (period)" value={formatCurrency(cashOutTotalInPeriod)} tone="text-neon-red" />
            <SummaryCard label="Net (period)" value={formatCurrency(cashInTotalInPeriod - cashOutTotalInPeriod)} />
          </div>
          {cashTransactionsInPeriod.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Bank</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cashTransactionsInPeriod.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className={t.type === 'cash_in' ? 'text-neon-green' : 'text-neon-red'}>{t.type === 'cash_in' ? 'Cash In' : 'Cash Out'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{t.category}</td>
                      <td className={`px-5 py-3.5 font-semibold ${t.type === 'cash_in' ? 'text-neon-green' : 'text-neon-red'}`}>
                        {t.type === 'cash_in' ? '+' : '−'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{t.bank_account_id ? bankNameById.get(t.bank_account_id) ?? '—' : '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500">{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'monthly-collections' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard label="Total Collections (period)" value={formatCurrency(monthlyCollectionGrandTotal)} tone="text-neon-green" />
            <SummaryCard label="Months" value={String(monthlyCollectionRows.length)} />
          </div>
          {monthlyCollectionRows.length === 0 ? (
            <EmptyReportState />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Month</th>
                    <th className="px-5 py-3.5">Shopify</th>
                    <th className="px-5 py-3.5">Courier</th>
                    <th className="px-5 py-3.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyCollectionRows.map((r) => (
                    <tr key={r.month} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-white">{r.month}</td>
                      <td className="px-5 py-3.5 text-slate-300">{formatCurrency(r.shopify)}</td>
                      <td className="px-5 py-3.5 text-slate-300">{formatCurrency(r.courier)}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(r.total)}</td>
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
