import { useMemo, useState } from 'react'
import { Banknote, HandCoins, ReceiptText, Wallet } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useData } from '@/context/DataContext'
import { StatCard } from '@/components/ui/StatCard'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { KhadimExpenseCard } from '@/components/dashboard/KhadimExpenseCard'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { SortableWidget } from '@/components/dashboard/SortableWidget'
import { useDashboardLayout, type WidgetId } from '@/hooks/useDashboardLayout'
import { trendBucketsInRange } from '@/lib/dashboardAnalytics'
import { dashboardDateRange, formatCurrency, isWithinRange, type DashboardDatePreset } from '@/lib/utils'

function isKhadimExpense(title: string, category: string, notes: string | null): boolean {
  const needle = 'khadim'
  return title.toLowerCase().includes(needle) || category.toLowerCase().includes(needle) || (notes ?? '').toLowerCase().includes(needle)
}

const FULL_WIDTH_WIDGETS = new Set<WidgetId>(['trend-chart', 'khadim', 'recent-activity'])

export function DashboardPage() {
  const { employeesWithBalance, supervisorsWithBalance, expenses, salaryPayments, unitPayments } = useData()
  const { order, setOrder, loaded } = useDashboardLayout()

  const [preset, setPreset] = useState<DashboardDatePreset>('monthly')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('15d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('15d').end)
  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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
  const totalSalaries = periodSalaryNet + periodUnitNet

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

  function renderWidget(id: WidgetId) {
    switch (id) {
      case 'total-expenses':
        return <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={Wallet} accent="red" hint="Selected period" />
      case 'total-salaries':
        return <StatCard label="Total Salaries Paid" value={formatCurrency(totalSalaries)} icon={Banknote} accent="cyan" hint="Selected period" />
      case 'outstanding-advances':
        return <StatCard label="Outstanding Advances" value={formatCurrency(outstandingAdvances)} icon={HandCoins} accent="amber" hint="Live balance" />
      case 'total-payroll':
        return <StatCard label="Total Payroll" value={formatCurrency(totalPayroll)} icon={ReceiptText} accent="purple" hint="Active employees" />
      case 'trend-chart':
        return <TrendChart data={trendData} />
      case 'khadim':
        return <KhadimExpenseCard amount={khadimExpenseTotal} />
      case 'recent-activity':
        return <RecentActivityWidget />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Business overview at a glance. Drag any card to reorder your layout.</p>
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
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {order.map((id) => (
                <SortableWidget key={id} id={id} className={FULL_WIDTH_WIDGETS.has(id) ? 'sm:col-span-2 xl:col-span-4' : undefined}>
                  {renderWidget(id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
