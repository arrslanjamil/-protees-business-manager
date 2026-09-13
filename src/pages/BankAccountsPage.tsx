import { useMemo, useState } from 'react'
import { Landmark, Plus } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'

export function BankAccountsPage() {
  const { bankAccountsWithBalance, bankTransactions, addBankAccount } = useCollections()
  const { showToast } = useToast()

  const totalBalance = useMemo(() => bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0), [bankAccountsWithBalance])
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])
  const sortedTransactions = useMemo(
    () => [...bankTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
    [bankTransactions]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addBankAccount(name.trim())
      showToast('success', 'Bank account added.')
      setName('')
      setModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add bank account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Bank Accounts</h1>
          <p className="mt-1 text-sm text-slate-400">Balances derived from the credit/debit ledger — never a stored total.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Bank Account
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Bank Balance" value={formatCurrency(totalBalance)} icon={Landmark} accent="cyan" />
        {bankAccountsWithBalance.map((b) => (
          <StatCard key={b.id} label={b.name} value={formatCurrency(b.balance)} icon={Landmark} accent="purple" />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Transactions</h2>
        {sortedTransactions.length === 0 ? (
          <EmptyState icon={Landmark} title="No bank transactions yet" description="Courier bank-transfer payments and withdrawals will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Bank</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Reference</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{bankNameById.get(t.bank_account_id) ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={t.type === 'credit' ? 'text-neon-green' : 'text-neon-red'}>{t.type === 'credit' ? 'Credit' : 'Debit'}</span>
                    </td>
                    <td className={`px-5 py-3.5 font-semibold ${t.type === 'credit' ? 'text-neon-green' : 'text-neon-red'}`}>
                      {t.type === 'credit' ? '+' : '−'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{t.reference_type ? t.reference_type.replace('_', ' ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Bank Account" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label-field">Bank name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HBL" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
