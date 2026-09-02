import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Banknote, Boxes, FileBarChart, HandCoins, Receipt, Users, Wallet } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useData } from '@/context/DataContext'
import { SortableSection } from '@/components/dashboard/SortableSection'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { FinancialSummarySection } from '@/components/dashboard/FinancialSummarySection'
import { EmployeesSection } from '@/components/dashboard/EmployeesSection'
import { ProteesUnitSection } from '@/components/dashboard/ProteesUnitSection'
import { SalarySection } from '@/components/dashboard/SalarySection'
import { AdvancesSection } from '@/components/dashboard/AdvancesSection'
import { ExpensesSection } from '@/components/dashboard/ExpensesSection'
import { ReportsSection } from '@/components/dashboard/ReportsSection'
import { loadDashboardOrder, saveDashboardOrder, type DashboardSectionId } from '@/lib/dashboardLayout'
import { colorForIndex, monthBucketsInRange } from '@/lib/dashboardAnalytics'
import { type Department } from '@/lib/types'
import { dashboardDateRange, isWithinRange, type DashboardDatePreset } from '@/lib/utils'

const SECTION_META: Record<DashboardSectionId, { title: string; icon: ReactNode }> = {
  financial: { title: 'Grand Total', icon: <Wallet size={14} className="text-neon-green" /> },
  employees: { title: 'Employees', icon: <Users size={14} className="text-neon-cyan" /> },
  protees_unit: { title: 'Protees Unit', icon: <Boxes size={14} className="text-neon-purple" /> },
  salary: { title: 'Salary', icon: <Banknote size={14} className="text-neon-amber" /> },
  advances: { title: 'Advances', icon: <HandCoins size={14} className="text-neon-amber" /> },
  expenses: { title: 'Expenses', icon: <Receipt size={14} className="text-neon-red" /> },
  reports: { title: 'Reports', icon: <FileBarChart size={14} className="text-neon-cyan" /> },
}

export function DashboardPage() {
  const { employeesWithBalance, supervisorsWithBalance, expenses, salaryPayments, unitPayments, advances, advanceDeductions, khadimTotals } =
    useData()

  const [order, setOrder] = useState<DashboardSectionId[]>(() => loadDashboardOrder())
  const [preset, setPreset] = useState<DashboardDatePreset>('6m')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('30d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('30d').end)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as DashboardSectionId)
      const newIndex = prev.indexOf(over.id as DashboardSectionId)
      const next = arrayMove(prev, oldIndex, newIndex)
      saveDashboardOrder(next)
      return next
    })
  }

  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // --- Unfiltered "current" figures — identical to the original dashboard, kept as-is. ---
  const totalOutstandingAdvances =
    employeesWithBalance.reduce((sum, e) => sum + Math.max(0, e.advanceBalance), 0) +
    supervisorsWithBalance.reduce((sum, s) => sum + Math.max(0, s.advanceBalance), 0)

  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  }
  const isCurrentYear = (dateStr: string) => new Date(dateStr).getFullYear() === currentYear

  const currentMonthCost =
    salaryPayments.filter((p) => p.month === currentMonth && p.year === currentYear).reduce((s, p) => s + Number(p.net_amount), 0) +
    unitPayments.filter((p) => p.month === currentMonth && p.year === currentYear).reduce((s, p) => s + Number(p.net_amount), 0) +
    expenses.filter((e) => isCurrentMonth(e.date)).reduce((s, e) => s + Number(e.amount), 0)

  const currentYearCost =
    salaryPayments.filter((p) => p.year === currentYear).reduce((s, p) => s + Number(p.net_amount), 0) +
    unitPayments.filter((p) => p.year === currentYear).reduce((s, p) => s + Number(p.net_amount), 0) +
    expenses.filter((e) => isCurrentYear(e.date)).reduce((s, e) => s + Number(e.amount), 0)

  // --- Filtered-by-period figures, driven by the flexible date filter. ---
  const periodExpensesList = useMemo(() => expenses.filter((e) => isWithinRange(e.date, start, end)), [expenses, start, end])
  const periodSalaryList = useMemo(() => salaryPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [salaryPayments, start, end])
  const periodUnitList = useMemo(() => unitPayments.filter((p) => isWithinRange(p.payment_date, start, end)), [unitPayments, start, end])
  const periodAdvancesList = useMemo(() => advances.filter((a) => isWithinRange(a.payment_date, start, end)), [advances, start, end])
  const periodDeductionsList = useMemo(() => advanceDeductions.filter((d) => isWithinRange(d.date, start, end)), [advanceDeductions, start, end])

  const periodExpenses = periodExpensesList.reduce((s, e) => s + Number(e.amount), 0)
  const periodSalaryNet = periodSalaryList.reduce((s, p) => s + Number(p.net_amount), 0)
  const periodSalaryBase = periodSalaryList.reduce((s, p) => s + Number(p.base_amount), 0)
  const periodSalaryOvertime = periodSalaryList.reduce((s, p) => s + Number(p.overtime_amount), 0)
  const periodSalaryDeduction = periodSalaryList.reduce((s, p) => s + Number(p.deduction_amount), 0)
  const periodUnitNet = periodUnitList.reduce((s, p) => s + Number(p.net_amount), 0)
  const periodUnitOvertime = periodUnitList.reduce((s, p) => s + Number(p.overtime_amount), 0)
  const periodAdvancesCutting = periodAdvancesList.filter((a) => a.department === 'cutting_department').reduce((s, a) => s + Number(a.amount), 0)
  const periodAdvancesUnit = periodAdvancesList.filter((a) => a.department === 'protees_unit').reduce((s, a) => s + Number(a.amount), 0)
  const periodAdvancesTotal = periodAdvancesCutting + periodAdvancesUnit
  const periodAdvancesRepaid = periodDeductionsList.reduce((s, d) => s + Number(d.amount), 0)

  const outstandingCutting = employeesWithBalance.reduce((s, e) => s + Math.max(0, e.advanceBalance), 0)
  const outstandingUnit = supervisorsWithBalance.reduce((s, s2) => s + Math.max(0, s2.advanceBalance), 0)

  const activeEmployeeNames = useMemo(() => new Set(periodSalaryList.map((p) => p.employee_name)), [periodSalaryList])
  const activeEmployees = employeesWithBalance.filter((e) => activeEmployeeNames.has(e.name)).length

  const months = useMemo(() => monthBucketsInRange(start, end), [start, end])

  const unitTrend = useMemo(
    () =>
      months.map((m) => ({
        label: m.label,
        net: unitPayments.filter((p) => p.month === m.month && p.year === m.year).reduce((s, p) => s + Number(p.net_amount), 0),
      })),
    [months, unitPayments]
  )

  const cuttingTrend = useMemo(
    () =>
      months.map((m) => ({
        label: m.label,
        net: salaryPayments.filter((p) => p.month === m.month && p.year === m.year).reduce((s, p) => s + Number(p.net_amount), 0),
      })),
    [months, salaryPayments]
  )

  const expenseMonthlyTrend = useMemo(
    () =>
      months.map((m) => ({
        label: m.label,
        total: expenses
          .filter((e) => {
            const d = new Date(e.date)
            return d.getMonth() + 1 === m.month && d.getFullYear() === m.year
          })
          .reduce((s, e) => s + Number(e.amount), 0),
      })),
    [months, expenses]
  )

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const e of periodExpensesList) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount))
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: colorForIndex(i) }))
  }, [periodExpensesList])

  const riskiest = useMemo(() => {
    const people = [
      ...employeesWithBalance.map((e) => ({ name: e.name, department: 'cutting_department' as Department, payAmount: Number(e.salary), advanceBalance: e.advanceBalance })),
      ...supervisorsWithBalance.map((s) => ({ name: s.name, department: 'protees_unit' as Department, payAmount: 0, advanceBalance: s.advanceBalance })),
    ]
    return people.filter((p) => p.advanceBalance > 0).sort((a, b) => b.advanceBalance - a.advanceBalance).slice(0, 5)
  }, [employeesWithBalance, supervisorsWithBalance])

  function renderSection(id: DashboardSectionId) {
    switch (id) {
      case 'financial':
        return (
          <FinancialSummarySection
            currentMonthCost={currentMonthCost}
            currentYearCost={currentYearCost}
            totalOutstandingAdvances={totalOutstandingAdvances}
            khadimBalance={khadimTotals.balance}
            periodExpenses={periodExpenses}
            periodPayroll={periodSalaryNet + periodUnitNet}
            periodAdvancesGiven={periodAdvancesTotal}
          />
        )
      case 'employees':
        return (
          <EmployeesSection
            totalEmployees={employeesWithBalance.length}
            activeEmployees={activeEmployees}
            periodSalaryPaid={periodSalaryNet}
            periodAdvancesGiven={periodAdvancesCutting}
            outstandingAdvances={outstandingCutting}
            trend={cuttingTrend}
          />
        )
      case 'protees_unit':
        return (
          <ProteesUnitSection
            periodUnitPayments={periodUnitNet}
            periodUnitAdvances={periodAdvancesUnit}
            outstandingUnitBalance={outstandingUnit}
            periodOvertimePaid={periodUnitOvertime}
            trend={unitTrend}
          />
        )
      case 'salary':
        return (
          <SalarySection
            periodNetPaid={periodSalaryNet}
            periodOvertime={periodSalaryOvertime}
            periodPaymentCount={periodSalaryList.length}
            periodAveragePayment={periodSalaryList.length > 0 ? periodSalaryNet / periodSalaryList.length : 0}
            composition={[
              { label: 'Base', value: periodSalaryBase, fill: '#22d3ee' },
              { label: 'Overtime', value: periodSalaryOvertime, fill: '#fbbf24' },
              { label: 'Deducted', value: periodSalaryDeduction, fill: '#f87171' },
            ]}
          />
        )
      case 'advances':
        return (
          <AdvancesSection
            periodAdvancesGiven={periodAdvancesTotal}
            periodAdvancesRepaid={periodAdvancesRepaid}
            outstandingAdvances={totalOutstandingAdvances}
            riskiest={riskiest}
          />
        )
      case 'expenses':
        return (
          <ExpensesSection
            periodTotalExpenses={periodExpenses}
            categoryCount={categoryBreakdown.length}
            topCategory={categoryBreakdown[0] ?? null}
            categoryBreakdown={categoryBreakdown}
            monthlyTrend={expenseMonthlyTrend}
          />
        )
      case 'reports':
        return (
          <ReportsSection
            periodGrandTotal={periodUnitNet + periodSalaryNet + periodAdvancesTotal + periodExpenses}
            periodTransactionCount={periodUnitList.length + periodSalaryList.length + periodAdvancesList.length + periodExpensesList.length}
            unitPaymentCount={periodUnitList.length}
            salaryPaymentCount={periodSalaryList.length}
            advanceCount={periodAdvancesList.length}
            expenseCount={periodExpensesList.length}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">A live overview of both business units. Drag the handle on any section to reorder it.</p>
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {order.map((id) => (
              <SortableSection key={id} id={id} title={SECTION_META[id].title} icon={SECTION_META[id].icon}>
                {renderSection(id)}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
