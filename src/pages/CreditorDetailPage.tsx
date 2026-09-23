import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Paperclip, Plus, Receipt, Trash2, X } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useMasterData } from '@/context/MasterDataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { PAYMENT_TYPE_LABELS, type PaymentType } from '@/lib/types'
import { getInvoiceUrl, INVOICE_ACCEPT } from '@/lib/invoiceStorage'
import { classNames, errorMessage, formatCurrency, formatDate, todayISO } from '@/lib/utils'

function SummaryCard({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={classNames('mt-2 font-display text-lg font-bold', tone)}>{value}</p>
    </div>
  )
}

type LedgerRow = { id: string; date: string; kind: 'bill' | 'payment'; amount: number; description: string; deleteId: number; invoicePath?: string | null }

export function CreditorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    creditorsWithBalance,
    creditorBills,
    creditorPayments,
    bankAccountsWithBalance,
    updateCreditor,
    setCreditorActive,
    deleteCreditor,
    addCreditorBill,
    deleteCreditorBill,
    addCreditorPayment,
    deleteCreditorPayment,
  } = useCollections()
  const { itemsFor, addItem } = useMasterData()

  const creditor = creditorsWithBalance.find((c) => c.id === Number(id))
  const categoryNames = itemsFor('creditor_category').map((i) => i.name)

  const [billModalOpen, setBillModalOpen] = useState(false)
  const [billAmount, setBillAmount] = useState('')
  const [billDate, setBillDate] = useState(todayISO())
  const [billDescription, setBillDescription] = useState('')
  const [billRef, setBillRef] = useState('')
  const [billInvoice, setBillInvoice] = useState<File | null>(null)
  const billInvoiceInput = useRef<HTMLInputElement>(null)
  const [billSaving, setBillSaving] = useState(false)
  const [billError, setBillError] = useState<string | null>(null)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [paymentBankId, setPaymentBankId] = useState<number | ''>('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const bills = useMemo(() => creditorBills.filter((b) => b.creditor_id === Number(id)), [creditorBills, id])
  const payments = useMemo(() => creditorPayments.filter((p) => p.creditor_id === Number(id)), [creditorPayments, id])

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = [
      ...bills.map((b) => ({ id: `bill-${b.id}`, date: b.bill_date, kind: 'bill' as const, amount: Number(b.amount), description: b.description || 'Bill', deleteId: b.id, invoicePath: b.invoice_path })),
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        date: p.payment_date,
        kind: 'payment' as const,
        amount: Number(p.amount),
        description: p.payment_type === 'bank_transfer' ? `Payment — ${bankAccountsWithBalance.find((b) => b.id === p.bank_account_id)?.name ?? 'Bank'}` : 'Payment — Cash',
        deleteId: p.id,
      })),
    ]
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [bills, payments, bankAccountsWithBalance])

  if (!creditor) {
    return (
      <div className="space-y-4">
        <button className="btn-secondary" onClick={() => navigate('/creditors')}>
          <ArrowLeft size={16} /> Back to Creditors
        </button>
        <EmptyState icon={Receipt} title="Creditor not found" description="It may have been removed." />
      </div>
    )
  }

  function openBillModal() {
    setBillAmount('')
    setBillDate(todayISO())
    setBillDescription('')
    setBillRef('')
    setBillInvoice(null)
    setBillError(null)
    setBillModalOpen(true)
  }

  async function openInvoice(path: string) {
    try {
      window.open(await getInvoiceUrl(path), '_blank', 'noopener')
    } catch (err) {
      alert(errorMessage(err, 'Could not open invoice.'))
    }
  }

  async function handleSaveBill() {
    const amt = Number(billAmount)
    if (!amt || amt <= 0) {
      setBillError('Enter a valid amount.')
      return
    }
    setBillSaving(true)
    setBillError(null)
    try {
      await addCreditorBill({ creditorId: creditor!.id, amount: amt, billDate, description: billDescription.trim() || undefined, referenceNumber: billRef.trim() || undefined, invoiceFile: billInvoice })
      setBillModalOpen(false)
    } catch (err) {
      setBillError(errorMessage(err, 'Failed to save bill.'))
    } finally {
      setBillSaving(false)
    }
  }

  function openPaymentModal() {
    setPaymentAmount('')
    setPaymentDate(todayISO())
    setPaymentType('cash')
    setPaymentBankId(bankAccountsWithBalance[0]?.id ?? '')
    setPaymentNotes('')
    setPaymentError(null)
    setPaymentModalOpen(true)
  }

  async function handleSavePayment() {
    const amt = Number(paymentAmount)
    if (!amt || amt <= 0) {
      setPaymentError('Enter a valid amount.')
      return
    }
    if (paymentType === 'bank_transfer' && !paymentBankId) {
      setPaymentError('Select a bank account.')
      return
    }
    setPaymentSaving(true)
    setPaymentError(null)
    try {
      await addCreditorPayment({
        creditorId: creditor!.id,
        amount: amt,
        paymentDate,
        paymentType,
        bankAccountId: paymentType === 'bank_transfer' ? Number(paymentBankId) : null,
        notes: paymentNotes.trim() || undefined,
      })
      setPaymentModalOpen(false)
    } catch (err) {
      setPaymentError(errorMessage(err, 'Failed to save payment.'))
    } finally {
      setPaymentSaving(false)
    }
  }

  function openEditModal() {
    setEditName(creditor!.name)
    setEditCategory(creditor!.category ?? '')
    setEditContact(creditor!.contact_person ?? '')
    setEditPhone(creditor!.phone ?? '')
    setEditAddress(creditor!.address ?? '')
    setEditNotes(creditor!.notes ?? '')
    setEditError(null)
    setEditModalOpen(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      setEditError('Enter a name.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      await updateCreditor(creditor!.id, {
        name: editName.trim(),
        category: editCategory || null,
        contactPerson: editContact.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
        openingBalance: Number(creditor!.opening_balance),
      })
      setEditModalOpen(false)
    } catch (err) {
      setEditError(errorMessage(err, 'Failed to save changes.'))
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteRow(row: LedgerRow) {
    if (!confirm(`Delete this ${row.kind}?`)) return
    if (row.kind === 'bill') await deleteCreditorBill(row.deleteId)
    else await deleteCreditorPayment(row.deleteId)
  }

  async function handleDeleteCreditor() {
    if (!confirm(`Permanently delete "${creditor!.name}"? Only possible with no bills or payments on record.`)) return
    try {
      await deleteCreditor(creditor!.id)
      navigate('/creditors')
    } catch (err) {
      alert(errorMessage(err, 'Failed to delete.'))
    }
  }

  return (
    <div className="space-y-6">
      <button className="text-sm font-medium text-slate-400 hover:text-white" onClick={() => navigate('/creditors')}>
        <ArrowLeft size={14} className="mr-1 inline" /> Back to Creditors
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{creditor.name}</h1>
            {creditor.category && <Badge color="amber">{creditor.category}</Badge>}
            {!creditor.is_active && <Badge color="slate">Archived</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {[creditor.contact_person, creditor.phone, creditor.address].filter(Boolean).join(' · ') || 'No contact details yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={openEditModal}>
            Edit
          </button>
          <button className="btn-secondary" onClick={() => setCreditorActive(creditor.id, !creditor.is_active)}>
            {creditor.is_active ? (
              <>
                <Archive size={15} /> Archive
              </>
            ) : (
              <>
                <ArchiveRestore size={15} /> Restore
              </>
            )}
          </button>
          <button className="btn-secondary" onClick={openBillModal}>
            <Plus size={15} /> Add Bill
          </button>
          <button className="btn-primary" onClick={openPaymentModal}>
            <Plus size={15} /> Record Payment
          </button>
          {bills.length === 0 && payments.length === 0 && creditor.opening_balance === 0 && (
            <button className="rounded-xl p-2.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={handleDeleteCreditor} title="Delete permanently">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Outstanding Balance" value={formatCurrency(creditor.outstandingBalance)} tone={creditor.outstandingBalance > 0 ? 'text-neon-red' : 'text-neon-green'} />
        <SummaryCard label="Total Billed" value={formatCurrency(creditor.opening_balance + creditor.totalBilled)} />
        <SummaryCard label="Total Paid" value={formatCurrency(creditor.totalPaid)} tone="text-neon-green" />
      </div>

      {creditor.notes && (
        <div className="card">
          <p className="text-xs uppercase tracking-wider text-slate-400">Notes</p>
          <p className="mt-1 text-sm text-slate-300">{creditor.notes}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Ledger</h2>
        {ledgerRows.length === 0 && creditor.opening_balance === 0 ? (
          <EmptyState icon={Receipt} title="No activity yet" description="Add a bill for what you owe, or record a payment." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {creditor.opening_balance !== 0 && (
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3.5 text-slate-500">—</td>
                    <td className="px-5 py-3.5">
                      <Badge color="purple">Opening Balance</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">Balance carried in when creditor was added</td>
                    <td className="px-5 py-3.5 font-semibold text-neon-red">{formatCurrency(creditor.opening_balance)}</td>
                    <td className="px-5 py-3.5" />
                  </tr>
                )}
                {ledgerRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(row.date)}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={row.kind === 'bill' ? 'red' : 'green'}>{row.kind === 'bill' ? 'Bill' : 'Payment'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {row.description}
                      {row.invoicePath && (
                        <button
                          type="button"
                          onClick={() => openInvoice(row.invoicePath!)}
                          className="ml-2 inline-flex items-center gap-1 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/20"
                        >
                          <Paperclip size={11} /> Invoice
                        </button>
                      )}
                    </td>
                    <td className={classNames('px-5 py-3.5 font-semibold', row.kind === 'bill' ? 'text-neon-red' : 'text-neon-green')}>
                      {row.kind === 'bill' ? '+' : '-'}
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDeleteRow(row)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={billModalOpen} onClose={() => setBillModalOpen(false)} title="Add Bill" subtitle="Increases what you owe — no cash/bank movement.">
        <div className="space-y-4">
          <div>
            <label className="label-field">Amount</label>
            <input type="number" className="input-field" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Description</label>
            <input className="input-field" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} placeholder="e.g. Fabric purchase — 200 meters" />
          </div>
          <div>
            <label className="label-field">Reference / Invoice Number (optional)</label>
            <input className="input-field" value={billRef} onChange={(e) => setBillRef(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Upload Invoice (picture or PDF — kept as proof)</label>
            <input ref={billInvoiceInput} type="file" accept={INVOICE_ACCEPT} className="hidden" onChange={(e) => setBillInvoice(e.target.files?.[0] ?? null)} />
            {billInvoice ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-200">
                  <Paperclip size={14} className="shrink-0 text-neon-cyan" />
                  <span className="truncate">{billInvoice.name}</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    setBillInvoice(null)
                    if (billInvoiceInput.current) billInvoiceInput.current.value = ''
                  }}
                  aria-label="Remove invoice"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" className="btn-secondary w-full" onClick={() => billInvoiceInput.current?.click()}>
                <Paperclip size={15} /> Choose Picture / Take Photo
              </button>
            )}
          </div>
          {billError && <p className="text-xs text-neon-red">{billError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setBillModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveBill} disabled={billSaving}>
              {billSaving ? 'Saving…' : 'Save Bill'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Payment" subtitle="Reduces what you owe and posts to Office Cash or the selected bank.">
        <div className="space-y-4">
          <div>
            <label className="label-field">Amount</label>
            <input type="number" className="input-field" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Paid From</label>
            <div className="grid grid-cols-2 gap-3">
              {(['cash', 'bank_transfer'] as PaymentType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentType(m)}
                  className={classNames(
                    'rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition',
                    paymentType === m ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {m === 'cash' ? 'Office Cash' : PAYMENT_TYPE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {paymentType === 'bank_transfer' && (
            <div>
              <label className="label-field">Bank Account</label>
              <select className="input-field" value={paymentBankId} onChange={(e) => setPaymentBankId(Number(e.target.value))}>
                {bankAccountsWithBalance.length === 0 && <option value="">No bank accounts yet — add one from Collections</option>}
                {bankAccountsWithBalance.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatCurrency(b.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
          </div>
          {paymentError && <p className="text-xs text-neon-red">{paymentError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSavePayment} disabled={paymentSaving}>
              {paymentSaving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Creditor">
        <div className="space-y-4">
          <div>
            <label className="label-field">Name</label>
            <input className="input-field" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <CategoryPicker value={editCategory} onChange={setEditCategory} categories={categoryNames} onAddCategory={(n) => addItem('creditor_category', n).then(() => {})} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Contact Person</label>
              <input className="input-field" value={editContact} onChange={(e) => setEditContact(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Phone</label>
              <input className="input-field" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Address</label>
            <input className="input-field" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Notes</label>
            <input className="input-field" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          {editError && <p className="text-xs text-neon-red">{editError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
