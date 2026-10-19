import type { Database } from './database.types'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type PaymentMethod = 'cash' | 'online'
export type PaymentDirection = 'in' | 'out'
export type PaymentKind = 'Collection' | 'Expense' | 'Salary' | 'Advance' | 'Creditor'

export interface PaymentRecord {
  id: string
  kind: PaymentKind
  direction: PaymentDirection
  method: PaymentMethod
  bankId: number | null
  date: string
  source: string
  amount: number
  addedBy: string | null
  notes: string
}

export interface PaymentRecordInput {
  courierCollections: Row<'courier_collections'>[]
  expenses: Row<'expenses'>[]
  salaryPayments: Row<'salary_payments'>[]
  advances: Row<'advances'>[]
  creditorPayments: Row<'creditor_payments'>[]
  courierNameById: Map<number, string>
  creditorNameById: Map<number, string>
}

export function isOnlineMethod(method: string | null | undefined): boolean {
  const m = (method ?? '').trim().toLowerCase()
  return m !== '' && m !== 'cash'
}

export function buildPaymentRecords(input: PaymentRecordInput): PaymentRecord[] {
  const rows: PaymentRecord[] = []
  for (const c of input.courierCollections) {
    const online = c.payment_method === 'online'
    rows.push({
      id: `collection-${c.id}`,
      kind: 'Collection',
      direction: 'in',
      method: online ? 'online' : 'cash',
      bankId: online ? c.bank_account_id ?? null : null,
      date: c.invoice_date,
      source: input.courierNameById.get(c.courier_id) ?? 'Courier',
      amount: Number(c.amount),
      addedBy: c.created_by_username,
      notes: c.notes || c.invoice_number || '',
    })
  }
  for (const e of input.expenses) {
    const online = e.payment_source === 'online'
    rows.push({
      id: `expense-${e.id}`,
      kind: 'Expense',
      direction: 'out',
      method: online ? 'online' : 'cash',
      bankId: online ? e.bank_account_id ?? null : null,
      date: e.date,
      source: e.title,
      amount: Number(e.amount),
      addedBy: e.created_by_username,
      notes: e.notes || '',
    })
  }
  for (const p of input.salaryPayments) {
    const online = p.payment_method === 'Online'
    rows.push({
      id: `salary-${p.id}`,
      kind: 'Salary',
      direction: 'out',
      method: online ? 'online' : 'cash',
      bankId: online ? p.bank_account_id ?? null : null,
      date: p.payment_date,
      source: p.employee_name,
      amount: Number(p.net_amount),
      addedBy: p.created_by_username,
      notes: p.notes || '',
    })
  }
  for (const a of input.advances) {
    const online = isOnlineMethod(a.payment_method)
    rows.push({
      id: `advance-${a.id}`,
      kind: 'Advance',
      direction: 'out',
      method: online ? 'online' : 'cash',
      bankId: online ? a.bank_account_id ?? null : null,
      date: a.payment_date,
      source: a.employee_name,
      amount: Number(a.amount),
      addedBy: a.created_by_username,
      notes: a.notes || '',
    })
  }
  for (const p of input.creditorPayments) {
    const online = isOnlineMethod(p.payment_type)
    rows.push({
      id: `creditor-${p.id}`,
      kind: 'Creditor',
      direction: 'out',
      method: online ? 'online' : 'cash',
      bankId: online ? p.bank_account_id ?? null : null,
      date: p.payment_date,
      source: input.creditorNameById.get(p.creditor_id) ?? 'Creditor',
      amount: Number(p.amount),
      addedBy: p.created_by_username,
      notes: p.notes || '',
    })
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date))
}
