import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type {
  Advance,
  AdvanceDeduction,
  Department,
  Employee,
  EmployeeGroup,
  EmployeeType,
  EmployeeWithBalance,
  Expense,
  ExpenseCategory,
  ExpenseScope,
  IncrementType,
  KhadimTransaction,
  KhadimTransactionType,
  SalaryIncrement,
  SalaryPayment,
  Supervisor,
  SupervisorWithBalance,
  Unit,
  UnitPayment,
  ZakatSettings,
  ZakatTransaction,
} from '@/lib/types'
import { isCashPaymentMethod, sortExpenseCategoryNames, type ExpensePaymentSource } from '@/lib/types'
import { formatCurrency, todayISO } from '@/lib/utils'
import { useCollections } from '@/context/CollectionsContext'

interface ExpenseInput {
  title: string
  category: string
  amount: number
  date?: string
  notes?: string
  expenseScope?: ExpenseScope
  paymentSource: ExpensePaymentSource
  /** Explicit acknowledgement to let a cash expense push Office Cash
   * negative — off by default (see requirement: "prevented unless admin
   * override is enabled"). */
  allowNegativeCash?: boolean
}

interface RecordSalaryInput {
  employeeName: string
  baseAmount: number
  overtimeAmount: number
  deductionAmount: number
  month: number
  year: number
  paymentDate?: string
  notes?: string
  piecesCompleted?: number | null
  ratePerPiece?: number | null
  /** 'Cash' (default) deducts from Office Cash; 'Online' deducts from
   * bankAccountId instead — see SalaryPage's payment method toggle. */
  paymentMethod?: string
  /** Required when paymentMethod is 'Online' — which bank account the net
   * amount is deducted from. */
  bankAccountId?: number | null
  /** Optional manual trace (bank transfer ID, Easypaisa TID, ...) —
   * no longer required now that Online payments link to a real bank
   * transaction, but still useful for reconciliation notes. */
  referenceNumber?: string
  /** Explicit acknowledgement to let a cash payment push Office Cash
   * negative — same override pattern as expenses. */
  allowNegativeCash?: boolean
  /** Attendance-derived figures snapshotted at payment time (see
   * src/lib/attendance.ts). overtimeAmount already carries the Rs amount
   * to add — only actually added to net if overtimeIncluded is true. */
  overtimeHours?: number | null
  overtimeIncluded?: boolean
  absentDeduction?: number
  lateDeduction?: number
  leaveDeduction?: number
}

interface AddSalaryIncrementInput {
  employeeId: number
  incrementType: IncrementType
  /** Raw number the admin entered — Rs for 'fixed', a percentage number
   * (e.g. 10 for 10%) for 'percentage'. */
  incrementValue: number
  incrementDate?: string
  notes?: string
}

interface RecordUnitPaymentInput {
  supervisorName: string
  paymentDate?: string
  totalAmount: number
  overtimeAmount: number
  advanceGiven: number
  notes?: string
}

export interface KhadimTotals {
  totalGiven: number
  totalBills: number
  balance: number
}

interface DataContextValue {
  loading: boolean
  error: string | null
  configured: boolean
  units: Unit[]
  employees: Employee[]
  supervisors: Supervisor[]
  advances: Advance[]
  salaryPayments: SalaryPayment[]
  salaryIncrements: SalaryIncrement[]
  unitPayments: UnitPayment[]
  advanceDeductions: AdvanceDeduction[]
  expenses: Expense[]
  expenseCategories: ExpenseCategory[]
  expenseCategoryNames: string[]
  khadimTransactions: KhadimTransaction[]
  khadimTotals: KhadimTotals
  zakatTransactions: ZakatTransaction[]
  zakatSettings: ZakatSettings | null
  employeesWithBalance: EmployeeWithBalance[]
  supervisorsWithBalance: SupervisorWithBalance[]
  balanceFor: (name: string, department: Department) => number
  refreshAll: () => Promise<void>

  addUnit: (input: { name: string; location?: string | null }) => Promise<void>
  updateUnit: (id: number, input: { name: string; location?: string | null }) => Promise<void>
  deleteUnit: (id: number) => Promise<void>

  addEmployee: (input: {
    name: string
    salary: number
    joinDate?: string | null
    employeeType?: EmployeeType
    ratePerPiece?: number | null
    employeeGroup?: EmployeeGroup
    employeeCode?: string | null
    department?: string | null
    salaryDate?: number | null
    machineUserId?: string | null
  }) => Promise<void>
  updateEmployee: (
    id: number,
    input: Partial<{
      name: string
      salary: number
      joinDate: string | null
      employeeType: EmployeeType
      ratePerPiece: number | null
      employeeGroup: EmployeeGroup
      employeeCode: string | null
      department: string | null
      salaryDate: number | null
      machineUserId: string | null
    }>
  ) => Promise<void>
  deleteEmployee: (id: number) => Promise<void>
  setEmployeeActive: (id: number, isActive: boolean) => Promise<void>

  addSupervisor: (input: { name: string }) => Promise<void>
  updateSupervisor: (id: number, input: { name: string }) => Promise<void>
  deleteSupervisor: (id: number) => Promise<void>

  addAdvance: (input: {
    name: string
    department: Department
    amount: number
    paymentDate?: string
    notes?: string
    paymentMethod?: string
    referenceNumber?: string
    allowNegativeCash?: boolean
  }) => Promise<void>
  deleteAdvance: (id: number) => Promise<void>

  recordSalaryPayment: (input: RecordSalaryInput) => Promise<void>
  deleteSalaryPayment: (id: number) => Promise<void>

  addSalaryIncrement: (input: AddSalaryIncrementInput) => Promise<void>

  recordUnitPayment: (input: RecordUnitPaymentInput) => Promise<void>
  deleteUnitPayment: (id: number) => Promise<void>

  addExpense: (input: ExpenseInput) => Promise<void>
  updateExpense: (id: number, input: ExpenseInput) => Promise<void>
  deleteExpense: (id: number) => Promise<void>

  addExpenseCategory: (name: string) => Promise<void>

  addKhadimPayment: (input: { date?: string; amount: number; notes?: string }) => Promise<void>
  addKhadimBill: (input: { date?: string; amount: number; description: string }) => Promise<void>
  deleteKhadimTransaction: (id: number) => Promise<void>

  addZakatTransaction: (input: { recipientName: string; amount: number; date?: string; notes?: string }) => Promise<void>
  deleteZakatTransaction: (id: number) => Promise<void>
  updateZakatBudget: (monthlyBudget: number) => Promise<void>

  suggestedDeduction: (name: string, department: Department, payAmount: number) => number
  findEmployeeByName: (name: string) => Employee | undefined
  findSupervisorByName: (name: string) => Supervisor | undefined
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const { cashBalance } = useCollections()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [salaryIncrements, setSalaryIncrements] = useState<SalaryIncrement[]>([])
  const [unitPayments, setUnitPayments] = useState<UnitPayment[]>([])
  const [advanceDeductions, setAdvanceDeductions] = useState<AdvanceDeduction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [khadimTransactions, setKhadimTransactions] = useState<KhadimTransaction[]>([])
  const [zakatTransactions, setZakatTransactions] = useState<ZakatTransaction[]>([])
  const [zakatSettings, setZakatSettings] = useState<ZakatSettings | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      return
    }
    if (!appUser) {
      // Not signed in as an allowed user yet — nothing to fetch (RLS would
      // return empty results anyway); avoid the wasted round trips.
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [u, e, sup, a, sp, si, up, ad, ex, kh, ec, zt, zs] = await Promise.all([
        supabase.from('units').select('*').order('name'),
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('supervisors').select('*').order('created_at', { ascending: false }),
        supabase.from('advances').select('*').order('payment_date', { ascending: true }),
        supabase.from('salary_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('salary_increments').select('*').order('increment_date', { ascending: false }),
        supabase.from('unit_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('advance_deductions').select('*').order('date', { ascending: true }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('khadim_transactions').select('*').order('date', { ascending: true }),
        supabase.from('expense_categories').select('*').order('created_at', { ascending: true }),
        supabase.from('zakat_transactions').select('*').order('date', { ascending: false }),
        supabase.from('zakat_settings').select('*').eq('id', 1).maybeSingle(),
      ])
      const firstError = [u, e, sup, a, sp, si, up, ad, ex, kh, ec, zt, zs].find((r) => r.error)?.error
      if (firstError) throw firstError

      setUnits(u.data ?? [])
      setEmployees(e.data ?? [])
      setSupervisors(sup.data ?? [])
      setAdvances(a.data ?? [])
      setSalaryPayments(sp.data ?? [])
      setSalaryIncrements(si.data ?? [])
      setUnitPayments(up.data ?? [])
      setAdvanceDeductions(ad.data ?? [])
      setExpenses(ex.data ?? [])
      setKhadimTransactions(kh.data ?? [])
      setExpenseCategories(ec.data ?? [])
      setZakatTransactions(zt.data ?? [])
      setZakatSettings(zs.data ?? null)
      hasLoadedOnceRef.current = true
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load data from Supabase.'
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const balanceFor = useCallback(
    (name: string, department: Department) => {
      const totalAdvanced = advances
        .filter((a) => a.employee_name === name && a.department === department)
        .reduce((sum, a) => sum + Number(a.amount), 0)
      const totalDeducted = advanceDeductions
        .filter((d) => d.employee_name === name && d.department === department)
        .reduce((sum, d) => sum + Number(d.amount), 0)
      return totalAdvanced - totalDeducted
    },
    [advances, advanceDeductions]
  )

  const employeesWithBalance = useMemo<EmployeeWithBalance[]>(
    () =>
      employees.map((emp) => ({
        ...emp,
        advanceBalance: balanceFor(emp.name, 'cutting_department'),
      })),
    [employees, balanceFor]
  )

  const supervisorsWithBalance = useMemo<SupervisorWithBalance[]>(
    () =>
      supervisors.map((sup) => ({
        ...sup,
        advanceBalance: balanceFor(sup.name, 'protees_unit'),
      })),
    [supervisors, balanceFor]
  )

  const expenseCategoryNames = useMemo(
    () => sortExpenseCategoryNames(expenseCategories.map((c) => c.name)),
    [expenseCategories]
  )

  const khadimTotals = useMemo<KhadimTotals>(() => {
    const totalGiven = khadimTransactions
      .filter((t) => t.type === 'payment_given')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalBills = khadimTransactions
      .filter((t) => t.type === 'bill_submitted')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { totalGiven, totalBills, balance: totalGiven - totalBills }
  }, [khadimTransactions])

  const suggestedDeduction = useCallback(
    (name: string, department: Department, payAmount: number) => {
      const balance = balanceFor(name, department)
      if (balance <= 0) return 0
      return Math.min(balance, payAmount)
    },
    [balanceFor]
  )

  const findEmployeeByName = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase()
      return employees.find((e) => e.name.trim().toLowerCase() === n)
    },
    [employees]
  )

  const findSupervisorByName = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase()
      return supervisors.find((s) => s.name.trim().toLowerCase() === n)
    },
    [supervisors]
  )

  /** Allocates a deduction across a person's advances (oldest first) and
   * records the resulting advance_deductions rows, linked to either a
   * salary payment or a unit payment. Shared by both payment flows so the
   * balance math stays identical across departments. */
  async function allocateAdvanceDeduction(params: {
    name: string
    department: Department
    amount: number
    date: string
    salaryPaymentId?: number
    unitPaymentId?: number
  }) {
    const { name, department, amount, date, salaryPaymentId, unitPaymentId } = params
    if (amount <= 0) return

    const personAdvances = advances
      .filter((a) => a.employee_name === name && a.department === department)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())

    const deductedByAdvance = new Map<number, number>()
    for (const d of advanceDeductions) {
      if (d.advance_id != null) {
        deductedByAdvance.set(d.advance_id, (deductedByAdvance.get(d.advance_id) ?? 0) + Number(d.amount))
      }
    }

    let remaining = amount
    const rows: Array<{
      advance_id: number | null
      employee_name: string
      department: Department
      salary_payment_id: number | null
      unit_payment_id: number | null
      amount: number
      date: string
    }> = []

    for (const adv of personAdvances) {
      if (remaining <= 0) break
      const already = deductedByAdvance.get(adv.id) ?? 0
      const advBalance = Number(adv.amount) - already
      if (advBalance <= 0) continue
      const take = Math.min(advBalance, remaining)
      rows.push({
        advance_id: adv.id,
        employee_name: name,
        department,
        salary_payment_id: salaryPaymentId ?? null,
        unit_payment_id: unitPaymentId ?? null,
        amount: take,
        date,
      })
      remaining -= take
    }
    // Safety net: if the deduction exceeds tracked advances (shouldn't
    // normally happen since the UI caps it), record the leftover unlinked.
    if (remaining > 0) {
      rows.push({
        advance_id: null,
        employee_name: name,
        department,
        salary_payment_id: salaryPaymentId ?? null,
        unit_payment_id: unitPaymentId ?? null,
        amount: remaining,
        date,
      })
    }

    if (rows.length > 0) {
      const { error: dedErr } = await supabase.from('advance_deductions').insert(rows)
      if (dedErr) throw dedErr
    }
  }

  // --- Units (legacy) ---------------------------------------------------------
  const addUnit: DataContextValue['addUnit'] = async (input) => {
    const { error: err } = await supabase.from('units').insert({ name: input.name, location: input.location ?? null })
    if (err) throw err
    await refreshAll()
  }
  const updateUnit: DataContextValue['updateUnit'] = async (id, input) => {
    const { error: err } = await supabase.from('units').update({ name: input.name, location: input.location ?? null }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const deleteUnit: DataContextValue['deleteUnit'] = async (id) => {
    const { error: err } = await supabase.from('units').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Employees -----------------------------------------------------------
  const addEmployee: DataContextValue['addEmployee'] = async ({
    name,
    salary,
    joinDate,
    employeeType,
    ratePerPiece,
    employeeGroup,
    employeeCode,
    department,
    salaryDate,
    machineUserId,
  }) => {
    const { error: err } = await supabase.from('employees').insert({
      name,
      salary,
      join_date: joinDate ?? null,
      employee_type: employeeType ?? 'monthly',
      rate_per_piece: ratePerPiece ?? null,
      employee_group: employeeGroup ?? 'regular',
      // The permanent "hired at" snapshot the Salary History timeline
      // starts from — distinct from `salary`, which moves with increments.
      starting_salary: salary,
      employee_code: employeeCode ?? null,
      department: department ?? null,
      salary_date: salaryDate ?? null,
      machine_user_id: machineUserId ?? null,
    })
    if (err) throw err
    await refreshAll()
  }
  const updateEmployee: DataContextValue['updateEmployee'] = async (id, input) => {
    const payload: {
      name?: string
      salary?: number
      join_date?: string | null
      employee_type?: EmployeeType
      rate_per_piece?: number | null
      employee_group?: EmployeeGroup
      employee_code?: string | null
      department?: string | null
      salary_date?: number | null
      machine_user_id?: string | null
    } = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.salary !== undefined) payload.salary = input.salary
    if (input.joinDate !== undefined) payload.join_date = input.joinDate
    if (input.employeeType !== undefined) payload.employee_type = input.employeeType
    if (input.ratePerPiece !== undefined) payload.rate_per_piece = input.ratePerPiece
    if (input.employeeGroup !== undefined) payload.employee_group = input.employeeGroup
    if (input.employeeCode !== undefined) payload.employee_code = input.employeeCode
    if (input.department !== undefined) payload.department = input.department
    if (input.salaryDate !== undefined) payload.salary_date = input.salaryDate
    if (input.machineUserId !== undefined) payload.machine_user_id = input.machineUserId
    const { error: err } = await supabase.from('employees').update(payload).eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const deleteEmployee: DataContextValue['deleteEmployee'] = async (id) => {
    const { error: err } = await supabase.from('employees').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** Not a delete — an inactive employee keeps every advance/salary
   * record and audit entry, and is simply excluded from payroll,
   * roster counts, and new-transaction pickers by the app. Who changed
   * it and when is already captured by the employees audit trigger. */
  const setEmployeeActive: DataContextValue['setEmployeeActive'] = async (id, isActive) => {
    const { error: err } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** Applies a raise: snapshots the before/after in salary_increments AND
   * moves the employee's live `salary` forward — the same "snapshot the
   * inputs, then move the live total" split used for advance_deductions.
   * Increments are never edited or deleted once applied; a correction is
   * a new increment, same as any real payroll system. */
  const addSalaryIncrement: DataContextValue['addSalaryIncrement'] = async ({ employeeId, incrementType, incrementValue, incrementDate, notes }) => {
    const employee = employees.find((e) => e.id === employeeId)
    if (!employee) throw new Error('Employee not found.')
    if (incrementValue <= 0) throw new Error('Enter a valid increment amount.')

    const previousSalary = Number(employee.salary)
    const incrementAmount = incrementType === 'percentage' ? Math.round((previousSalary * incrementValue) / 100) : incrementValue
    const newSalary = previousSalary + incrementAmount

    const { error: incErr } = await supabase.from('salary_increments').insert({
      employee_id: employeeId,
      increment_date: incrementDate ?? todayISO(),
      previous_salary: previousSalary,
      increment_type: incrementType,
      increment_value: incrementValue,
      increment_amount: incrementAmount,
      new_salary: newSalary,
      notes: notes ?? null,
    })
    if (incErr) throw incErr

    const { error: empErr } = await supabase.from('employees').update({ salary: newSalary }).eq('id', employeeId)
    if (empErr) throw empErr

    await refreshAll()
  }

  // --- Supervisors (Protees Unit) ----------------------------------------------
  const addSupervisor: DataContextValue['addSupervisor'] = async ({ name }) => {
    const { error: err } = await supabase.from('supervisors').insert({ name })
    if (err) throw err
    await refreshAll()
  }
  const updateSupervisor: DataContextValue['updateSupervisor'] = async (id, { name }) => {
    const { error: err } = await supabase.from('supervisors').update({ name }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const deleteSupervisor: DataContextValue['deleteSupervisor'] = async (id) => {
    const { error: err } = await supabase.from('supervisors').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Advances ----------------------------------------------------------------
  // A 'Cash' advance is real money leaving the office, so it now posts a
  // linked cash_transactions cash-out the same way a cash expense does —
  // previously advances never touched the cash ledger at all. Any other
  // payment method is assumed to bypass Office Cash and carries a
  // reference number instead.
  const addAdvance: DataContextValue['addAdvance'] = async ({ name, department, amount, paymentDate, notes, paymentMethod, referenceNumber, allowNegativeCash }) => {
    const isCash = isCashPaymentMethod(paymentMethod)
    if (isCash && !allowNegativeCash && amount > cashBalance) {
      throw new Error(`This would take Office Cash negative (available: ${formatCurrency(cashBalance)}). Enable "Allow negative balance" to proceed anyway.`)
    }
    const date = paymentDate ?? todayISO()
    const { data: advance, error: err } = await supabase
      .from('advances')
      .insert({
        employee_name: name,
        department,
        amount,
        payment_date: date,
        notes: notes ?? null,
        payment_method: paymentMethod ?? null,
        reference_number: isCash ? null : referenceNumber ?? null,
      })
      .select()
      .single()
    if (err) throw err

    if (isCash) {
      const { error: cashErr } = await supabase.from('cash_transactions').insert({
        type: 'cash_out',
        category: `Advance — ${name}`,
        amount,
        date,
        reference_type: 'advance',
        reference_id: advance.id,
      })
      if (cashErr) console.error('Failed to post linked cash-out for advance:', cashErr.message)
    }

    await refreshAll()
  }
  const deleteAdvance: DataContextValue['deleteAdvance'] = async (id) => {
    await supabase.from('cash_transactions').delete().eq('reference_type', 'advance').eq('reference_id', id)
    const { error: err } = await supabase.from('advances').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Salary payments (monthly) -------------------------------------------
  // Payment method drives where the net amount actually comes from: 'Cash'
  // (the default — see SalaryPage) posts a linked Office Cash cash-out;
  // 'Online' posts a linked debit against the selected bank account instead.
  // overtimeAmount is added to net exactly as before — the caller (see
  // SalaryPage) decides what to pass: the computed Rs amount when
  // "Include Overtime In Salary" is checked, 0 otherwise. overtimeHours is
  // only the attendance-derived figure kept for display/history.
  const recordSalaryPayment: DataContextValue['recordSalaryPayment'] = async ({
    employeeName,
    baseAmount,
    overtimeAmount,
    deductionAmount,
    month,
    year,
    paymentDate,
    notes,
    piecesCompleted,
    ratePerPiece,
    paymentMethod,
    bankAccountId,
    referenceNumber,
    allowNegativeCash,
    overtimeHours,
    overtimeIncluded,
    absentDeduction,
    lateDeduction,
    leaveDeduction,
  }) => {
    const attendanceDeduction = (absentDeduction ?? 0) + (lateDeduction ?? 0) + (leaveDeduction ?? 0)
    const netAmount = Math.max(0, baseAmount + overtimeAmount - deductionAmount - attendanceDeduction)
    const date = paymentDate ?? todayISO()
    const method = paymentMethod ?? 'Cash'
    const isCash = isCashPaymentMethod(method)

    if (isCash && !allowNegativeCash && netAmount > cashBalance) {
      throw new Error(`This would take Office Cash negative (available: ${formatCurrency(cashBalance)}). Enable "Allow negative balance" to proceed anyway.`)
    }
    if (!isCash && !bankAccountId) {
      throw new Error('Select a bank account for an Online salary payment.')
    }

    const { data: payment, error: payErr } = await supabase
      .from('salary_payments')
      .insert({
        employee_name: employeeName,
        base_amount: baseAmount,
        overtime_amount: overtimeAmount,
        deduction_amount: deductionAmount,
        net_amount: netAmount,
        month,
        year,
        payment_date: date,
        notes: notes ?? null,
        pieces_completed: piecesCompleted ?? null,
        rate_per_piece: ratePerPiece ?? null,
        payment_method: method,
        bank_account_id: isCash ? null : bankAccountId,
        reference_number: isCash ? null : referenceNumber ?? null,
        overtime_hours: overtimeHours ?? null,
        overtime_included: overtimeIncluded ?? false,
        absent_deduction: absentDeduction ?? 0,
        late_deduction: lateDeduction ?? 0,
        leave_deduction: leaveDeduction ?? 0,
      })
      .select()
      .single()
    if (payErr) throw payErr

    await allocateAdvanceDeduction({
      name: employeeName,
      department: 'cutting_department',
      amount: deductionAmount,
      date,
      salaryPaymentId: payment.id,
    })

    if (netAmount > 0) {
      if (isCash) {
        const { error: cashErr } = await supabase.from('cash_transactions').insert({
          type: 'cash_out',
          category: `Salary — ${employeeName}`,
          amount: netAmount,
          date,
          reference_type: 'salary_payment',
          reference_id: payment.id,
        })
        if (cashErr) console.error('Failed to post linked cash-out for salary payment:', cashErr.message)
      } else if (bankAccountId) {
        const { error: bankErr } = await supabase.from('bank_transactions').insert({
          bank_account_id: bankAccountId,
          type: 'debit',
          amount: netAmount,
          date,
          reference_type: 'salary_payment',
          reference_id: payment.id,
          notes: `Salary — ${employeeName}`,
        })
        if (bankErr) console.error('Failed to post linked bank debit for salary payment:', bankErr.message)
      }
    }

    await refreshAll()
  }

  const deleteSalaryPayment: DataContextValue['deleteSalaryPayment'] = async (id) => {
    await supabase.from('cash_transactions').delete().eq('reference_type', 'salary_payment').eq('reference_id', id)
    await supabase.from('bank_transactions').delete().eq('reference_type', 'salary_payment').eq('reference_id', id)
    const { error: err } = await supabase.from('salary_payments').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Unit payments (Protees Unit, bi-weekly) -----------------------------------
  const recordUnitPayment: DataContextValue['recordUnitPayment'] = async ({
    supervisorName,
    paymentDate,
    totalAmount,
    overtimeAmount,
    advanceGiven,
    notes,
  }) => {
    const netAmount = Math.max(0, totalAmount + overtimeAmount - advanceGiven)
    const date = paymentDate ?? todayISO()
    const asOf = new Date(date)

    const { data: payment, error: payErr } = await supabase
      .from('unit_payments')
      .insert({
        supervisor_name: supervisorName,
        payment_date: date,
        // The Unit workflow no longer tracks explicit pay periods or a
        // per-payment expense snapshot — these columns stay for older rows
        // and to satisfy not-null constraints, defaulted internally.
        period_start: date,
        period_end: date,
        total_amount: totalAmount,
        overtime_amount: overtimeAmount,
        advance_given: advanceGiven,
        net_amount: netAmount,
        unit_expenses_during_period: 0,
        notes: notes ?? null,
        month: asOf.getMonth() + 1,
        year: asOf.getFullYear(),
      })
      .select()
      .single()
    if (payErr) throw payErr

    await allocateAdvanceDeduction({
      name: supervisorName,
      department: 'protees_unit',
      amount: advanceGiven,
      date,
      unitPaymentId: payment.id,
    })

    await refreshAll()
  }

  const deleteUnitPayment: DataContextValue['deleteUnitPayment'] = async (id) => {
    const { error: err } = await supabase.from('unit_payments').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Expenses (Business or Unit, via expense_scope) -----------------------------
  // Payment Source decides whether an expense touches the Office Cash
  // ledger: 'cash' posts a linked cash_transactions cash-out entry
  // (reference_type='expense'), keeping the Collections module's cash
  // balance accurate without a separate manual step; 'online' expenses
  // are recorded but never touch cash. A cash expense that would push
  // Office Cash negative is blocked unless allowNegativeCash is set.
  const addExpense: DataContextValue['addExpense'] = async ({ title, category, amount, date, notes, expenseScope, paymentSource, allowNegativeCash }) => {
    const expenseDate = date ?? todayISO()

    if (paymentSource === 'cash' && !allowNegativeCash && amount > cashBalance) {
      throw new Error(`This would take Office Cash negative (available: ${formatCurrency(cashBalance)}). Enable "Allow negative balance" to proceed anyway.`)
    }

    const { data: expense, error: err } = await supabase
      .from('expenses')
      .insert({ title, category, amount, date: expenseDate, notes: notes ?? null, expense_scope: expenseScope ?? 'business', payment_source: paymentSource })
      .select()
      .single()
    if (err) throw err

    if (paymentSource === 'cash') {
      const { error: cashErr } = await supabase.from('cash_transactions').insert({
        type: 'cash_out',
        category: title,
        amount,
        date: expenseDate,
        reference_type: 'expense',
        reference_id: expense.id,
      })
      if (cashErr) console.error('Failed to post linked cash-out for expense:', cashErr.message)
    }

    await refreshAll()
  }

  const updateExpense: DataContextValue['updateExpense'] = async (id, { title, category, amount, date, notes, expenseScope, paymentSource, allowNegativeCash }) => {
    const existing = expenses.find((e) => e.id === id)
    if (!existing) throw new Error('Expense not found.')
    const expenseDate = date ?? existing.date

    // cashBalance already reflects this expense's OLD cash effect (if it
    // was 'cash') — add that back, then subtract the new effect, to get
    // what the balance would be after this update.
    const oldCashImpact = existing.payment_source === 'cash' ? Number(existing.amount) : 0
    const newCashImpact = paymentSource === 'cash' ? amount : 0
    const projectedCashBalance = cashBalance + oldCashImpact - newCashImpact
    if (paymentSource === 'cash' && !allowNegativeCash && projectedCashBalance < 0) {
      throw new Error(`This would take Office Cash negative (projected: ${formatCurrency(projectedCashBalance)}). Enable "Allow negative balance" to proceed anyway.`)
    }

    const { error: err } = await supabase
      .from('expenses')
      .update({
        title,
        category,
        amount,
        date: expenseDate,
        notes: notes ?? null,
        expense_scope: expenseScope ?? existing.expense_scope,
        payment_source: paymentSource,
      })
      .eq('id', id)
    if (err) throw err

    if (existing.payment_source === 'cash' && paymentSource === 'cash') {
      await supabase.from('cash_transactions').update({ category: title, amount, date: expenseDate }).eq('reference_type', 'expense').eq('reference_id', id)
    } else if (existing.payment_source === 'cash' && paymentSource === 'online') {
      await supabase.from('cash_transactions').delete().eq('reference_type', 'expense').eq('reference_id', id)
    } else if (existing.payment_source === 'online' && paymentSource === 'cash') {
      await supabase.from('cash_transactions').insert({
        type: 'cash_out',
        category: title,
        amount,
        date: expenseDate,
        reference_type: 'expense',
        reference_id: id,
      })
    }
    // online -> online: no cash ledger action needed.

    await refreshAll()
  }

  const deleteExpense: DataContextValue['deleteExpense'] = async (id) => {
    await supabase.from('cash_transactions').delete().eq('reference_type', 'expense').eq('reference_id', id)
    const { error: err } = await supabase.from('expenses').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const addExpenseCategory: DataContextValue['addExpenseCategory'] = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name cannot be empty.')
    const existing = expenseCategories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return // already exists — treat as success, nothing to insert
    const { error: err } = await supabase.from('expense_categories').insert({ name: trimmed })
    if (err) throw err
    await refreshAll()
  }

  // --- Khadim Hussain Account ------------------------------------------------------
  const insertKhadimTransaction = async (type: KhadimTransactionType, payload: { date?: string; amount: number; notes?: string | null; description?: string | null }) => {
    const { error: err } = await supabase.from('khadim_transactions').insert({
      type,
      date: payload.date ?? todayISO(),
      amount: payload.amount,
      notes: payload.notes ?? null,
      description: payload.description ?? null,
    })
    if (err) throw err
    await refreshAll()
  }
  const addKhadimPayment: DataContextValue['addKhadimPayment'] = async ({ date, amount, notes }) => {
    await insertKhadimTransaction('payment_given', { date, amount, notes })
  }
  const addKhadimBill: DataContextValue['addKhadimBill'] = async ({ date, amount, description }) => {
    await insertKhadimTransaction('bill_submitted', { date, amount, description })
  }
  const deleteKhadimTransaction: DataContextValue['deleteKhadimTransaction'] = async (id) => {
    const { error: err } = await supabase.from('khadim_transactions').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Zakat Management --------------------------------------------------------
  const addZakatTransaction: DataContextValue['addZakatTransaction'] = async ({ recipientName, amount, date, notes }) => {
    const { error: err } = await supabase.from('zakat_transactions').insert({
      recipient_name: recipientName,
      amount,
      date: date ?? todayISO(),
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }
  const deleteZakatTransaction: DataContextValue['deleteZakatTransaction'] = async (id) => {
    const { error: err } = await supabase.from('zakat_transactions').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const updateZakatBudget: DataContextValue['updateZakatBudget'] = async (monthlyBudget) => {
    const { error: err } = await supabase
      .from('zakat_settings')
      .upsert({ id: 1, monthly_budget: monthlyBudget, updated_at: new Date().toISOString() })
    if (err) throw err
    await refreshAll()
  }

  const value: DataContextValue = {
    loading,
    error,
    configured: isSupabaseConfigured,
    units,
    employees,
    supervisors,
    advances,
    salaryPayments,
    salaryIncrements,
    unitPayments,
    advanceDeductions,
    expenses,
    expenseCategories,
    expenseCategoryNames,
    khadimTransactions,
    khadimTotals,
    zakatTransactions,
    zakatSettings,
    employeesWithBalance,
    supervisorsWithBalance,
    balanceFor,
    refreshAll,
    addUnit,
    updateUnit,
    deleteUnit,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setEmployeeActive,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    addAdvance,
    deleteAdvance,
    recordSalaryPayment,
    deleteSalaryPayment,
    addSalaryIncrement,
    recordUnitPayment,
    deleteUnitPayment,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    addKhadimPayment,
    addKhadimBill,
    deleteKhadimTransaction,
    addZakatTransaction,
    deleteZakatTransaction,
    updateZakatBudget,
    suggestedDeduction,
    findEmployeeByName,
    findSupervisorByName,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
