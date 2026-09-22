import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { classNames } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
  /** Extra searchable/displayable text shown under the label (e.g. a
   * department or subtitle) — matched by search too. */
  hint?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

/** A `<select>` replacement for long lists (e.g. the full employee roster)
 * that filters as you type — a native `<select>` has no way to search by
 * substring, especially on mobile where it's just one long scroll. Same
 * open/search/click-outside pattern as CategoryPicker, without the
 * "add new" affordance (nothing to add here — the list is fixed). */
export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyMessage = 'No match found' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
  }, [options, search])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function selectOption(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="input-field flex items-center justify-between text-left">
        <span className={classNames('truncate', selected ? 'text-slate-100' : 'text-slate-500')}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={classNames('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-white/10 bg-base-850 shadow-xl shadow-black/40">
          <div className="relative border-b border-white/5 p-2">
            <Search size={14} className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input autoFocus className="input-field pl-8 text-sm" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => selectOption(o.value)}
                  className={classNames(
                    'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition',
                    value === o.value ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-slate-500">{o.hint}</span>}
                  </span>
                  {value === o.value && <Check size={14} className="shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
