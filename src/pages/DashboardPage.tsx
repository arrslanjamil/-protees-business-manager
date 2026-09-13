import { useMemo, useState } from 'react'
import { Clock, HandCoins, HeartHandshake, Layers, Receipt, ShoppingBag, Truck, Wallet } from 'lucide-react'
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
import { KpiCard } from '@/components/dashboard/KpiCard'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { DataTable, type DataTableColumn } from '@/components/dashboard/DataTable'
import { ZakatProgressCard } from '@/components/dashboard/ZakatProgressCard'
import { useDashboardLayout, TOP_KPI_IDS, SECONDARY_KPI_IDS, type WidgetId } from '@/hooks/useDashboardLayout'
import { trendBucketsInRange } from '@/lib/dashboardAnalytics'
import { dashboardDateRange, formatCurrency, formatCurrencyCompact, isWithinRange, type DashboardDatePreset } from '@/lib/utils'
import { computeZakatProgress } from '@/lib/zakat'

const DEFAULT_ZAKAT_MONTHLY_BUDGET = 100_000

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

export function DashboardPage() {
  const { employeesWithBalance, supervisorsWithBalance, advances, expenses, salaryPayments, unitPayments, zakatTransactions, zakatSettings } = useData()
  const { shopifyOrders, courierPayments, couriersWithBalance, cashBalance, bankAccountsWithBalance } = useCollections()
  const { order, setOrder, loaded } = useDashboardLayout()

  const [preset, setPreset] = useState<DashboardDatePreset>('today')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('15d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('15d').end)
  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const topOrder = useMemo(() => order.filter((id) => TOP_KPI_IDS.includes(id)), [order])
  const secondaryOrder = useMemo(() => order.filter((id) => SECONDARY_KPI_IDS.includes(id)), [order])

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

  // Outstanding Advances — a live balance, not period-scoped: what's owed
  // right now regardless of which dates are selected.
  const outstandingAdvances =
    employeesWithBalance.reduce((s, e) => s + Math.max(0, e.advanceBalance), 0) +
    supervisorsWithBalance.reduce((s, sup) => s + Math.max(0, sup.advanceBalance), 0)

  // Total Advance Given — how much was actually disbursed in the selected
  // period (distinct from Outstanding Advances, which is the live balance).
  const periodAdvancesGiven = useMemo(
    () => advances.filter((a) => isWithinRange(a.payment_date, start, end)).reduce((s, a) => s + Number(a.amount), 0),
    [advances, start, end]
  )

  // Zakat Distributed — the selected period's distributions, distinct from
  // the Zakat Progress widget's running-balance-since-opening figure.
  const periodZakatDistributed = useMemo(
    () => zakatTransactions.filter((t) => isWithinRange(t.date, start, end)).reduce((s, t) => s + Number(t.amount), 0),
    [zakatTransactions, start, end]
  )

  // --- Collections (Shopify + Courier) — period-scoped, same treatment as
  // Total Advance Given / Zakat Distributed above. Pending Courier Payments
  // is a live accounts-receivable balance, not period-scoped.
  const periodShopifyCollections = useMemo(
    () => shopifyOrders.filter((o) => isWithinRange(o.order_date.slice(0, 10), start, end)).reduce((s, o) => s + Number(o.total_amount), 0),
    [shopifyOrders, start, end]
  )
  const periodCourierCollections = useMemo(
    () => courierPayments.filter((p) => isWithinRange(p.payment_date, start, end)).reduce((s, p) => s + Number(p.amount), 0),
    [courierPayments, start, end]
  )
  const periodTotalCollections = periodShopifyCollections + periodCourierCollections
  const totalPendingCourierPayments = useMemo(() => couriersWithBalance.reduce((s, c) => s + c.pendingBalance, 0), [couriersWithBalance])
  const totalBankBalance = useMemo(() => bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0), [bankAccountsWithBalance])

  // --- Monthly Collection Summary — always the current calendar month,
  // independent of the dashboard's own date filter.
  const monthlyCollectionSummary = useMemo(() => {
    const { start: mStart, end: mEnd } = dashboardDateRange('monthly')
    const shopify = shopifyOrders.filter((o) => isWithinRange(o.order_date.slice(0, 10), mStart, mEnd)).reduce((s, o) => s + Number(o.total_amount), 0)
    const courier = courierPayments.filter((p) => isWithinRange(p.payment_date, mStart, mEnd)).reduce((s, p) => s + Number(p.amount), 0)
    return { shopify, courier, total: shopify + courier }
  }, [shopifyOrders, courierPayments])

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

  // --- Khadim Sahib — derived from expense records, no dedicated table --
  const khadimExpenseTotal = useMemo(
    () => periodExpensesList.filter((e) => isKhadimExpense(e.title, e.category, e.notes)).reduce((s, e) => s + Number(e.amount), 0),
    [periodExpensesList]
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

  function renderTopWidget(id: WidgetId) {
    switch (id) {
      case 'total-employees':
        return <KpiCard label="Total Employees" value={String(employeesWithBalance.length)} tone="info" />
      case 'total-payroll':
        return <KpiCard label="Total Payroll" value={formatCurrencyCompact(totalPayroll)} fullValue={formatCurrency(totalPayroll)} tone="info" />
      case 'salary-paid':
        return <KpiCard label="Salary Paid" value={formatCurrencyCompact(salaryPaid)} fullValue={formatCurrency(salaryPaid)} tone="positive" />
      case 'salary-due':
        return (
          <KpiCard
            label="Salary Due"
            value={formatCurrencyCompact(salaryDue)}
            fullValue={formatCurrency(salaryDue)}
            tone={salaryDue > 0 ? 'due' : 'positive'}
          />
        )
      default:
        return null
    }
  }

  function renderSecondaryWidget(id: WidgetId) {
    switch (id) {
      case 'outstanding-advances':
        return (
          <StatCard
            label="Outstanding Advances"
            value={formatCurrencyCompact(outstandingAdvances)}
            fullValue={formatCurrency(outstandingAdvances)}
            icon={HandCoins}
            accent="amber"
            hint="Live balance"
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
          />
        )
      case 'shopify-collections':
        return (
          <StatCard
            label="Shopify Collections"
            value={formatCurrencyCompact(periodShopifyCollections)}
            fullValue={formatCurrency(periodShopifyCollections)}
            icon={ShoppingBag}
            accent="purple"
            hint="Selected period"
          />
        )
      case 'courier-collections':
        return (
          <StatCard
            label="Courier Collections Received"
            value={formatCurrencyCompact(periodCourierCollections)}
            fullValue={formatCurrency(periodCourierCollections)}
            icon={Truck}
            accent="green"
            hint="Selected period"
          />
        )
      case 'pending-courier-payments':
        return (
          <StatCard
            label="Pending Courier Payments"
            value={formatCurrencyCompact(totalPendingCourierPayments)}
            fullValue={formatCurrency(totalPendingCourierPayments)}
            icon={Clock}
            accent="amber"
            hint="Live balance"
          />
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
        <p className="mt-1 text-sm text-slate-400">Business overview at a glance.</p>
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
          <SortableContext items={topOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {topOrder.map((id) => (
                <SortableWidget key={id} id={id}>
                  {renderTopWidget(id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>

          <SortableContext items={secondaryOrder} strategy={rectSortingStrategy}>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {secondaryOrder.map((id) => (
                <SortableWidget key={id} id={id}>
                  {renderSecondaryWidget(id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ZakatProgressCard {...zakatProgress} />

      <div className="card">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Collections Snapshot</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Cash Balance</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{formatCurrency(cashBalance)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Bank Account Balances</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{formatCurrency(totalBankBalance)}</p>
            {bankAccountsWithBalance.length > 0 && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {bankAccountsWithBalance.map((b) => `${b.name}: ${formatCurrency(b.balance)}`).join(' · ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Monthly Collection Summary</p>
            <p className="mt-1 font-display text-lg font-bold text-neon-green">{formatCurrency(monthlyCollectionSummary.total)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Shopify {formatCurrency(monthlyCollectionSummary.shopify)} · Courier {formatCurrency(monthlyCollectionSummary.courier)}
            </p>
          </div>
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
