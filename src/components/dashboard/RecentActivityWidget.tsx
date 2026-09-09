import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AuditLogEntry } from '@/lib/types'
import { AUDIT_ACTION_LABELS } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

const TABLE_LABELS: Record<string, string> = {
  employees: 'Employees',
  supervisors: 'Supervisors',
  advances: 'Advances',
  salary_payments: 'Salary Payments',
  unit_payments: 'Unit Payments',
  advance_deductions: 'Advance Deductions',
  expenses: 'Unit Expenses',
  expense_categories: 'Expense Categories',
  khadim_transactions: 'Khadim Hussain',
  units: 'Units',
}

const ACTION_BADGE_COLOR: Record<AuditLogEntry['action'], 'green' | 'cyan' | 'red'> = {
  create: 'green',
  update: 'cyan',
  delete: 'red',
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function RecentActivityWidget() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!active) return
        setEntries(data ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="card">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Recent Activity</h3>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Actions across the app will show up here." />
      ) : (
        <ul className="divide-y divide-white/5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <Badge color={ACTION_BADGE_COLOR[entry.action]}>{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                <span className="truncate text-slate-300">{TABLE_LABELS[entry.table_name] ?? entry.table_name}</span>
                <span className="shrink-0 text-slate-500">by {entry.performed_by_username ?? '—'}</span>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{formatRelative(entry.performed_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
