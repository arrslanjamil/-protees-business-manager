import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  Advance,
  AdvanceDeduction,
  Employee,
  EmployeeWithBalance,
  Expense,
  SalaryPayment,
  Unit,
} from '@/lib/types'
import { todayISO } from '@/lib/utils'

interface RecordSalaryInput {
  employeeId: string
  baseAmount: number
  deductionAmount: number
  month: number
  year: number
  paymentDate?: string
  notes?: string
}

interface DataContextValue {
  loading: boolean
  error: string | null
  configured: boolean
  units: Unit[]
  employees: Employee[]
  advances: Advance[]
  salaryPayments: SalaryPayment[]
  advanceDeductions: AdvanceDeduction[]
  expenses: Expense[]
  employeesWithBalance: EmployeeWithBalance[]
  balanceFor: (employeeId: string) => number
  refreshAll: () => Promise<void>

  addUnit: (input: { name: string; location?: string | null }) => Promise<void>
  updateUnit: (id: string, input: { name: string; location?: string | null }) => Promise<void>
  deleteUnit: (id: string) => Promise<void>

  addEmployee: (input: Omit<Employee, 'id' | 'created_at'>) => Promise<void>
  updateEmployee: (id: string, input: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>

  addAdvance: (input: { employeeId: string; amount: number; reason?: string; date?: string }) => Promise<void>
  deleteAdvance: (id: string) => Promise<void>

  recordSalaryPayment: (input: RecordSalaryInput) => Promise<void>
  deleteSalaryPayment: (id: string) => Promise<void>

  addExpense: (input: { unitId?: string | null; category: string; amount: number; description?: string; date?: string }) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  suggestedDeduction: (employeeId: string, baseAmount: number) => number
  findEmployeeByName: (name: string) => Employee | undefined
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [advanceDeductions, setAdvanceDeductions] = useState<AdvanceDeduction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const refreshAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [u, e, a, sp, ad, ex] = await Promise.all([
        supabase.from('units').select('*').order('name'),
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('advances').select('*').order('date', { ascending: true }),
        supabase.from('salary_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('advance_deductions').select('*').order('date', { ascending: true }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
      ])
      const firstError = [u, e, a, sp, ad, ex].find((r) => r.error)?.error
      if (firstError) throw firstError

      setUnits(u.data ?? [])
      setEmployees(e.data ?? [])
      setAdvances(a.data ?? [])
      setSalaryPayments(sp.data ?? [])
      setAdvanceDeductions(ad.data ?? [])
      setExpenses(ex.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data from Supabase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const balanceFor = useCallback(
    (employeeId: string) => {
      const totalAdvanced = advances
        .filter((a) => a.employee_id === employeeId)
        .reduce((sum, a) => sum + Number(a.amount), 0)
      const totalDeducted = advanceDeductions
        .filter((d) => d.employee_id === employeeId)
        .reduce((sum, d) => sum + Number(d.amount), 0)
      return totalAdvanced - totalDeducted
    },
    [advances, advanceDeductions]
  )

  const employeesWithBalance = useMemo<EmployeeWithBalance[]>(
    () =>
      employees.map((emp) => ({
        ...emp,
        unit: units.find((u) => u.id === emp.unit_id) ?? null,
        advanceBalance: balanceFor(emp.id),
      })),
    [employees, units, balanceFor]
  )

  const suggestedDeduction = useCallback(
    (employeeId: string, baseAmount: number) => {
      const balance = balanceFor(employeeId)
      if (balance <= 0) return 0
      return Math.min(balance, baseAmount)
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

  // --- Units ---------------------------------------------------------------
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

  // --- Employees -------------------------------------------------------------
  const addEmployee: DataContextValue['addEmployee'] = async (input) => {
    const { error: err } = await supabase.from('employees').insert(input)
    if (err) throw err
    await refreshAll()
  }
  const updateEmployee: DataContextValue['updateEmployee'] = async (id, input) => {
    const { error: err } = await supabase.from('employees').update(input).eq('id', id)
    if (err) throw err
    await refreshAll()
  }
  const deleteEmployee: DataContextValue['deleteEmployee'] = async (id) => {
    const { error: err } = await supabase.from('employees').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Advances --------------------------------------------------------------
  const addAdvance: DataContextValue['addAdvance'] = async ({ employeeId, amount, reason, date }) => {
    const { error: err } = await supabase.from('advances').insert({
      employee_id: employeeId,
      amount,
      reason: reason ?? null,
      date: date ?? todayISO(),
    })
    if (err) throw err
    await refreshAll()
  }
  const deleteAdvance: DataContextValue['deleteAdvance'] = async (id) => {
    const { error: err } = await supabase.from('advances').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Salary + auto-deduction allocation -------------------------------------
  const recordSalaryPayment: DataContextValue['recordSalaryPayment'] = async ({
    employeeId,
    baseAmount,
    deductionAmount,
    month,
    year,
    paymentDate,
    notes,
  }) => {
    const netAmount = Math.max(0, baseAmount - deductionAmount)

    const { data: payment, error: payErr } = await supabase
      .from('salary_payments')
      .insert({
        employee_id: employeeId,
        base_amount: baseAmount,
        deduction_amount: deductionAmount,
        net_amount: netAmount,
        month,
        year,
        payment_date: paymentDate ?? todayISO(),
        notes: notes ?? null,
      })
      .select()
      .single()
    if (payErr) throw payErr

    if (deductionAmount > 0) {
      // Allocate the deduction across the employee's advances, oldest first,
      // against whatever balance each advance still has outstanding.
      const employeeAdvances = advances
        .filter((a) => a.employee_id === employeeId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const deductedByAdvance = new Map<string, number>()
      for (const d of advanceDeductions) {
        if (d.advance_id) {
          deductedByAdvance.set(d.advance_id, (deductedByAdvance.get(d.advance_id) ?? 0) + Number(d.amount))
        }
      }

      let remaining = deductionAmount
      const rows: Array<{ advance_id: string | null; employee_id: string; salary_payment_id: string; amount: number; date: string }> = []
      for (const adv of employeeAdvances) {
        if (remaining <= 0) break
        const already = deductedByAdvance.get(adv.id) ?? 0
        const advBalance = Number(adv.amount) - already
        if (advBalance <= 0) continue
        const take = Math.min(advBalance, remaining)
        rows.push({
          advance_id: adv.id,
          employee_id: employeeId,
          salary_payment_id: payment.id,
          amount: take,
          date: paymentDate ?? todayISO(),
        })
        remaining -= take
      }
      // Safety net: if the deduction exceeds tracked advances (shouldn't normally
      // happen since the UI caps it), record the leftover unlinked to an advance.
      if (remaining > 0) {
        rows.push({
          advance_id: null,
          employee_id: employeeId,
          salary_payment_id: payment.id,
          amount: remaining,
          date: paymentDate ?? todayISO(),
        })
      }

      if (rows.length > 0) {
        const { error: dedErr } = await supabase.from('advance_deductions').insert(rows)
        if (dedErr) throw dedErr
      }
    }

    await refreshAll()
  }

  const deleteSalaryPayment: DataContextValue['deleteSalaryPayment'] = async (id) => {
    const { error: err } = await supabase.from('salary_payments').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Expenses --------------------------------------------------------------
  const addExpense: DataContextValue['addExpense'] = async ({ unitId, category, amount, description, date }) => {
    const { error: err } = await supabase.from('expenses').insert({
      unit_id: unitId ?? null,
      category,
      amount,
      description: description ?? null,
      date: date ?? todayISO(),
    })
    if (err) throw err
    await refreshAll()
  }
  const deleteExpense: DataContextValue['deleteExpense'] = async (id) => {
    const { error: err } = await supabase.from('expenses').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const value: DataContextValue = {
    loading,
    error,
    configured: isSupabaseConfigured,
    units,
    employees,
    advances,
    salaryPayments,
    advanceDeductions,
    expenses,
    employeesWithBalance,
    balanceFor,
    refreshAll,
    addUnit,
    updateUnit,
    deleteUnit,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addAdvance,
    deleteAdvance,
    recordSalaryPayment,
    deleteSalaryPayment,
    addExpense,
    deleteExpense,
    suggestedDeduction,
    findEmployeeByName,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
