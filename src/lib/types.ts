import type { Database } from './database.types'

export type Unit = Database['public']['Tables']['units']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Supervisor = Database['public']['Tables']['supervisors']['Row']
export type Advance = Database['public']['Tables']['advances']['Row']
export type SalaryPayment = Database['public']['Tables']['salary_payments']['Row']
export type UnitPayment = Database['public']['Tables']['unit_payments']['Row']
export type AdvanceDeduction = Database['public']['Tables']['advance_deductions']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type KhadimTransaction = Database['public']['Tables']['khadim_transactions']['Row']
export type AdvanceBalanceRow = Database['public']['Views']['advance_balance_by_name']['Row']
export type AppUser = Database['public']['Tables']['app_users']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']
export type AuditAction = AuditLogEntry['action']

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

export type Department = 'cutting_department' | 'protees_unit'

export type EmployeeType = 'monthly' | 'contract'

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  monthly: 'Monthly',
  contract: 'Contract',
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  cutting_department: 'Employees',
  protees_unit: 'Protees Unit',
}

export interface PersonWithBalance {
  name: string
  department: Department
  payAmount: number
  advanceBalance: number
}

export interface EmployeeWithBalance extends Employee {
  advanceBalance: number
}

export interface SupervisorWithBalance extends Supervisor {
  advanceBalance: number
}

export type KhadimTransactionType = 'payment_given' | 'bill_submitted'

export const KHADIM_TYPE_LABELS: Record<KhadimTransactionType, string> = {
  payment_given: 'Payment Given',
  bill_submitted: 'Bill Submitted',
}

/**
 * Categories are database-driven (see the `expense_categories` table) —
 * this is only the seed list used by the migration for a fresh install.
 * The live dropdown always reads from DataContext's `expenseCategories`.
 */
export const SEED_EXPENSE_CATEGORIES = [
  'Food Grocery',
  'Food Vegetable',
  'Rotiyan',
  'Gas',
  'Diesel',
  'Transportation',
  'Thread',
  'Fabric',
  'Packing',
  'Printing',
  'Khadim Hussain',
  'Other Expenses',
] as const

/** Sorts category names with "Other Expenses" always pinned last. */
export function sortExpenseCategoryNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    if (a === 'Other Expenses') return 1
    if (b === 'Other Expenses') return -1
    return 0
  })
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
