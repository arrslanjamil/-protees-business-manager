import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AuditLogEntry, AuditAction } from '@/lib/types'
import { AUDIT_ACTION_LABELS } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { classNames } from '@/lib/utils'

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

const ACTION_BADGE_COLOR: Record<AuditAction, 'green' | 'cyan' | 'red'> = {
  create: 'green',
  update: 'cyan',
  delete: 'red',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A plain-English summary for the one change type this page calls out
 * specially — an employee's Active/Inactive status — e.g. "Arslan marked
 * Ali Mughal as Inactive on 15 Sep 2026". Every other change still has
 * its full before/after JSON one click away. */
function describeEmployeeStatusChange(entry: AuditLogEntry): string | null {
  if (entry.table_name !== 'employees' || entry.action !== 'update') return null
  const wasActive = entry.old_data?.is_active
  const isActive = entry.new_data?.is_active
  if (typeof wasActive !== 'boolean' || typeof isActive !== 'boolean' || wasActive === isActive) return null
  const name = (entry.new_data?.name as string | undefined) ?? `#${entry.record_id}`
  const who = entry.performed_by_username ?? 'Someone'
  return `${who} marked ${name} as ${isActive ? 'Active' : 'Inactive'} on ${formatDateTime(entry.performed_at)}`
}

export function ActivityLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [users, setUsers] = useState<{ username: string; display_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [userFilter, setUserFilter] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    supabase
      .from('app_users')
      .select('username, display_name')
      .then(({ data }) => setUsers(data ?? []))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    let query = supabase.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(300)
    if (userFilter) query = query.eq('performed_by_username', userFilter)
    if (tableFilter) query = query.eq('table_name', tableFilter)
    if (startDate) query = query.gte('performed_at', `${startDate}T00:00:00`)
    if (endDate) query = query.lte('performed_at', `${endDate}T23:59:59`)

    query.then(({ data, error: err }) => {
      if (!active) return
      if (err) {
        setError(err.message)
      } else {
        setEntries(data ?? [])
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [userFilter, tableFilter, startDate, endDate])

  const tableOptions = useMemo(() => Object.keys(TABLE_LABELS), [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-400">Every create, update, and delete across the system, with who did it and when.</p>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label-field">User</label>
            <select className="input-field" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Table</label>
            <select className="input-field" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
              <option value="">All Tables</option>
              {tableOptions.map((t) => (
                <option key={t} value={t}>
                  {TABLE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">From</label>
            <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">To</label>
            <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-neon-red">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="No activity found" description="Try widening the filters above." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Table</th>
                <th className="px-5 py-3.5">Record</th>
                <th className="px-5 py-3.5">Date/Time</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const statusChangeSummary = describeEmployeeStatusChange(entry)
                return (
                <Fragment key={entry.id}>
                  <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{entry.performed_by_username ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={ACTION_BADGE_COLOR[entry.action]}>{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{TABLE_LABELS[entry.table_name] ?? entry.table_name}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {statusChangeSummary ? <span className="text-neon-amber">{statusChangeSummary}</span> : `#${entry.record_id}`}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDateTime(entry.performed_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        {expandedId === entry.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr className="border-b border-white/5 bg-white/[0.015]">
                      <td colSpan={6} className="px-5 py-4">
                        <div className={classNames('grid gap-4', entry.old_data && entry.new_data ? 'sm:grid-cols-2' : 'grid-cols-1')}>
                          {entry.old_data && (
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {entry.action === 'delete' ? 'Deleted Record' : 'Before'}
                              </p>
                              <pre className="overflow-x-auto rounded-lg bg-base-900/60 p-3 text-xs text-slate-400">
                                {JSON.stringify(entry.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.new_data && (
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {entry.action === 'create' ? 'New Record' : 'After'}
                              </p>
                              <pre className="overflow-x-auto rounded-lg bg-base-900/60 p-3 text-xs text-slate-400">
                                {JSON.stringify(entry.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
