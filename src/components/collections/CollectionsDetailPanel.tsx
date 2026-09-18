import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Receipt, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { exportReportExcel, exportReportPdf } from '@/lib/reportExport'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface CollectionsDetailRow {
  id: string
  date: string
  type: string
  typeColor: 'cyan' | 'purple' | 'green' | 'red' | 'amber' | 'slate'
  source: string
  amount: number
  /** 'in' shows a green "+", 'out' a red "-", 'neutral' a plain green
   * amount (collections — always inbound money, no sign needed). */
  amountKind: 'in' | 'out' | 'neutral'
  addedBy: string
  notes: string
  /** Balance immediately after this transaction, oldest-to-newest —
   * only meaningful for a single account's own ledger (a bank, Office
   * Cash, a courier). Omitted for mixed views like Total Collections. */
  runningBalance?: number
  onDelete?: () => void
}

interface CollectionsDetailBodyProps {
  title: string
  subtitle: string
  rows: CollectionsDetailRow[]
  filenameBase: string
  emptyMessage?: string
  /** Caps the scrollable list height — the shared top-card panel wants a
   * shorter box (page already has content below it); an inline accordion
   * card can afford to show more before scrolling. */
  maxHeightClassName?: string
}

/** Search + Export + the row list itself — shared between the shared
 * top-card detail panel and each account's inline accordion body, so the
 * two surfaces never drift apart in behavior. */
export function CollectionsDetailBody({ title, subtitle, rows, filenameBase, emptyMessage, maxHeightClassName = 'max-h-[28rem]' }: CollectionsDetailBodyProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => [r.type, r.source, r.addedBy, r.notes].some((f) => f.toLowerCase().includes(q)))
  }, [rows, search])

  const hasRunningBalance = rows.some((r) => r.runningBalance != null)

  async function handleExport(format: 'pdf' | 'excel') {
    if (format === 'pdf') {
      await exportReportPdf({
        title,
        subtitle,
        head: hasRunningBalance ? ['Date', 'Type', 'Source', 'Amount', 'Balance', 'Added By', 'Notes'] : ['Date', 'Type', 'Source', 'Amount', 'Added By', 'Notes'],
        rows: filtered.map((r) =>
          hasRunningBalance
            ? [formatDate(r.date), r.type, r.source, formatCurrency(r.amount), r.runningBalance != null ? formatCurrency(r.runningBalance) : '', r.addedBy, r.notes]
            : [formatDate(r.date), r.type, r.source, formatCurrency(r.amount), r.addedBy, r.notes]
        ),
        filename: `${filenameBase}.pdf`,
      })
    } else {
      await exportReportExcel({
        rows: filtered.map((r) => ({
          Date: r.date,
          Type: r.type,
          Source: r.source,
          Amount: r.amount,
          ...(hasRunningBalance ? { Balance: r.runningBalance ?? '' } : {}),
          'Added By': r.addedBy,
          Notes: r.notes,
        })),
        sheetName: title.slice(0, 31),
        filename: `${filenameBase}.xlsx`,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9 text-sm" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={() => handleExport('pdf')} disabled={filtered.length === 0}>
            <FileText size={14} /> Export PDF
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => handleExport('excel')} disabled={filtered.length === 0}>
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Nothing here" description={emptyMessage ?? 'No matching records.'} />
      ) : (
        <div className={`${maxHeightClassName} divide-y divide-white/5 overflow-y-auto`}>
          {filtered.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{r.source}</span>
                  <Badge color={r.typeColor}>{r.type}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(r.date)} · Added by {r.addedBy}
                </p>
                {r.notes && <p className="mt-0.5 truncate text-xs text-slate-500">{r.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <span className={r.amountKind === 'out' ? 'block font-display text-sm font-semibold text-neon-red' : 'block font-display text-sm font-semibold text-neon-green'}>
                    {r.amountKind === 'in' ? '+' : r.amountKind === 'out' ? '-' : ''}
                    {formatCurrency(r.amount)}
                  </span>
                  {r.runningBalance != null && <span className="text-[11px] text-slate-500">Bal: {formatCurrency(r.runningBalance)}</span>}
                </div>
                {r.onDelete && (
                  <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={r.onDelete}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface CollectionsDetailPanelProps {
  title: string
  subtitle: string
  rows: CollectionsDetailRow[]
  onClose: () => void
  filenameBase: string
  emptyMessage?: string
}

/** The shared panel for the top summary cards (Total/Courier/Shopify
 * Collections, Office Cash, Total Bank Balance) — a mixed, page-level
 * view, so it keeps its own title header and close button. Individual
 * account cards use CollectionsDetailBody directly inside their own
 * accordion instead (see AccountCard). */
export function CollectionsDetailPanel({ title, subtitle, rows, onClose, filenameBase, emptyMessage }: CollectionsDetailPanelProps) {
  return (
    <div className="card space-y-4 border-neon-cyan/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <CollectionsDetailBody title={title} subtitle={subtitle} rows={rows} filenameBase={filenameBase} emptyMessage={emptyMessage} />
    </div>
  )
}
