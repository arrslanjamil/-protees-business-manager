import type { Database } from './database.types'

export type Unit = Database['public']['Tables']['units']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Advance = Database['public']['Tables']['advances']['Row']
export type SalaryPayment = Database['public']['Tables']['salary_payments']['Row']
export type AdvanceDeduction = Database['public']['Tables']['advance_deductions']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type AdvanceBalance = Database['public']['Views']['employee_advance_balance']['Row']

export interface EmployeeWithBalance extends Employee {
  unit?: Unit | null
  advanceBalance: number
}

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Supplies',
  'Maintenance',
  'Transport',
  'Marketing',
  'Equipment',
  'Miscellaneous',
] as const

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
