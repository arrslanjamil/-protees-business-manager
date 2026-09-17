import type { Database } from './database.types'

export type Unit = Database['public']['Tables']['units']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Supervisor = Database['public']['Tables']['supervisors']['Row']
export type Advance = Database['public']['Tables']['advances']['Row']
export type SalaryPayment = Database['public']['Tables']['salary_payments']['Row']
export type SalaryIncrement = Database['public']['Tables']['salary_increments']['Row']
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
export type CourierCollection = Database['public']['Tables']['courier_collections']['Row']
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row']
export type CashTransfer = Database['public']['Tables']['cash_transfers']['Row']
export type BankTransaction = Database['public']['Tables']['bank_transactions']['Row']
export type CashTransaction = Database['public']['Tables']['cash_transactions']['Row']
export type CashSettings = Database['public']['Tables']['cash_settings']['Row']
export type ShopifyOrder = Database['public']['Tables']['shopify_orders']['Row']
export type ShopifySettings = Database['public']['Tables']['shopify_settings']['Row']
export type ShopifyStore = Database['public']['Tables']['shopify_stores']['Row']
export type MasterDataType = Database['public']['Tables']['master_data_types']['Row']
export type MasterDataItem = Database['public']['Tables']['master_data_items']['Row']
export type Creditor = Database['public']['Tables']['creditors']['Row']
export type CreditorBill = Database['public']['Tables']['creditor_bills']['Row']
export type CreditorPayment = Database['public']['Tables']['creditor_payments']['Row']

/** The fixed set of Master Data "slots" — the VALUES inside each are fully
 * admin-managed (create/rename/archive from Settings), only the slot list
 * itself lives in code. See migration_016_master_data.sql. */
export const MASTER_DATA_TYPE_KEYS = [
  'creditor_category',
  'supplier_category',
  'material_category',
  'fabric_type',
  'fabric_gsm',
  'color',
  'unit',
  'payment_method',
  'vendor_type',
  'service_type',
  'tag',
  'label',
  'status',
] as const
export type MasterDataTypeKey = (typeof MASTER_DATA_TYPE_KEYS)[number]

export interface CreditorWithBalance extends Creditor {
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  lastActivityDate: string | null
}

export const SHOPIFY_STORE_KEYS = ['protees', 'little_peanuts'] as const
export type ShopifyStoreKey = (typeof SHOPIFY_STORE_KEYS)[number]

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

export type IncrementType = 'fixed' | 'percentage'

export const INCREMENT_TYPE_LABELS: Record<IncrementType, string> = {
  fixed: 'Fixed Amount',
  percentage: 'Percentage',
}

/** How an advance/salary payment's payment_method affects the Office Cash
 * ledger: paid as 'Cash' posts a linked cash-out and reduces the live
 * balance shown elsewhere in the app; any other method (Bank Transfer,
 * Easypaisa, ...) is assumed to bypass Office Cash and requires a
 * reference number instead. Matches the exact string seeded into the
 * 'payment_method' Master Data type (migration_016). */
export function isCashPaymentMethod(method: string | null | undefined): boolean {
  return (method ?? '').trim().toLowerCase() === 'cash'
}

export type ExpenseScope = 'business' | 'unit'

export const EXPENSE_SCOPE_LABELS: Record<ExpenseScope, string> = {
  business: 'Business Expense',
  unit: 'Unit Expense',
}

/** Where an expense's money actually came from — distinct from the
 * courier PaymentType below. Only 'cash' expenses reduce the Office Cash
 * balance; 'online' expenses are recorded and reportable but never touch
 * the cash ledger. */
export type ExpensePaymentSource = 'cash' | 'online'

export const EXPENSE_PAYMENT_SOURCE_LABELS: Record<ExpensePaymentSource, string> = {
  cash: 'Office Cash',
  online: 'Online / Bank',
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

/** Suggested manual Cash In / Cash Out categories — free text in the
 * database (like expense categories), this is just the quick-pick
 * list. Bank-to-cash movements go through the dedicated Cash Transfer
 * feature instead, and expenses post their own linked cash-out entry
 * automatically — these are for everything else. */
export const CASH_IN_CATEGORIES = ['Manual Cash Deposit', 'Other Cash In'] as const
export const CASH_OUT_CATEGORIES = ['Petty Cash', 'Miscellaneous Cash Out', 'Other Cash Out'] as const

export interface CourierWithBalance extends Courier {
  bankAccountName: string | null
  totalCollected: number
  collectionCount: number
  lastCollectionDate: string | null
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
