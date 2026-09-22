import { useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { useAttendance } from '@/context/AttendanceContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { isCashPaymentMethod, MONTH_NAMES, type SalaryPaymentMethod, SALARY_PAYMENT_METHODS, SALARY_PAYMENT_METHOD_LABELS } from '@/lib/types'
import { computePayrollDeductions, formatHours, summarizeAttendance } from '@/lib/attendance'
import { classNames, errorMessage, formatCurrency, formatDate, todayISO } from '@/lib/utils'

const now = new Date()

export function SalaryPage() {
  const { employeesWithBalance, salaryPayments, recordSalaryPayment, deleteSalaryPayment, suggestedDeduction, balanceFor } = useData()
  const { cashBalance, bankAccountsWithBalance } = useCollections()
  const { attendance, attendanceSettings } = useAttendance()
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeName, setEmployeeName] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [piecesCompleted, setPiecesCompleted] = useState('')
  const [overtimeAmount, setOvertimeAmount] = useState('')
  const [includeOvertime, setIncludeOvertime] = useState(false)
  const [deduction, setDeduction] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState<SalaryPaymentMethod>('Cash')
  const [bankAccountId, setBankAccountId] = useState<number | ''>('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [allowNegativeCash, setAllowNegativeCash] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only active employees can be picked for a NEW payment — historical
  // payments to someone since marked inactive stay untouched below.
  const activeEmployees = useMemo(() => employeesWithBalance.filter((e) => e.is_active), [employeesWithBalance])

  const selectedEmployee = employeesWithBalance.find((e) => e.name === employeeName)
  const isContract = selectedEmployee?.employee_type === 'contract'
  const ratePerPiece = selectedEmployee?.rate_per_piece ?? 0

  const sortedPayments = useMemo(
    () => [...salaryPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [salaryPayments]
  )
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])

  // --- Attendance for the selected employee + pay period ----------------------
  const daysInMonth = new Date(year, month, 0).getDate()
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const periodAttendance = useMemo(
    () => (selectedEmployee ? attendance.filter((a) => a.employee_id === selectedEmployee.id && a.date >= periodStart && a.date <= periodEnd) : []),
    [attendance, selectedEmployee, periodStart, periodEnd]
  )
  const attendanceSummary = useMemo(() => summarizeAttendance(periodAttendance), [periodAttendance])
  const deductionBreakdown = useMemo(
    () =>
      attendanceSettings && selectedEmployee
        ? computePayrollDeductions(attendanceSummary, Number(selectedEmployee.salary), daysInMonth, attendanceSettings)
        : null,
    [attendanceSummary, attendanceSettings, selectedEmployee, daysInMonth]
  )
  // Overtime Rs available if the checkbox is checked — derived from the
  // employee's monthly salary (hourly rate = salary / (days × standard
  // hours)). Only meaningful for monthly employees; contract employees
  // keep the plain manual Overtime field below, unchanged.
  const hourlyRate = !isContract && attendanceSettings && selectedEmployee ? Number(selectedEmployee.salary) / (daysInMonth * attendanceSettings.standard_working_hours) : 0
  const computedOvertimeAmount = Math.round(attendanceSummary.totalOvertimeHours * hourlyRate)

  function openCreate() {
    setEmployeeName('')
    setBaseAmount('')
    setPiecesCompleted('')
    setOvertimeAmount('')
    setIncludeOvertime(false)
    setDeduction('')
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setPaymentDate(todayISO())
    setPaymentMethod('Cash')
    setBankAccountId('')
    setReferenceNumber('')
    setAllowNegativeCash(false)
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  function handleEmployeeChange(name: string) {
    setEmployeeName(name)
    const emp = employeesWithBalance.find((e) => e.name === name)
    if (!emp) return
    setPiecesCompleted('')
    setIncludeOvertime(false)
    if (emp.employee_type === 'contract') {
      setBaseAmount('')
      setDeduction('0')
    } else {
      setBaseAmount(String(emp.salary))
      setDeduction(String(suggestedDeduction(name, 'cutting_department', Number(emp.salary))))
    }
  }

  function handlePiecesChange(value: string) {
    setPiecesCompleted(value)
    if (isContract && employeeName) {
      const gross = (Number(value) || 0) * ratePerPiece
      setDeduction(String(suggestedDeduction(employeeName, 'cutting_department', gross)))
    }
  }

  const currentBalance = employeeName ? balanceFor(employeeName, 'cutting_department') : 0
  const pieces = Number(piecesCompleted) || 0
  const base = isContract ? pieces * ratePerPiece : Number(baseAmount) || 0
  // For monthly employees the checkbox drives the Rs amount; contract
  // employees still type it in manually (unchanged from before).
  const overtime = isContract ? Number(overtimeAmount) || 0 : includeOvertime ? computedOvertimeAmount : 0
  const ded = Number(deduction) || 0
  const attendanceDeductionTotal = deductionBreakdown?.totalDeduction ?? 0
  const net = Math.max(0, base + overtime - ded - attendanceDeductionTotal)
  const isCash = isCashPaymentMethod(paymentMethod)
  const projectedCashBalance = cashBalance - net
  const wouldGoNegative = isCash && net > 0 && projectedCashBalance < 0

  async function handleSave() {
    if (!employeeName) {
      setError('Select an employee.')
      return
    }
    if (isContract) {
      if (Number.isNaN(pieces) || pieces <= 0) {
        setError('Enter a valid number of pieces completed.')
        return
      }
    } else if (Number.isNaN(base) || base < 0) {
      setError('Enter a valid base salary amount.')
      return
    }
    if (overtime < 0) {
      setError('Overtime cannot be negative.')
      return
    }
    if (ded < 0 || ded > base + overtime) {
      setError('Deduction cannot be negative or exceed the gross amount + overtime.')
      return
    }
    if (ded > currentBalance) {
      setError(`Deduction can't exceed the outstanding advance balance (${formatCurrency(currentBalance)}).`)
      return
    }
    if (!isCash && !bankAccountId) {
      setError('Select a bank account for an Online payment.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await recordSalaryPayment({
        employeeName,
        baseAmount: base,
        overtimeAmount: overtime,
        deductionAmount: ded,
        month,
        year,
        paymentDate,
        notes: notes.trim() || undefined,
        piecesCompleted: isContract ? pieces : null,
        ratePerPiece: isContract ? ratePerPiece : null,
        paymentMethod,
        bankAccountId: isCash ? null : Number(bankAccountId),
        referenceNumber: isCash ? undefined : referenceNumber.trim() || undefined,
        allowNegativeCash,
        overtimeHours: isContract ? null : attendanceSummary.totalOvertimeHours || null,
        overtimeIncluded: isContract ? overtime > 0 : includeOvertime,
        absentDeduction: deductionBreakdown?.absentDeduction ?? 0,
        lateDeduction: deductionBreakdown?.lateDeduction ?? 0,
        leaveDeduction: deductionBreakdown?.leaveDeduction ?? 0,
      })
      setModalOpen(false)
    } catch (err) {
      setError(errorMessage(err, 'Failed to record salary payment.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this salary payment record? Linked advance deductions will also be removed.')) return
    await deleteSalaryPayment(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Salary</h1>
          <p className="mt-1 text-sm text-slate-400">Monthly payroll. Attendance-based deductions apply automatically; overtime needs your approval.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {sortedPayments.length === 0 ? (
        <EmptyState icon={Wallet} title="No salary payments yet" description="Record your first salary payment to see history here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Base</th>
                <th className="px-5 py-3.5">Overtime</th>
                <th className="px-5 py-3.5">Deductions</th>
                <th className="px-5 py-3.5">Net Paid</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Added By</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((p) => {
                const totalDeduction = Number(p.deduction_amount) + Number(p.absent_deduction) + Number(p.late_deduction) + Number(p.leave_deduction)
                return (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{p.employee_name}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {formatCurrency(p.base_amount)}
                      {p.pieces_completed != null && p.rate_per_piece != null && (
                        <span className="ml-1.5 text-[11px] text-slate-500">
                          ({p.pieces_completed} × {formatCurrency(p.rate_per_piece)})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.overtime_amount > 0 ? (
                        <span className="text-neon-cyan">+{formatCurrency(p.overtime_amount)}</span>
                      ) : p.overtime_hours ? (
                        <span className="text-slate-500" title="Available but not included">
                          {formatHours(p.overtime_hours)} unused
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {totalDeduction > 0 ? (
                        <div>
                          <Badge color="red">-{formatCurrency(totalDeduction)}</Badge>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {[
                              Number(p.deduction_amount) > 0 && `Advance ${formatCurrency(p.deduction_amount)}`,
                              Number(p.absent_deduction) > 0 && `Absent ${formatCurrency(p.absent_deduction)}`,
                              Number(p.late_deduction) > 0 && `Late ${formatCurrency(p.late_deduction)}`,
                              Number(p.leave_deduction) > 0 && `Leave ${formatCurrency(p.leave_deduction)}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(p.net_amount)}</td>
                    <td className="px-5 py-3.5">
                      {p.payment_method ? <Badge color="slate">{p.payment_method}</Badge> : <span className="text-slate-600">—</span>}
                      {p.bank_account_id != null && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{bankNameById.get(p.bank_account_id) ?? 'Bank'}</p>
                      )}
                      {p.reference_number && <p className="mt-0.5 text-[11px] text-slate-500">Ref: {p.reference_number}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.created_by_username ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Salary Payment" subtitle="Attendance-based deductions apply automatically; overtime needs your approval" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="label-field">Employee</label>
            <SearchableSelect
              value={employeeName}
              onChange={handleEmployeeChange}
              options={activeEmployees.map((emp) => ({ value: emp.name, label: emp.name }))}
              placeholder="Select employee…"
              searchPlaceholder="Search employee…"
              emptyMessage="No employee found"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Month</label>
              <select className="input-field" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Year</label>
              <input type="number" className="input-field" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>

          {isContract ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Pieces completed</label>
                <input
                  type="number"
                  className="input-field"
                  value={piecesCompleted}
                  onChange={(e) => handlePiecesChange(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="label-field">Rate per piece</label>
                <input type="text" className="input-field opacity-70" value={formatCurrency(ratePerPiece)} readOnly />
              </div>
            </div>
          ) : (
            <div>
              <label className="label-field">Base salary</label>
              <input type="number" className="input-field" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
            </div>
          )}

          {isContract && (
            <div>
              <label className="label-field">Overtime (Rs)</label>
              <input type="number" className="input-field" value={overtimeAmount} onChange={(e) => setOvertimeAmount(e.target.value)} placeholder="0" />
            </div>
          )}

          {employeeName && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance — {MONTH_NAMES[month - 1]} {year}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
                <div>
                  <p className="font-display text-sm font-bold text-neon-green">{attendanceSummary.presentDays}</p>
                  <p className="text-slate-500">Present</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-neon-red">{attendanceSummary.absentDays}</p>
                  <p className="text-slate-500">Absent</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-neon-amber">{attendanceSummary.lateDays}</p>
                  <p className="text-slate-500">Late</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-neon-purple">{attendanceSummary.paidLeaveDays + attendanceSummary.unpaidLeaveDays}</p>
                  <p className="text-slate-500">On Leave</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-white">{attendanceSummary.holidayDays}</p>
                  <p className="text-slate-500">Holiday</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-neon-cyan">{formatHours(attendanceSummary.totalOvertimeHours)}</p>
                  <p className="text-slate-500">Overtime</p>
                </div>
              </div>

              {!isContract && attendanceSummary.totalOvertimeHours > 0 && (
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
                  <span className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={includeOvertime} onChange={(e) => setIncludeOvertime(e.target.checked)} />
                    Include Overtime In Salary ({formatHours(attendanceSummary.totalOvertimeHours)} available)
                  </span>
                  <span className="text-xs font-semibold text-neon-cyan">+{formatCurrency(computedOvertimeAmount)}</span>
                </label>
              )}

              {deductionBreakdown && attendanceDeductionTotal > 0 && (
                <div className="space-y-1 text-xs text-slate-400">
                  {deductionBreakdown.absentDeduction > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Absent Deduction</span>
                      <span className="text-neon-red">-{formatCurrency(deductionBreakdown.absentDeduction)}</span>
                    </div>
                  )}
                  {deductionBreakdown.leaveDeduction > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Unpaid Leave Deduction</span>
                      <span className="text-neon-red">-{formatCurrency(deductionBreakdown.leaveDeduction)}</span>
                    </div>
                  )}
                  {deductionBreakdown.lateDeduction > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Late Deduction</span>
                      <span className="text-neon-red">-{formatCurrency(deductionBreakdown.lateDeduction)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {employeeName && (
            <div>
              <label className="label-field">
                Auto deduction from advance <span className="text-slate-600">(outstanding: {formatCurrency(currentBalance)})</span>
              </label>
              <input type="number" className="input-field" value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0" />
              <div className="mt-2 space-y-1.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
                {isContract && (
                  <div className="flex items-center justify-between">
                    <span>Pieces Completed</span>
                    <span className="text-slate-300">{pieces}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>{isContract ? 'Gross Amount' : 'Salary Amount'}</span>
                  <span className="text-slate-300">{formatCurrency(base)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Overtime Amount</span>
                  <span className="text-neon-cyan">+{formatCurrency(overtime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Advances Deducted</span>
                  <span className="text-neon-red">-{formatCurrency(ded)}</span>
                </div>
                {attendanceDeductionTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Attendance Deductions</span>
                    <span className="text-neon-red">-{formatCurrency(attendanceDeductionTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-semibold">
                  <span className="text-slate-300">Final Payable Amount</span>
                  <span className="text-neon-green">{formatCurrency(net)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Payment date</label>
              <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Notes (optional)</label>
              <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="label-field">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {SALARY_PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m)
                    if (m === 'Online' && !bankAccountId) setBankAccountId(bankAccountsWithBalance[0]?.id ?? '')
                  }}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    paymentMethod === m ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {SALARY_PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {isCash ? (
            <p className="text-[11px] text-slate-500">Deducted from Office Cash immediately (current balance: {formatCurrency(cashBalance)}).</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label-field">Bank Account</label>
                <select className="input-field" value={bankAccountId} onChange={(e) => setBankAccountId(Number(e.target.value))}>
                  {bankAccountsWithBalance.length === 0 && <option value="">No bank accounts yet — add one from Collections</option>}
                  {bankAccountsWithBalance.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatCurrency(b.balance)})
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500">Deducted from this bank account immediately.</p>
              </div>
              <div>
                <label className="label-field">Transaction Reference (optional)</label>
                <input
                  className="input-field"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. Bank transfer ID, Easypaisa TID"
                />
              </div>
            </div>
          )}

          {wouldGoNegative && (
            <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
              <p className="text-xs text-neon-amber">This would take Office Cash to {formatCurrency(projectedCashBalance)} (negative).</p>
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={allowNegativeCash} onChange={(e) => setAllowNegativeCash(e.target.checked)} />
                Allow negative Office Cash balance and save anyway
              </label>
            </div>
          )}

          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || (wouldGoNegative && !allowNegativeCash)}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
