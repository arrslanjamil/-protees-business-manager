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
export type ZakatTransaction = Database['public']['Tables']['zakat_transactions']['Row']
export type ZakatSettings = Database['public']['Tables']['zakat_settings']['Row']
export type Courier = Database['public']['Tables']['couriers']['Row']
export type CourierExpectedCollection = Database['public']['Tables']['courier_expected_collections']['Row']
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row']
export type CourierPayment = Database['public']['Tables']['courier_payments']['Row']
export type BankTransaction = Database['public']['Tables']['bank_transactions']['Row']
export type CashTransaction = Database['public']['Tables']['cash_transactions']['Row']
export type CashSettings = Database['public']['Tables']['cash_settings']['Row']
export type ShopifyOrder = Database['public']['Tables']['shopify_orders']['Row']
export type ShopifySettings = Database['public']['Tables']['shopify_settings']['Row']

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

export type EmployeeGroup = 'regular' | 'unit'

export const EMPLOYEE_GROUP_LABELS: Record<EmployeeGroup, string> = {
  regular: 'Regular Employee',
  unit: 'Unit Employee',
}

export type ExpenseScope = 'business' | 'unit'

export const EXPENSE_SCOPE_LABELS: Record<ExpenseScope, string> = {
  business: 'Business Expense',
  unit: 'Unit Expense',
}

export type PaymentType = 'cash' | 'bank_transfer'

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
}

export type CashTransactionType = 'cash_in' | 'cash_out'

export const CASH_TRANSACTION_TYPE_LABELS: Record<CashTransactionType, string> = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
}

/** Suggested Cash In / Cash Out categories — free text in the database
 * (like expense categories), this is just the quick-pick list. */
export const CASH_IN_CATEGORIES = ['Courier Cash Received', 'Bank Withdrawal', 'Other Cash In'] as const
export const CASH_OUT_CATEGORIES = ['Office Expenses', 'Petty Cash', 'Miscellaneous Expenses', 'Other Cash Out'] as const

export interface CourierWithBalance extends Courier {
  expectedCollection: number
  paymentsReceived: number
  pendingBalance: number
  lastPaymentDate: string | null
}

export interface BankAccountWithBalance extends BankAccount {
  balance: number
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
