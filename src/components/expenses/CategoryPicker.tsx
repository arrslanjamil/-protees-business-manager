import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { classNames, errorMessage } from '@/lib/utils'

interface CategoryPickerProps {
  value: string
  onChange: (name: string) => void
  categories: string[]
  onAddCategory: (name: string) => Promise<void>
  label?: string
}

export function CategoryPicker({ value, onChange, categories, onAddCategory, label = 'Category' }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.toLowerCase().includes(q))
  }, [categories, search])

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

  function selectCategory(name: string) {
    onChange(name)
    setOpen(false)
    setSearch('')
  }

  function openAddModal() {
    setNewCategoryName(search.trim())
    setAddError(null)
    setAddModalOpen(true)
  }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setAddError('Enter a category name.')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      await onAddCategory(trimmed)
      onChange(trimmed)
      setAddModalOpen(false)
      setOpen(false)
      setSearch('')
    } catch (err) {
      setAddError(errorMessage(err, 'Failed to add category.'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="label-field">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className={value ? 'text-slate-100' : 'text-slate-500'}>{value || 'Select category'}</span>
        <ChevronDown size={16} className={classNames('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-white/10 bg-base-850 shadow-xl shadow-black/40">
          <div className="relative border-b border-white/5 p-2">
            <Search size={14} className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              className="input-field pl-8 text-sm"
              placeholder="Search category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-center text-sm text-slate-500">No category found</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectCategory(c)}
                  className={classNames(
                    'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition',
                    value === c ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  {c}
                  {value === c && <Check size={14} />}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex w-full items-center gap-2 border-t border-white/5 px-3.5 py-2.5 text-left text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/5"
          >
            <Plus size={14} /> Add New Category
          </button>
        </div>
      )}

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Category" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label-field">Category name</label>
            <input
              className="input-field"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Tea"
              autoFocus
            />
          </div>
          {addError && <p className="text-xs text-neon-red">{addError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setAddModalOpen(false)} disabled={adding}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddCategory} disabled={adding}>
              {adding ? 'Saving…' : 'Save Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
