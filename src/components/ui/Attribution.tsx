import { formatDate } from '@/lib/utils'

interface AttributionProps {
  createdByUsername: string | null
  createdAt: string
  updatedByUsername?: string | null
  updatedAt?: string | null
  className?: string
}

/** "Created by X · 02 Sep 2026" (+ "Updated by Y · ..." when present).
 * Falls back to "—" for pre-existing records that predate the audit
 * trail — never guesses or fabricates an author. */
export function Attribution({ createdByUsername, createdAt, updatedByUsername, updatedAt, className }: AttributionProps) {
  return (
    <p className={className ?? 'text-[11px] text-slate-500'}>
      Created by {createdByUsername ?? '—'} · {formatDate(createdAt)}
      {updatedByUsername && updatedAt && (
        <>
          {' '}
          · Updated by {updatedByUsername} · {formatDate(updatedAt)}
        </>
      )}
    </p>
  )
}
