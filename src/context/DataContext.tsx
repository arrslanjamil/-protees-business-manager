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
  EmployeeWithBalance,
  Expense,
  ExpenseCategory,
  KhadimTransaction,
  KhadimTransactionType,
  SalaryPayment,
  Supervisor,
  SupervisorWithBalance,
  Unit,
  UnitPayment,
} from '@/lib/types'
import { sortExpenseCategoryNames } from '@/lib/types'
import { todayISO } from '@/lib/utils'

interface RecordSalaryInput {
  employeeName: string
  baseAmount: number
  overtimeAmount: number
  deductionAmount: number
  month: number
  year: number
  paymentDate?: string
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
  unitPayments: UnitPayment[]
  advanceDeductions: AdvanceDeduction[]
  expenses: Expense[]
  expenseCategories: ExpenseCategory[]
  expenseCategoryNames: string[]
  khadimTransactions: KhadimTransaction[]
  khadimTotals: KhadimTotals
  employeesWithBalance: EmployeeWithBalance[]
  supervisorsWithBalance: SupervisorWithBalance[]
  balanceFor: (name: string, department: Department) => number
  refreshAll: () => Promise<void>

  addUnit: (input: { name: string; location?: string | null }) => Promise<void>
  updateUnit: (id: number, input: { name: string; location?: string | null }) => Promise<void>
  deleteUnit: (id: number) => Promise<void>

  addEmployee: (input: { name: string; salary: number; joinDate?: string | null }) => Promise<void>
  updateEmployee: (id: number, input: Partial<{ name: string; salary: number; joinDate: string | null }>) => Promise<void>
  deleteEmployee: (id: number) => Promise<void>

  addSupervisor: (input: { name: string }) => Promise<void>
  updateSupervisor: (id: number, input: { name: string }) => Promise<void>
  deleteSupervisor: (id: number) => Promise<void>

  addAdvance: (input: { name: string; department: Department; amount: number; paymentDate?: string; notes?: string }) => Promise<void>
  deleteAdvance: (id: number) => Promise<void>

  recordSalaryPayment: (input: RecordSalaryInput) => Promise<void>
  deleteSalaryPayment: (id: number) => Promise<void>

  recordUnitPayment: (input: RecordUnitPaymentInput) => Promise<void>
  deleteUnitPayment: (id: number) => Promise<void>

  addExpense: (input: { title: string; category: string; amount: number; date?: string; notes?: string }) => Promise<void>
  deleteExpense: (id: number) => Promise<void>

  addExpenseCategory: (name: string) => Promise<void>

  addKhadimPayment: (input: { date?: string; amount: number; notes?: string }) => Promise<void>
  addKhadimBill: (input: { date?: string; amount: number; description: string }) => Promise<void>
  deleteKhadimTransaction: (id: number) => Promise<void>

  suggestedDeduction: (name: string, department: Department, payAmount: number) => number
  findEmployeeByName: (name: string) => Employee | undefined
  findSupervisorByName: (name: string) => Supervisor | undefined
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [unitPayments, setUnitPayments] = useState<UnitPayment[]>([])
  const [advanceDeductions, setAdvanceDeductions] = useState<AdvanceDeduction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [khadimTransactions, setKhadimTransactions] = useState<KhadimTransaction[]>([])

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
      const [u, e, sup, a, sp, up, ad, ex, kh, ec] = await Promise.all([
        supabase.from('units').select('*').order('name'),
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('supervisors').select('*').order('created_at', { ascending: false }),
        supabase.from('advances').select('*').order('payment_date', { ascending: true }),
        supabase.from('salary_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('unit_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('advance_deductions').select('*').order('date', { ascending: true }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('khadim_transactions').select('*').order('date', { ascending: true }),
        supabase.from('expense_categories').select('*').order('created_at', { ascending: true }),
      ])
      const firstError = [u, e, sup, a, sp, up, ad, ex, kh, ec].find((r) => r.error)?.error
      if (firstError) throw firstError

      setUnits(u.data ?? [])
      setEmployees(e.data ?? [])
      setSupervisors(sup.data ?? [])
      setAdvances(a.data ?? [])
      setSalaryPayments(sp.data ?? [])
      setUnitPayments(up.data ?? [])
      setAdvanceDeductions(ad.data ?? [])
      setExpenses(ex.data ?? [])
      setKhadimTransactions(kh.data ?? [])
      setExpenseCategories(ec.data ?? [])
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
  const addEmployee: DataContextValue['addEmployee'] = async ({ name, salary, joinDate }) => {
    const { error: err } = await supabase.from('employees').insert({ name, salary, join_date: joinDate ?? null })
    if (err) throw err
    await refreshAll()
  }
  const updateEmployee: DataContextValue['updateEmployee'] = async (id, input) => {
    const payload: { name?: string; salary?: number; join_date?: string | null } = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.salary !== undefined) payload.salary = input.salary
    if (input.joinDate !== undefined) payload.join_date = input.joinDate
    const { error: err } = await supabase.from('employees').update(payload).eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const deleteEmployee: DataContextValue['deleteEmployee'] = async (id) => {
    const { error: err } = await supabase.from('employees').delete().eq('id', id)
    if (err) throw err
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
  const addAdvance: DataContextValue['addAdvance'] = async ({ name, department, amount, paymentDate, notes }) => {
    const { error: err } = await supabase.from('advances').insert({
      employee_name: name,
      department,
      amount,
      payment_date: paymentDate ?? todayISO(),
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }
  const deleteAdvance: DataContextValue['deleteAdvance'] = async (id) => {
    const { error: err } = await supabase.from('advances').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Salary payments (monthly) -------------------------------------------
  const recordSalaryPayment: DataContextValue['recordSalaryPayment'] = async ({
    employeeName,
    baseAmount,
    overtimeAmount,
    deductionAmount,
    month,
    year,
    paymentDate,
    notes,
  }) => {
    const netAmount = Math.max(0, baseAmount + overtimeAmount - deductionAmount)
    const date = paymentDate ?? todayISO()

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

    await refreshAll()
  }

  const deleteSalaryPayment: DataContextValue['deleteSalaryPayment'] = async (id) => {
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

  // --- Unit Expenses -------------------------------------------------------------
  const addExpense: DataContextValue['addExpense'] = async ({ title, category, amount, date, notes }) => {
    const { error: err } = await supabase.from('expenses').insert({
      title,
      category,
      amount,
      date: date ?? todayISO(),
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }
  const deleteExpense: DataContextValue['deleteExpense'] = async (id) => {
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

  const value: DataContextValue = {
    loading,
    error,
    configured: isSupabaseConfigured,
    units,
    employees,
    supervisors,
    advances,
    salaryPayments,
    unitPayments,
    advanceDeductions,
    expenses,
    expenseCategories,
    expenseCategoryNames,
    khadimTransactions,
    khadimTotals,
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
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    addAdvance,
    deleteAdvance,
    recordSalaryPayment,
    deleteSalaryPayment,
    recordUnitPayment,
    deleteUnitPayment,
    addExpense,
    deleteExpense,
    addExpenseCategory,
    addKhadimPayment,
    addKhadimBill,
    deleteKhadimTransaction,
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
