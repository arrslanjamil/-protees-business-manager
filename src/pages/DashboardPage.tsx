import { useMemo, useState } from 'react'
import { HandCoins, HeartHandshake, Layers, Receipt, Users, Wallet } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { SortableWidget } from '@/components/dashboard/SortableWidget'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { DataTable, type DataTableColumn } from '@/components/dashboard/DataTable'
import { DrillDownPanel } from '@/components/dashboard/DrillDownPanel'
import { ZakatProgressCard } from '@/components/dashboard/ZakatProgressCard'
import { useDashboardLayout, KPI_CARD_IDS, type WidgetId } from '@/hooks/useDashboardLayout'
import { trendBucketsInRange } from '@/lib/dashboardAnalytics'
import { dashboardDateRange, formatCurrency, formatCurrencyCompact, formatDate, isWithinRange, type DashboardDatePreset } from '@/lib/utils'
import { computeZakatProgress } from '@/lib/zakat'

const DEFAULT_ZAKAT_MONTHLY_BUDGET = 100_000

type DrillDownId = WidgetId | 'zakat-progress'

function isKhadimExpense(title: string, category: string, notes: string | null): boolean {
  const needle = 'khadim'
  return title.toLowerCase().includes(needle) || category.toLowerCase().includes(needle) || (notes ?? '').toLowerCase().includes(needle)
}

interface ExpectedSalaryRow {
  id: number
  name: string
  type: 'Monthly' | 'Contract'
  group: 'Regular' | 'Unit'
  expectedLabel: string
  expectedAmount: number
}

interface CategoryRow {
  name: string
  amount: number
  percent: number
}

interface DepartmentRow {
  department: string
  payroll: number | null
  paid: number
  due: number | null
}

/** Shared shape for most drill-down tables — a single date-stamped
 * money-out or money-in event. */
interface LedgerDrillRow {
  id: string
  date: string
  type: string
  name: string
  amount: number
  notes: string
}

interface EmployeeDrillRow {
  id: number
  name: string
  type: string
  group: string
  salary: number
}

interface PayrollDrillRow {
  id: number
  name: string
  expected: number
  paid: number
  due: number
}

interface AdvanceBalanceDrillRow {
  id: string
  name: string
  department: string
  given: number
  outstanding: number
}

interface CollectionDrillRow {
  id: string
  date: string
  source: string
  reference: string
  amount: number
}

export function DashboardPage() {
  const { employeesWithBalance, supervisorsWithBalance, advances, expenses, salaryPayments, unitPayments, zakatTransactions, zakatSettings } = useData()
  const { shopifyOrders, shopifyStores, courierCollections, couriers, cashBalance, bankAccountsWithBalance } = useCollections()
  const { order, setOrder, loaded } = useDashboardLayout()

  const [preset, setPreset] = useState<DashboardDatePreset>('today')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('15d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('15d').end)
  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const [expandedId, setExpandedId] = useState<DrillDownId | null>(null)
  function toggleCard(id: DrillDownId) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const cardOrder = useMemo(() => order.filter((id) => KPI_CARD_IDS.includes(id)), [order])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as WidgetId)
      const newIndex = prev.indexOf(over.id as WidgetId)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  // --- Period-scoped records ---------------------------------------------------
  const periodExpensesList = useMemo(() => expenses.filter((e) => isWithinRange(e.date, start, end)), [expenses, start, end])
  const periodBusinessExpenses = useMemo(() => periodExpensesList.filter((e) => e.expense_scope !== 'unit'), [periodExpensesList])
  const periodUnitExpenses = useMemo(() => periodExpensesList.filter((e) => e.expense_scope === 'unit'), [periodExpensesList])
  const periodSalaryList = useMemo(() => salaryPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [salaryPayments, start, end])
  const periodUnitList = useMemo(() => unitPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [unitPayments, start, end])
  const periodAdvancesRows = useMemo(() => advances.filter((a) => isWithinRange(a.payment_date, start, end)), [advances, start, end])
  const periodZakatRows = useMemo(() => zakatTransactions.filter((t) => isWithinRange(t.date, start, end)), [zakatTransactions, start, end])
  const periodKhadimRows = useMemo(() => periodExpensesList.filter((e) => isKhadimExpense(e.title, e.category, e.notes)), [periodExpensesList])
  const periodShopifyOrdersRows = useMemo(
    () => shopifyOrders.filter((o) => isWithinRange(o.order_date.slice(0, 10), start, end)),
    [shopifyOrders, start, end]
  )
  const periodCourierCollectionsRows = useMemo(
    () => courierCollections.filter((c) => isWithinRange(c.invoice_date, start, end)),
    [courierCollections, start, end]
  )

  // Total Expenses is business-only — Unit Expenses are excluded and get
  // their own card/calculations instead (per the Unit module restructure).
  const totalExpenses = periodBusinessExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const unitExpensesTotal = periodUnitExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // Regular Payroll is scoped to employee_group='regular' — Unit Employees'
  // salaries count toward Unit Payroll/Unit Cost instead (see Unit Payroll
  // report and the Protees Unit page's Unit Overview card).
  const periodSalaryListRegular = useMemo(
    () => periodSalaryList.filter((p) => employeesWithBalance.find((e) => e.name === p.employee_name)?.employee_group !== 'unit'),
    [periodSalaryList, employeesWithBalance]
  )
  const periodSalaryNet = periodSalaryListRegular.reduce((s, p) => s + Number(p.net_amount), 0)
  const periodUnitNet = periodUnitList.reduce((s, p) => s + Number(p.net_amount), 0)
  const salaryPaid = periodSalaryNet + periodUnitNet

  // Total Unit Cost — mirrors the Protees Unit page's Unit Overview card:
  // Unit Employee/Supervisor payments plus Unit Expenses for the period.
  const totalUnitCost = periodUnitNet + unitExpensesTotal

  // Outstanding Advances — a live balance, not period-scoped: what's owed
  // right now regardless of which dates are selected.
  const outstandingAdvances =
    employeesWithBalance.reduce((s, e) => s + Math.max(0, e.advanceBalance), 0) +
    supervisorsWithBalance.reduce((s, sup) => s + Math.max(0, sup.advanceBalance), 0)

  // Lifetime advance totals per name (all-time, not period-scoped) — paired
  // with the live outstanding balance in the Outstanding Advances drill-down.
  const advancesGivenByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of advances) map.set(a.employee_name, (map.get(a.employee_name) ?? 0) + Number(a.amount))
    return map
  }, [advances])

  // Total Advance Given — how much was actually disbursed in the selected
  // period (distinct from Outstanding Advances, which is the live balance).
  const periodAdvancesGiven = periodAdvancesRows.reduce((s, a) => s + Number(a.amount), 0)

  // Zakat Distributed — the selected period's distributions, distinct from
  // the Zakat Progress widget's running-balance-since-opening figure.
  const periodZakatDistributed = periodZakatRows.reduce((s, t) => s + Number(t.amount), 0)

  // Khadim Sahib — derived from expense records, no dedicated table.
  const khadimExpenseTotal = periodKhadimRows.reduce((s, e) => s + Number(e.amount), 0)

  // Total Money Out — every distinct money-out category combined into one
  // figure, so nothing needs to be mentally added up across cards. Khadim
  // is a subset of Total Expenses/Unit Expenses (derived from the same
  // expense records), so it is not added again.
  const totalMoneyOut = totalExpenses + unitExpensesTotal + salaryPaid + periodAdvancesGiven + periodZakatDistributed

  // --- Collections (Shopify + Courier) — period-scoped, same treatment as
  // Total Advance Given / Zakat Distributed above.
  const periodShopifyCollections = periodShopifyOrdersRows.reduce((s, o) => s + Number(o.total_amount), 0)
  const periodCourierCollections = periodCourierCollectionsRows.reduce((s, c) => s + Number(c.amount), 0)
  const periodTotalCollections = periodShopifyCollections + periodCourierCollections
  const totalBankBalance = useMemo(() => bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0), [bankAccountsWithBalance])

  // --- Payroll (Regular employees only) -------------------------------------
  const regularEmployees = useMemo(() => employeesWithBalance.filter((e) => e.employee_group !== 'unit'), [employeesWithBalance])
  const monthlyEmployees = useMemo(() => regularEmployees.filter((e) => e.employee_type === 'monthly'), [regularEmployees])
  const totalMonthlyPayroll = monthlyEmployees.reduce((s, e) => s + Number(e.salary), 0)
  const contractPeriodPayments = useMemo(
    () => periodSalaryListRegular.filter((p) => employeesWithBalance.find((e) => e.name === p.employee_name)?.employee_type === 'contract'),
    [periodSalaryListRegular, employeesWithBalance]
  )
  const totalContractPayroll = contractPeriodPayments.reduce((s, p) => s + Number(p.base_amount), 0)
  const totalPayroll = totalMonthlyPayroll + totalContractPayroll
  const salaryDue = Math.max(0, totalPayroll - periodSalaryNet - outstandingAdvances)

  // --- Trend chart: (business) expenses vs salaries, day- or month-bucketed --
  const trendBuckets = useMemo(() => trendBucketsInRange(start, end), [start, end])
  const trendData = useMemo(
    () =>
      trendBuckets.map((b) => ({
        label: b.label,
        expenses: expenses
          .filter((e) => e.expense_scope !== 'unit' && isWithinRange(e.date, b.start, b.end))
          .reduce((s, e) => s + Number(e.amount), 0),
        salaries:
          salaryPayments.filter((p) => isWithinRange(p.payment_date, b.start, b.end)).reduce((s, p) => s + Number(p.net_amount), 0) +
          unitPayments.filter((p) => isWithinRange(p.payment_date, b.start, b.end)).reduce((s, p) => s + Number(p.net_amount), 0),
      })),
    [trendBuckets, expenses, salaryPayments, unitPayments]
  )

  // --- Zakat Progress — Target/Distributed/Remaining derived from the same
  // running-balance snapshot as the Zakat page, independent of the
  // dashboard's own date filter (Zakat tracks its own running balance).
  const zakatMonthlyBudget = zakatSettings?.monthly_budget ?? DEFAULT_ZAKAT_MONTHLY_BUDGET
  const zakatOpeningBalance = zakatSettings?.opening_balance ?? 0
  const zakatOpeningMonth = zakatSettings?.opening_month ?? new Date().toISOString().slice(0, 10)
  const zakatTotalDistributedSinceOpening = useMemo(
    () => zakatTransactions.filter((t) => t.date >= zakatOpeningMonth).reduce((s, t) => s + Number(t.amount), 0),
    [zakatTransactions, zakatOpeningMonth]
  )
  const zakatProgress = computeZakatProgress({
    openingBalance: zakatOpeningBalance,
    openingMonth: zakatOpeningMonth,
    monthlyTarget: zakatMonthlyBudget,
    totalDistributedSinceOpening: zakatTotalDistributedSinceOpening,
  })

  // --- Expected Salary By Employee (all employees, both groups shown) -------
  const expectedSalaryRows = useMemo<ExpectedSalaryRow[]>(
    () =>
      employeesWithBalance.map((emp) => {
        const group = emp.employee_group === 'unit' ? 'Unit' : 'Regular'
        if (emp.employee_type === 'monthly') {
          return { id: emp.id, name: emp.name, type: 'Monthly', group, expectedLabel: formatCurrency(emp.salary), expectedAmount: Number(emp.salary) }
        }
        const payment = periodSalaryList.find((p) => p.employee_name === emp.name)
        if (payment && payment.pieces_completed != null) {
          const rate = Number(payment.rate_per_piece ?? emp.rate_per_piece ?? 0)
          const amount = payment.pieces_completed * rate
          return {
            id: emp.id,
            name: emp.name,
            type: 'Contract',
            group,
            expectedLabel: `${payment.pieces_completed} × ${formatCurrency(rate)} = ${formatCurrency(amount)}`,
            expectedAmount: amount,
          }
        }
        return { id: emp.id, name: emp.name, type: 'Contract', group, expectedLabel: 'No pieces entered', expectedAmount: 0 }
      }),
    [employeesWithBalance, periodSalaryList]
  )

  // --- Top Expense Categories (business expenses only, matching Total Expenses) --
  const categoryRows = useMemo<CategoryRow[]>(() => {
    const totals = new Map<string, number>()
    for (const e of periodBusinessExpenses) totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount))
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
  }, [periodBusinessExpenses, totalExpenses])

  // --- Department Payroll -----------------------------------------------------
  const departmentRows = useMemo<DepartmentRow[]>(
    () => [
      { department: 'Employees (Cutting Department)', payroll: totalPayroll, paid: periodSalaryNet, due: salaryDue },
      { department: 'Protees Unit', payroll: null, paid: periodUnitNet, due: null },
    ],
    [totalPayroll, periodSalaryNet, salaryDue, periodUnitNet]
  )

  // =========================================================================
  // Drill-down row builders
  // =========================================================================
  const employeeDrillRows = useMemo<EmployeeDrillRow[]>(
    () =>
      employeesWithBalance.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.employee_type === 'monthly' ? 'Monthly' : 'Contract',
        group: e.employee_group === 'unit' ? 'Unit' : 'Regular',
        salary: Number(e.salary),
      })),
    [employeesWithBalance]
  )

  const payrollDrillRows = useMemo<PayrollDrillRow[]>(
    () =>
      regularEmployees.map((emp) => {
        const expected = expectedSalaryRows.find((r) => r.id === emp.id)?.expectedAmount ?? 0
        const paid = periodSalaryListRegular.filter((p) => p.employee_name === emp.name).reduce((s, p) => s + Number(p.net_amount), 0)
        return { id: emp.id, name: emp.name, expected, paid, due: Math.max(0, expected - paid) }
      }),
    [regularEmployees, expectedSalaryRows, periodSalaryListRegular]
  )

  const outstandingAdvanceDrillRows = useMemo<AdvanceBalanceDrillRow[]>(() => {
    const rows: AdvanceBalanceDrillRow[] = []
    for (const e of employeesWithBalance) {
      if (e.advanceBalance > 0) rows.push({ id: `emp-${e.id}`, name: e.name, department: 'Employees', given: advancesGivenByName.get(e.name) ?? 0, outstanding: e.advanceBalance })
    }
    for (const s of supervisorsWithBalance) {
      if (s.advanceBalance > 0) rows.push({ id: `sup-${s.id}`, name: s.name, department: 'Protees Unit', given: advancesGivenByName.get(s.name) ?? 0, outstanding: s.advanceBalance })
    }
    return rows.sort((a, b) => b.outstanding - a.outstanding)
  }, [employeesWithBalance, supervisorsWithBalance, advancesGivenByName])

  const salaryPaidDrillRows = useMemo<LedgerDrillRow[]>(
    () =>
      [
        ...periodSalaryListRegular.map((p) => ({ id: `sal-${p.id}`, date: p.payment_date, type: 'Salary', name: p.employee_name, amount: Number(p.net_amount), notes: p.notes ?? '' })),
        ...periodUnitList.map((p) => ({ id: `unit-${p.id}`, date: p.payment_date, type: 'Unit Payment', name: p.supervisor_name, amount: Number(p.net_amount), notes: p.notes ?? '' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [periodSalaryListRegular, periodUnitList]
  )

  const totalExpensesDrillRows = useMemo<LedgerDrillRow[]>(
    () => periodBusinessExpenses.map((e) => ({ id: `exp-${e.id}`, date: e.date, type: e.category, name: e.title, amount: Number(e.amount), notes: e.notes ?? '' })),
    [periodBusinessExpenses]
  )

  const unitExpensesDrillRows = useMemo<LedgerDrillRow[]>(
    () => periodUnitExpenses.map((e) => ({ id: `uexp-${e.id}`, date: e.date, type: e.category, name: e.title, amount: Number(e.amount), notes: e.notes ?? '' })),
    [periodUnitExpenses]
  )

  const khadimDrillRows = useMemo<LedgerDrillRow[]>(
    () => periodKhadimRows.map((e) => ({ id: `khd-${e.id}`, date: e.date, type: e.category, name: e.title, amount: Number(e.amount), notes: e.notes ?? '' })),
    [periodKhadimRows]
  )

  const advancesGivenDrillRows = useMemo<LedgerDrillRow[]>(
    () => periodAdvancesRows.map((a) => ({ id: `adv-${a.id}`, date: a.payment_date, type: a.department === 'protees_unit' ? 'Protees Unit' : 'Employees', name: a.employee_name, amount: Number(a.amount), notes: a.notes ?? '' })),
    [periodAdvancesRows]
  )

  const zakatDrillRows = useMemo<LedgerDrillRow[]>(
    () => periodZakatRows.map((t) => ({ id: `zkt-${t.id}`, date: t.date, type: 'Zakat', name: t.recipient_name, amount: Number(t.amount), notes: t.notes ?? '' })),
    [periodZakatRows]
  )

  const courierNameById = useMemo(() => new Map(couriers.map((c) => [c.id, c.name])), [couriers])
  const shopifyStoreNameByKey = useMemo(() => new Map(shopifyStores.map((s) => [s.store_key, s.display_name])), [shopifyStores])
  const collectionDrillRows = useMemo<CollectionDrillRow[]>(
    () =>
      [
        ...periodShopifyOrdersRows.map((o) => ({
          id: `sho-${o.id}`,
          date: o.order_date,
          source: o.store_key ? `Shopify: ${shopifyStoreNameByKey.get(o.store_key) ?? o.store_key}` : 'Shopify',
          reference: o.order_number,
          amount: Number(o.total_amount),
        })),
        ...periodCourierCollectionsRows.map((c) => ({
          id: `crc-${c.id}`,
          date: c.invoice_date,
          source: `Courier: ${courierNameById.get(c.courier_id) ?? '—'}`,
          reference: c.invoice_number ?? '—',
          amount: Number(c.amount),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [periodShopifyOrdersRows, periodCourierCollectionsRows, courierNameById, shopifyStoreNameByKey]
  )

  const totalMoneyOutRows = useMemo<LedgerDrillRow[]>(
    () =>
      [...salaryPaidDrillRows, ...advancesGivenDrillRows, ...totalExpensesDrillRows, ...unitExpensesDrillRows, ...zakatDrillRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [salaryPaidDrillRows, advancesGivenDrillRows, totalExpensesDrillRows, unitExpensesDrillRows, zakatDrillRows]
  )

  // =========================================================================
  // Drill-down column definitions
  // =========================================================================
  const ledgerColumns: DataTableColumn<LedgerDrillRow>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
  ]

  const employeeDrillColumns: DataTableColumn<EmployeeDrillRow>[] = [
    { key: 'name', header: 'Employee Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'type', header: 'Employee Type', render: (r) => <Badge color={r.type === 'Monthly' ? 'cyan' : 'purple'}>{r.type}</Badge> },
    { key: 'salary', header: 'Salary', align: 'right', render: (r) => formatCurrency(r.salary) },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.group === 'Unit' ? 'amber' : 'slate'}>{r.group}</Badge> },
  ]

  const payrollDrillColumns: DataTableColumn<PayrollDrillRow>[] = [
    { key: 'name', header: 'Employee Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'expected', header: 'Expected Salary', align: 'right', render: (r) => formatCurrency(r.expected) },
    { key: 'paid', header: 'Paid Salary', align: 'right', render: (r) => formatCurrency(r.paid) },
    { key: 'due', header: 'Remaining Salary', align: 'right', render: (r) => formatCurrency(r.due) },
  ]

  const advanceBalanceDrillColumns: DataTableColumn<AdvanceBalanceDrillRow>[] = [
    { key: 'name', header: 'Employee Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'department', header: 'Department', render: (r) => r.department },
    { key: 'given', header: 'Advance Given', align: 'right', render: (r) => formatCurrency(r.given) },
    { key: 'outstanding', header: 'Outstanding Balance', align: 'right', render: (r) => formatCurrency(r.outstanding) },
  ]

  const collectionDrillColumns: DataTableColumn<CollectionDrillRow>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'source', header: 'Source', render: (r) => r.source },
    { key: 'reference', header: 'Reference', render: (r) => r.reference },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
  ]

  function renderKpiCard(id: WidgetId) {
    const isSelected = expandedId === id
    switch (id) {
      case 'total-money-out':
        return (
          <StatCard
            label="Total Money Out"
            value={formatCurrencyCompact(totalMoneyOut)}
            fullValue={formatCurrency(totalMoneyOut)}
            icon={Wallet}
            accent="red"
            hint="Expenses + Salary + Advances + Zakat · Selected period"
            onClick={() => toggleCard('total-money-out')}
            selected={isSelected}
          />
        )
      case 'total-employees':
        return (
          <StatCard
            label="Total Employees"
            value={String(employeesWithBalance.length)}
            icon={Users}
            accent="cyan"
            hint="Live roster"
            onClick={() => toggleCard('total-employees')}
            selected={isSelected}
          />
        )
      case 'total-payroll':
        return (
          <StatCard
            label="Total Payroll"
            value={formatCurrencyCompact(totalPayroll)}
            fullValue={formatCurrency(totalPayroll)}
            icon={Receipt}
            accent="purple"
            hint="Selected period"
            onClick={() => toggleCard('total-payroll')}
            selected={isSelected}
          />
        )
      case 'salary-paid':
        return (
          <StatCard
            label="Salary Paid"
            value={formatCurrencyCompact(salaryPaid)}
            fullValue={formatCurrency(salaryPaid)}
            icon={HandCoins}
            accent="green"
            hint="Selected period"
            onClick={() => toggleCard('salary-paid')}
            selected={isSelected}
          />
        )
      case 'outstanding-advances':
        return (
          <StatCard
            label="Outstanding Advances"
            value={formatCurrencyCompact(outstandingAdvances)}
            fullValue={formatCurrency(outstandingAdvances)}
            icon={HandCoins}
            accent="amber"
            hint="Live balance"
            onClick={() => toggleCard('outstanding-advances')}
            selected={isSelected}
          />
        )
      case 'total-expenses':
        return (
          <StatCard
            label="Total Expenses"
            value={formatCurrencyCompact(totalExpenses)}
            fullValue={formatCurrency(totalExpenses)}
            icon={Wallet}
            accent="cyan"
            hint="Business · Selected period"
            onClick={() => toggleCard('total-expenses')}
            selected={isSelected}
          />
        )
      case 'unit-expenses':
        return (
          <StatCard
            label="Unit Expenses"
            value={formatCurrencyCompact(unitExpensesTotal)}
            fullValue={formatCurrency(unitExpensesTotal)}
            icon={Wallet}
            accent="purple"
            hint="Selected period"
            onClick={() => toggleCard('unit-expenses')}
            selected={isSelected}
          />
        )
      case 'total-collections':
        return (
          <StatCard
            label="Total Collections"
            value={formatCurrencyCompact(periodTotalCollections)}
            fullValue={formatCurrency(periodTotalCollections)}
            icon={Layers}
            accent="cyan"
            hint="Shopify + Courier · Selected period"
            onClick={() => toggleCard('total-collections')}
            selected={isSelected}
          />
        )
      case 'salary-due':
        return (
          <StatCard
            label="Salary Due"
            value={formatCurrencyCompact(salaryDue)}
            fullValue={formatCurrency(salaryDue)}
            icon={Receipt}
            accent={salaryDue > 0 ? 'amber' : 'green'}
            hint="Selected period"
            onClick={() => toggleCard('salary-due')}
            selected={isSelected}
          />
        )
      case 'advances-given':
        return (
          <StatCard
            label="Total Advance Given"
            value={formatCurrencyCompact(periodAdvancesGiven)}
            fullValue={formatCurrency(periodAdvancesGiven)}
            icon={HandCoins}
            accent="red"
            hint="Selected period"
            onClick={() => toggleCard('advances-given')}
            selected={isSelected}
          />
        )
      case 'khadim':
        return (
          <StatCard
            label="Khadim Sahib Expenses"
            value={formatCurrencyCompact(khadimExpenseTotal)}
            fullValue={formatCurrency(khadimExpenseTotal)}
            icon={Receipt}
            accent="cyan"
            hint="Selected period"
            onClick={() => toggleCard('khadim')}
            selected={isSelected}
          />
        )
      case 'zakat-distributed':
        return (
          <StatCard
            label="Zakat Distributed"
            value={formatCurrencyCompact(periodZakatDistributed)}
            fullValue={formatCurrency(periodZakatDistributed)}
            icon={HeartHandshake}
            accent="green"
            hint="Selected period"
            onClick={() => toggleCard('zakat-distributed')}
            selected={isSelected}
          />
        )
      default:
        return null
    }
  }

  function renderDrillDown() {
    if (!expandedId) return null

    switch (expandedId) {
      case 'total-money-out':
        return (
          <DrillDownPanel title="Total Money Out — Breakdown" subtitle="Every category of money paid out, selected period" onClose={() => setExpandedId(null)}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Salaries</p>
                <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(salaryPaid)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Advances</p>
                <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(periodAdvancesGiven)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Business Expenses</p>
                <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Unit Expenses</p>
                <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(unitExpensesTotal)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Zakat</p>
                <p className="mt-1 font-display text-sm font-bold text-white">{formatCurrency(periodZakatDistributed)}</p>
              </div>
            </div>
            <DataTable
              columns={ledgerColumns}
              rows={totalMoneyOutRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search records…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)}
              emptyMessage="No records in this period."
            />
          </DrillDownPanel>
        )
      case 'total-employees':
        return (
          <DrillDownPanel title="Total Employees" subtitle="Live roster — not date-filtered" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={employeeDrillColumns}
              rows={employeeDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search employees…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No employees yet."
            />
          </DrillDownPanel>
        )
      case 'total-payroll':
        return (
          <DrillDownPanel title="Total Payroll" subtitle="Regular employees · Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={payrollDrillColumns}
              rows={payrollDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search employees…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No employees yet."
            />
          </DrillDownPanel>
        )
      case 'salary-paid':
        return (
          <DrillDownPanel title="Salary Paid" subtitle="Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={ledgerColumns}
              rows={salaryPaidDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search payments…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No salary payments in this period."
            />
          </DrillDownPanel>
        )
      case 'outstanding-advances':
        return (
          <DrillDownPanel title="Outstanding Advances" subtitle="Live balance — not date-filtered" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={advanceBalanceDrillColumns}
              rows={outstandingAdvanceDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search employees…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No outstanding advances."
            />
          </DrillDownPanel>
        )
      case 'total-expenses':
        return (
          <DrillDownPanel title="Total Expenses" subtitle="Business · Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={ledgerColumns}
              rows={totalExpensesDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search expenses…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)}
              emptyMessage="No expenses in this period."
            />
          </DrillDownPanel>
        )
      case 'unit-expenses':
        return (
          <DrillDownPanel title="Unit Expenses" subtitle="Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={ledgerColumns}
              rows={unitExpensesDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search expenses…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)}
              emptyMessage="No unit expenses in this period."
            />
          </DrillDownPanel>
        )
      case 'total-collections':
        return (
          <DrillDownPanel title="Total Collections" subtitle="Shopify + Courier · Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={collectionDrillColumns}
              rows={collectionDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search collections…"
              searchFn={(r, q) => r.source.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q)}
              emptyMessage="No collections in this period."
            />
          </DrillDownPanel>
        )
      case 'salary-due':
        return (
          <DrillDownPanel title="Salary Due" subtitle="Regular employees · Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={payrollDrillColumns}
              rows={payrollDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search employees…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No employees yet."
            />
          </DrillDownPanel>
        )
      case 'advances-given':
        return (
          <DrillDownPanel title="Total Advance Given" subtitle="Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={ledgerColumns}
              rows={advancesGivenDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search advances…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No advances given in this period."
            />
          </DrillDownPanel>
        )
      case 'khadim':
        return (
          <DrillDownPanel title="Khadim Sahib Expenses" subtitle="Selected period" onClose={() => setExpandedId(null)}>
            <DataTable
              columns={ledgerColumns}
              rows={khadimDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No Khadim Sahib expenses in this period."
            />
          </DrillDownPanel>
        )
      case 'zakat-distributed':
      case 'zakat-progress':
        return (
          <DrillDownPanel
            title="Zakat — Recipient History"
            subtitle={expandedId === 'zakat-progress' ? 'Selected period (Outstanding Balance above is live, not period-scoped)' : 'Selected period'}
            onClose={() => setExpandedId(null)}
          >
            <DataTable
              columns={ledgerColumns}
              rows={zakatDrillRows}
              getRowId={(r) => r.id}
              searchPlaceholder="Search recipients…"
              searchFn={(r, q) => r.name.toLowerCase().includes(q)}
              emptyMessage="No Zakat distributions in this period."
            />
          </DrillDownPanel>
        )
      default:
        return null
    }
  }

  const expectedSalaryColumns: DataTableColumn<ExpectedSalaryRow>[] = [
    { key: 'name', header: 'Employee', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'Monthly' ? 'cyan' : 'purple'}>{r.type}</Badge> },
    { key: 'group', header: 'Group', render: (r) => (r.group === 'Unit' ? <Badge color="amber">Unit</Badge> : <span className="text-slate-500">Regular</span>) },
    { key: 'expected', header: 'Expected Salary', align: 'right', render: (r) => r.expectedLabel },
  ]

  const categoryColumns: DataTableColumn<CategoryRow>[] = [
    { key: 'name', header: 'Category', render: (r) => r.name },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { key: 'percent', header: '%', align: 'right', render: (r) => `${r.percent.toFixed(1)}%` },
  ]

  const departmentColumns: DataTableColumn<DepartmentRow>[] = [
    { key: 'department', header: 'Department', render: (r) => <span className="font-medium text-white">{r.department}</span> },
    { key: 'payroll', header: 'Payroll', align: 'right', render: (r) => (r.payroll === null ? '—' : formatCurrency(r.payroll)) },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => formatCurrency(r.paid) },
    { key: 'due', header: 'Due', align: 'right', render: (r) => (r.due === null ? '—' : formatCurrency(r.due)) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Business overview at a glance. Click any card for a detailed breakdown.</p>
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        rangeStart={start}
        rangeEnd={end}
      />

      {loaded && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex justify-end">
            <button type="button" onClick={() => setOrder(KPI_CARD_IDS)} className="text-xs font-medium text-slate-500 hover:text-neon-cyan hover:underline">
              Reset card order
            </button>
          </div>
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cardOrder.map((id) => (
                <SortableWidget key={id} id={id}>
                  {renderKpiCard(id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {renderDrillDown()}

      <div>
        <ZakatProgressCard {...zakatProgress} />
        <button
          type="button"
          onClick={() => toggleCard('zakat-progress')}
          className="mt-2 text-xs font-medium text-neon-cyan hover:underline"
        >
          {expandedId === 'zakat-progress' ? 'Hide recipient history' : 'View recipient history'}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Financial Summary</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Courier Collections" value={formatCurrencyCompact(periodCourierCollections)} fullValue={formatCurrency(periodCourierCollections)} icon={HandCoins} accent="green" hint="Selected period" />
          <StatCard label="Shopify Collections" value={formatCurrencyCompact(periodShopifyCollections)} fullValue={formatCurrency(periodShopifyCollections)} icon={Receipt} accent="purple" hint="Selected period" />
          <StatCard label="Office Cash Balance" value={formatCurrencyCompact(cashBalance)} fullValue={formatCurrency(cashBalance)} icon={Wallet} accent="amber" hint="Live balance" />
          <StatCard label="Total Bank Balance" value={formatCurrencyCompact(totalBankBalance)} fullValue={formatCurrency(totalBankBalance)} icon={Receipt} accent="cyan" hint="Live balance" />
          <StatCard label="Total Unit Cost" value={formatCurrencyCompact(totalUnitCost)} fullValue={formatCurrency(totalUnitCost)} icon={Receipt} accent="green" hint="Selected period" />
        </div>
      </div>

      <TrendChart data={trendData} />

      <div className="space-y-4">
        <CollapsibleSection title="Expected Salary By Employee" summary={`${expectedSalaryRows.length} employees · ${formatCurrency(totalPayroll)} total`}>
          <DataTable
            columns={expectedSalaryColumns}
            rows={expectedSalaryRows}
            getRowId={(r) => r.id}
            searchPlaceholder="Search employees…"
            searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)}
            emptyMessage="No employees yet."
          />
        </CollapsibleSection>

        <CollapsibleSection title="Recent Activity" summary="View latest actions across the app">
          <RecentActivityWidget />
        </CollapsibleSection>

        <CollapsibleSection title="Top Expense Categories" summary={`${categoryRows.length} categories · ${formatCurrency(totalExpenses)} total`}>
          <DataTable
            columns={categoryColumns}
            rows={categoryRows}
            getRowId={(r) => r.name}
            searchPlaceholder="Search categories…"
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            emptyMessage="No expenses in this period."
          />
        </CollapsibleSection>

        <CollapsibleSection title="Department Payroll" summary={`${formatCurrency(salaryPaid)} paid this period`}>
          <DataTable columns={departmentColumns} rows={departmentRows} getRowId={(r) => r.department} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
