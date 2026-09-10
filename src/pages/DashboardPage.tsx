import { useMemo, useState } from 'react'
import { HandCoins, Receipt, Wallet } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useData } from '@/context/DataContext'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { SortableWidget } from '@/components/dashboard/SortableWidget'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { DataTable, type DataTableColumn } from '@/components/dashboard/DataTable'
import { useDashboardLayout, TOP_KPI_IDS, SECONDARY_KPI_IDS, type WidgetId } from '@/hooks/useDashboardLayout'
import { trendBucketsInRange } from '@/lib/dashboardAnalytics'
import { dashboardDateRange, formatCurrency, formatCurrencyCompact, isWithinRange, type DashboardDatePreset } from '@/lib/utils'

function isKhadimExpense(title: string, category: string, notes: string | null): boolean {
  const needle = 'khadim'
  return title.toLowerCase().includes(needle) || category.toLowerCase().includes(needle) || (notes ?? '').toLowerCase().includes(needle)
}

interface ExpectedSalaryRow {
  id: number
  name: string
  type: 'Monthly' | 'Contract'
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
  const { employeesWithBalance, supervisorsWithBalance, expenses, salaryPayments, unitPayments } = useData()
  const { order, setOrder, loaded } = useDashboardLayout()

  const [preset, setPreset] = useState<DashboardDatePreset>('monthly')
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
  const periodSalaryList = useMemo(() => salaryPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [salaryPayments, start, end])
  const periodUnitList = useMemo(() => unitPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [unitPayments, start, end])

  const totalExpenses = periodExpensesList.reduce((s, e) => s + Number(e.amount), 0)
  const periodSalaryNet = periodSalaryList.reduce((s, p) => s + Number(p.net_amount), 0)
  const periodUnitNet = periodUnitList.reduce((s, p) => s + Number(p.net_amount), 0)
  const salaryPaid = periodSalaryNet + periodUnitNet

  // Outstanding Advances — a live balance, not period-scoped: what's owed
  // right now regardless of which dates are selected.
  const outstandingAdvances =
    employeesWithBalance.reduce((s, e) => s + Math.max(0, e.advanceBalance), 0) +
    supervisorsWithBalance.reduce((s, sup) => s + Math.max(0, sup.advanceBalance), 0)

  // --- Payroll -------------------------------------------------------------
  const monthlyEmployees = useMemo(() => employeesWithBalance.filter((e) => e.employee_type === 'monthly'), [employeesWithBalance])
  const totalMonthlyPayroll = monthlyEmployees.reduce((s, e) => s + Number(e.salary), 0)
  const contractPeriodPayments = useMemo(
    () => periodSalaryList.filter((p) => employeesWithBalance.find((e) => e.name === p.employee_name)?.employee_type === 'contract'),
    [periodSalaryList, employeesWithBalance]
  )
  const totalContractPayroll = contractPeriodPayments.reduce((s, p) => s + Number(p.base_amount), 0)
  const totalPayroll = totalMonthlyPayroll + totalContractPayroll
  const salaryDue = Math.max(0, totalPayroll - periodSalaryNet - outstandingAdvances)

  // --- Trend chart: expenses vs salaries, day- or month-bucketed ----------
  const trendBuckets = useMemo(() => trendBucketsInRange(start, end), [start, end])
  const trendData = useMemo(
    () =>
      trendBuckets.map((b) => ({
        label: b.label,
        expenses: expenses.filter((e) => isWithinRange(e.date, b.start, b.end)).reduce((s, e) => s + Number(e.amount), 0),
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

  // --- Expected Salary By Employee ------------------------------------------
  const expectedSalaryRows = useMemo<ExpectedSalaryRow[]>(
    () =>
      employeesWithBalance.map((emp) => {
        if (emp.employee_type === 'monthly') {
          return { id: emp.id, name: emp.name, type: 'Monthly', expectedLabel: formatCurrency(emp.salary), expectedAmount: Number(emp.salary) }
        }
        const payment = periodSalaryList.find((p) => p.employee_name === emp.name)
        if (payment && payment.pieces_completed != null) {
          const rate = Number(payment.rate_per_piece ?? emp.rate_per_piece ?? 0)
          const amount = payment.pieces_completed * rate
          return {
            id: emp.id,
            name: emp.name,
            type: 'Contract',
            expectedLabel: `${payment.pieces_completed} × ${formatCurrency(rate)} = ${formatCurrency(amount)}`,
            expectedAmount: amount,
          }
        }
        return { id: emp.id, name: emp.name, type: 'Contract', expectedLabel: 'No pieces entered', expectedAmount: 0 }
      }),
    [employeesWithBalance, periodSalaryList]
  )

  // --- Top Expense Categories ------------------------------------------------
  const categoryRows = useMemo<CategoryRow[]>(() => {
    const totals = new Map<string, number>()
    for (const e of periodExpensesList) totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount))
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
  }, [periodExpensesList, totalExpenses])

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
      case 'total-expenses':
        return (
          <StatCard
            label="Total Expenses"
            value={formatCurrencyCompact(totalExpenses)}
            fullValue={formatCurrency(totalExpenses)}
            icon={Wallet}
            accent="cyan"
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
      default:
        return null
    }
  }

  const expectedSalaryColumns: DataTableColumn<ExpectedSalaryRow>[] = [
    { key: 'name', header: 'Employee', render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'Monthly' ? 'cyan' : 'purple'}>{r.type}</Badge> },
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
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {secondaryOrder.map((id) => (
                <SortableWidget key={id} id={id}>
                  {renderSecondaryWidget(id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
