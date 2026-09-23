import { useMemo, useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { useMasterData } from '@/context/MasterDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { classNames, errorMessage } from '@/lib/utils'

export function MasterDataPage() {
  const { types, loading, allItemsFor, addItem, renameItem, setItemActive, deleteItem } = useMasterData()
  const [activeType, setActiveType] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const currentTypeKey = activeType ?? types[0]?.key ?? null
  const currentType = types.find((t) => t.key === currentTypeKey)
  const items = useMemo(() => (currentTypeKey ? allItemsFor(currentTypeKey) : []), [currentTypeKey, allItemsFor])
  const visibleItems = showArchived ? items : items.filter((i) => i.is_active)

  async function handleAdd() {
    if (!currentTypeKey) return
    if (!newName.trim()) {
      setError('Enter a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addItem(currentTypeKey, newName)
      setNewName('')
    } catch (err) {
      setError(errorMessage(err, 'Failed to add.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(id: number) {
    if (!editingName.trim()) return
    try {
      await renameItem(id, editingName)
      setEditingId(null)
    } catch (err) {
      setError(errorMessage(err, 'Failed to rename.'))
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone — if it's in use elsewhere, archive it instead.`)) return
    try {
      await deleteItem(id)
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete — it may still be referenced elsewhere.'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Master Data</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage every dropdown used across the app — categories, units, colors, payment methods, and more. Nothing here requires a
          developer or a deploy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <div className="card space-y-1 p-2">
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveType(t.key)
                setError(null)
                setEditingId(null)
              }}
              className={classNames(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                currentTypeKey === t.key ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Settings size={14} className="shrink-0 opacity-60" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {!currentType ? (
            <EmptyState icon={Settings} title="No master data types yet" description="Types are seeded by the database migration." />
          ) : (
            <>
              <div className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    className="input-field flex-1"
                    placeholder={`Add a new ${currentType.label.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')}…`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <button className="btn-primary" onClick={handleAdd} disabled={saving}>
                    <Plus size={16} /> Add
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-neon-red">{error}</p>}
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{currentType.label}</h2>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                  Show archived
                </label>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : visibleItems.length === 0 ? (
                <EmptyState icon={Settings} title="Nothing here yet" description={`Add the first ${currentType.label.toLowerCase()} above.`} />
              ) : (
                <div className="card overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {visibleItems.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-5 py-3">
                            {editingId === item.id ? (
                              <input
                                className="input-field"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename(item.id)}
                                autoFocus
                              />
                            ) : (
                              <span className={classNames('font-medium', item.is_active ? 'text-white' : 'text-slate-500 line-through')}>
                                {item.name}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {!item.is_active && <Badge color="slate">Archived</Badge>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              {editingId === item.id ? (
                                <>
                                  <button className="rounded-lg px-2.5 py-1 text-xs font-semibold text-neon-cyan hover:bg-white/5" onClick={() => handleRename(item.id)}>
                                    Save
                                  </button>
                                  <button className="rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-white/5" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                                    onClick={() => {
                                      setEditingId(item.id)
                                      setEditingName(item.name)
                                    }}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {item.is_active ? (
                                    <button
                                      className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-amber/10 hover:text-neon-amber"
                                      onClick={() => setItemActive(item.id, false)}
                                      title="Archive"
                                    >
                                      <Archive size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-green/10 hover:text-neon-green"
                                      onClick={() => setItemActive(item.id, true)}
                                      title="Restore"
                                    >
                                      <ArchiveRestore size={14} />
                                    </button>
                                  )}
                                  <button
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                                    onClick={() => handleDelete(item.id, item.name)}
                                    title="Delete permanently"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
