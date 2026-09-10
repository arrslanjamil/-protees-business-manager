import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { classNames } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  summary: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** A card that shows only a title + one-line summary until clicked open.
 * Used for the dashboard's secondary detail sections (tables, activity
 * feed) so they don't compete with the top KPIs for attention. */
export function CollapsibleSection({ title, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="flex items-center gap-2.5">
          <ChevronDown size={16} className={classNames('shrink-0 text-slate-500 transition-transform duration-200', open && 'rotate-180')} />
          <span className="font-display text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</span>
        </span>
        <span className="truncate text-xs text-slate-500">{summary}</span>
      </button>
      {open && <div className="mt-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  )
}
