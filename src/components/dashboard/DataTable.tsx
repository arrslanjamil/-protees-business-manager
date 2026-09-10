import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { classNames } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  searchPlaceholder?: string
  searchFn?: (row: T, query: string) => boolean
  pageSize?: number
  emptyMessage?: string
}

/** Modern, compact table: sticky header, rounded corners, soft borders,
 * optional search + pagination — for tabular detail tucked inside a
 * dashboard collapsible section (the full unbounded version lives on the
 * Reports page). */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchPlaceholder = 'Search…',
  searchFn,
  pageSize = 8,
  emptyMessage = 'No records.',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!searchFn || !query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter((r) => searchFn(r, q))
  }, [rows, query, searchFn])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize)

  return (
    <div>
      {searchFn && (
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-8"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </div>
      )}
      <div className="max-h-80 overflow-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="sticky top-0 z-10 bg-base-900">
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={classNames('px-4 py-3 font-medium', c.align === 'right' && 'text-right')}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-white/[0.02]">
                  {columns.map((c) => (
                    <td key={c.key} className={classNames('px-4 py-3 text-slate-300', c.align === 'right' && 'text-right')}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {clampedPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={clampedPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
