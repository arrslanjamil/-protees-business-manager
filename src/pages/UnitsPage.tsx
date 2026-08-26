import { useState } from 'react'
import { Boxes, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Unit } from '@/lib/types'

export function UnitsPage() {
  const { units, employees, addUnit, updateUnit, deleteUnit } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setLocation('')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(unit: Unit) {
    setEditing(unit)
    setName(unit.name)
    setLocation(unit.location ?? '')
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Unit name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateUnit(editing.id, { name: name.trim(), location: location.trim() || null })
      } else {
        await addUnit({ name: name.trim(), location: location.trim() || null })
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save unit.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(unit: Unit) {
    if (!confirm(`Delete unit "${unit.name}"? Employees assigned to it will become unassigned.`)) return
    await deleteUnit(unit.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Units</h1>
          <p className="mt-1 text-sm text-slate-400">Branches, locations, or departments in your business.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Unit
        </button>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No units yet"
          description="Create your first unit to start organizing employees and expenses."
          action={
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Unit
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => {
            const staffCount = employees.filter((e) => e.unit_id === unit.id).length
            return (
              <div key={unit.id} className="card group">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-neon-purple/10 p-2.5 text-neon-purple">
                    <Boxes size={20} />
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                      onClick={() => openEdit(unit)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-neon-red/10 hover:text-neon-red"
                      onClick={() => handleDelete(unit)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">{unit.name}</h3>
                {unit.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={12} /> {unit.location}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <Users size={12} /> {staffCount} employee{staffCount === 1 ? '' : 's'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Unit' : 'Add Unit'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Branch" />
          </div>
          <div>
            <label className="label-field">Location (optional)</label>
            <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lahore" />
          </div>
          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
