import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, Plus } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useMasterData } from '@/context/MasterDataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { classNames, formatCurrency, formatDate } from '@/lib/utils'

function SummaryCard({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={classNames('mt-2 font-display text-lg font-bold', tone)}>{value}</p>
    </div>
  )
}

export function CreditorsPage() {
  const { creditorsWithBalance, totalOutstandingCreditors, addCreditor } = useCollections()
  const { itemsFor, addItem } = useMasterData()
  const navigate = useNavigate()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categoryNames = itemsFor('creditor_category').map((i) => i.name)

  const visibleCreditors = useMemo(
    () =>
      creditorsWithBalance
        .filter((c) => showInactive || c.is_active)
        .filter((c) => categoryFilter === 'all' || c.category === categoryFilter)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance),
    [creditorsWithBalance, showInactive, categoryFilter]
  )

  const activeCreditorCount = creditorsWithBalance.filter((c) => c.is_active).length

  function openCreate() {
    setName('')
    setCategory('')
    setContactPerson('')
    setPhone('')
    setAddress('')
    setOpeningBalance('')
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Enter a creditor name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const creditor = await addCreditor({
        name: name.trim(),
        category: category || null,
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        openingBalance: Number(openingBalance) || 0,
      })
      setModalOpen(false)
      navigate(`/creditors/${creditor.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add creditor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Creditors</h1>
          <p className="mt-1 text-sm text-slate-400">Suppliers and vendors the business owes money to.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Creditor
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Outstanding" value={formatCurrency(totalOutstandingCreditors)} tone="text-neon-red" />
        <SummaryCard label="Active Creditors" value={String(activeCreditorCount)} />
        <SummaryCard label="Categories" value={String(categoryNames.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Category:</span>
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={classNames(
            'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
            categoryFilter === 'all' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
          )}
        >
          All
        </button>
        {categoryNames.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              categoryFilter === c ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {c}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show archived
        </label>
      </div>

      {visibleCreditors.length === 0 ? (
        <EmptyState icon={HandCoins} title="No creditors yet" description="Add a supplier or vendor to start tracking what you owe them." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Outstanding</th>
                <th className="px-5 py-3.5">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {visibleCreditors.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  onClick={() => navigate(`/creditors/${c.id}`)}
                >
                  <td className="px-5 py-3.5 font-medium text-white">
                    {c.name}
                    {!c.is_active && (
                      <span className="ml-2">
                        <Badge color="slate">Archived</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">{c.category ? <Badge color="amber">{c.category}</Badge> : <span className="text-slate-500">—</span>}</td>
                  <td className="px-5 py-3.5 text-slate-400">{c.phone || '—'}</td>
                  <td className={classNames('px-5 py-3.5 font-semibold', c.outstandingBalance > 0 ? 'text-neon-red' : 'text-neon-green')}>
                    {formatCurrency(c.outstandingBalance)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{c.lastActivityDate ? formatDate(c.lastActivityDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Creditor">
        <div className="space-y-4">
          <div>
            <label className="label-field">Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ABC Fabric Traders" />
          </div>
          <CategoryPicker value={category} onChange={setCategory} categories={categoryNames} onAddCategory={(n) => addItem('creditor_category', n).then(() => {})} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Contact Person</label>
              <input className="input-field" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Phone</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Address</label>
            <input className="input-field" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Opening Balance (already owed, if any)</label>
            <input type="number" className="input-field" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
