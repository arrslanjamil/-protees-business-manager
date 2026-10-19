import { useMemo, useState } from 'react'
import { Boxes, HandCoins, MapPin, Pencil, Plus, Receipt, Trash2, UserCog, Users, Wallet } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { classNames, errorMessage, formatCurrency, formatDate, isWithinRange, todayISO } from '@/lib/utils'

interface TimelineEntry {
  id: string
  date: string
  type: 'Advance' | 'Payment'
  amount: number
  notes: string | null
  gross?: number
  overtime?: number
  deduction?: number
  pieces?: number | null
  rate?: number | null
  createdByUsername: string | null
}

export function ProteesUnitPage() {
  const {
    units,
    supervisors,
    advances,
    unitPayments,
    expenses,
    salaryPayments,
    employeesWithBalance,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    addAdvance,
    deleteAdvance,
    recordUnitPayment,
    deleteUnitPayment,
    balanceFor,
  } = useData()
  const { showToast } = useToast()

  const unitInfo = units[0]
  const supervisor = supervisors[0]

  const unitAdvances = useMemo(() => advances.filter((a) => a.department === 'protees_unit'), [advances])
  const outstandingBalance = supervisor ? balanceFor(supervisor.name, 'protees_unit') : 0

  const totalAdvancesGiven = unitAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
  const lastPaymentDate = useMemo(
    () =>
      unitPayments
        .filter((p) => !supervisor || p.supervisor_name === supervisor.name)
        .reduce<string | null>((latest, p) => (!latest || p.payment_date > latest ? p.payment_date : latest), null),
    [unitPayments, supervisor]
  )
  type HistoryRange = 'since_payment' | 'all' | 'custom'
  const [historyRange, setHistoryRange] = useState<HistoryRange>('since_payment')
  const [historyStart, setHistoryStart] = useState(todayISO())
  const [historyEnd, setHistoryEnd] = useState(todayISO())
  const historyFrom =
    historyRange === 'since_payment' ? (lastPaymentDate ?? '0001-01-01') : historyRange === 'custom' ? historyStart : '0001-01-01'
  const historyTo = historyRange === 'custom' ? historyEnd : '9999-12-31'

  const periodAdvances = unitAdvances
    .filter((a) => isWithinRange(a.payment_date, historyFrom, historyTo))
    .reduce((sum, a) => sum + Number(a.amount), 0)
  const periodPayments = unitPayments.filter((p) => isWithinRange(p.payment_date, historyFrom, historyTo))
  const totalPaymentsMade = periodPayments.reduce((sum, p) => sum + Number(p.net_amount), 0)

  // Unit Overview — the single source of truth for this page's summary
  // stats (no duplicate KPI row above it). Total Unit Cost = Total
  // Payments Made + Total Unit Expenses (Unit Employee Salaries is shown
  // alongside as its own figure, not folded into that formula, since Unit
  // Employee payroll is tracked separately via the Unit Payroll report).
  const totalUnitExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.expense_scope === 'unit' && isWithinRange(e.date, historyFrom, historyTo))
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses, historyFrom, historyTo]
  )
  const totalUnitEmployeeSalaries = useMemo(() => {
    const unitEmployeeNames = new Set(employeesWithBalance.filter((e) => e.employee_group === 'unit').map((e) => e.name))
    return salaryPayments
      .filter((p) => unitEmployeeNames.has(p.employee_name) && isWithinRange(p.payment_date, historyFrom, historyTo))
      .reduce((sum, p) => sum + Number(p.net_amount), 0)
  }, [salaryPayments, employeesWithBalance, historyFrom, historyTo])
  const totalUnitCost = totalPaymentsMade + totalUnitExpenses

  const timeline = useMemo<TimelineEntry[]>(() => {
    const rows: TimelineEntry[] = []
    for (const a of unitAdvances) {
      rows.push({
        id: `adv-${a.id}`,
        date: a.payment_date,
        type: 'Advance',
        amount: Number(a.amount),
        notes: a.notes,
        createdByUsername: a.created_by_username,
      })
    }
    for (const p of unitPayments) {
      rows.push({
        id: `pay-${p.id}`,
        date: p.payment_date,
        type: 'Payment',
        amount: Number(p.net_amount),
        notes: p.notes,
        gross: Number(p.total_amount),
        overtime: Number(p.overtime_amount),
        deduction: Number(p.advance_given),
        pieces: p.pieces_completed,
        rate: p.rate_per_piece,
        createdByUsername: p.created_by_username,
      })
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [unitAdvances, unitPayments])

  const filteredTimeline = useMemo(
    () => timeline.filter((e) => isWithinRange(e.date, historyFrom, historyTo)),
    [timeline, historyFrom, historyTo]
  )

  // --- Supervisor modal ---------------------------------------------------------
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false)
  const [supervisorName, setSupervisorName] = useState('')
  const [supervisorError, setSupervisorError] = useState<string | null>(null)
  const [savingSupervisor, setSavingSupervisor] = useState(false)

  function openSupervisorModal() {
    setSupervisorName(supervisor?.name ?? '')
    setSupervisorError(null)
    setSupervisorModalOpen(true)
  }

  async function handleSaveSupervisor() {
    if (!supervisorName.trim()) {
      setSupervisorError('Supervisor name is required.')
      return
    }
    setSavingSupervisor(true)
    setSupervisorError(null)
    try {
      if (supervisor) {
        await updateSupervisor(supervisor.id, { name: supervisorName.trim() })
      } else {
        await addSupervisor({ name: supervisorName.trim() })
      }
      setSupervisorModalOpen(false)
    } catch (err) {
      setSupervisorError(errorMessage(err, 'Failed to save supervisor.'))
    } finally {
      setSavingSupervisor(false)
    }
  }

  async function handleDeleteSupervisor() {
    if (!supervisor) return
    if (!confirm(`Remove supervisor ${supervisor.name}?`)) return
    await deleteSupervisor(supervisor.id)
  }

  // --- Give Advance modal --------------------------------------------------------
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false)
  const [advanceDate, setAdvanceDate] = useState(todayISO())
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceNotes, setAdvanceNotes] = useState('')
  const [advanceMethod, setAdvanceMethod] = useState<'Cash' | 'Online'>('Cash')
  const [advanceBankId, setAdvanceBankId] = useState<number | ''>('')
  const [advanceReference, setAdvanceReference] = useState('')
  const { bankAccounts } = useCollections()
  const [savingAdvance, setSavingAdvance] = useState(false)
  const [advanceError, setAdvanceError] = useState<string | null>(null)


  function openAdvanceModal() {
    setAdvanceDate(todayISO())
    setAdvanceAmount('')
    setAdvanceNotes('')
    setAdvanceMethod('Cash')
    setAdvanceBankId('')
    setAdvanceReference('')
    setAdvanceError(null)
    setAdvanceModalOpen(true)
  }

  async function handleSaveAdvance() {
    if (!supervisor) return
    const amt = Number(advanceAmount)
    if (Number.isNaN(amt) || amt <= 0) {
      setAdvanceError('Enter a valid amount.')
      return
    }
    setSavingAdvance(true)
    setAdvanceError(null)
    try {
      await addAdvance({
        name: supervisor.name,
        department: 'protees_unit',
        amount: amt,
        paymentDate: advanceDate,
        notes: advanceNotes.trim() || undefined,
        paymentMethod: advanceMethod,
        bankAccountId: advanceMethod === 'Online' && advanceBankId ? Number(advanceBankId) : null,
        referenceNumber: advanceMethod === 'Online' ? advanceReference.trim() || undefined : undefined,
      })
      setAdvanceModalOpen(false)
    } catch (err) {
      setAdvanceError(errorMessage(err, 'Failed to save advance.'))
    } finally {
      setSavingAdvance(false)
    }
  }

  // --- Make Payment modal ---------------------------------------------------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [grossAmount, setGrossAmount] = useState('')
  const [piecesInput, setPiecesInput] = useState('')
  const [pieceRateInput, setPieceRateInput] = useState('2')
  const [overtimeAmount, setOvertimeAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  function openPaymentModal() {
    setPaymentDate(todayISO())
    setGrossAmount('')
    setPiecesInput('')
    setPieceRateInput('2')
    setOvertimeAmount('')
    setPaymentNotes('')
    setPaymentError(null)
    setPaymentModalOpen(true)
  }

  const piecesNum = Number(piecesInput) || 0
  const pieceRateNum = Number(pieceRateInput) || 0
  const pieceGross = piecesNum > 0 ? piecesNum * pieceRateNum : 0
  const gross = piecesNum > 0 ? pieceGross : Number(grossAmount) || 0
  const overtime = Number(overtimeAmount) || 0
  const advanceDeduction = Math.min(outstandingBalance, gross + overtime)
  const netPayment = Math.max(0, gross + overtime - advanceDeduction)

  async function handleSavePayment() {
    if (!supervisor) return
    if (piecesNum < 0 || Number.isNaN(gross) || gross <= 0) {
      setPaymentError('Enter the pieces made (or a valid gross amount).')
      return
    }
    if (piecesNum > 0 && pieceRateNum <= 0) {
      setPaymentError('Enter a valid rate per piece.')
      return
    }
    if (overtime < 0) {
      setPaymentError('Overtime cannot be negative.')
      return
    }
    setSavingPayment(true)
    setPaymentError(null)
    try {
      await recordUnitPayment({
        supervisorName: supervisor.name,
        paymentDate,
        totalAmount: gross,
        overtimeAmount: overtime,
        advanceGiven: advanceDeduction,
        notes: paymentNotes.trim() || undefined,
        piecesCompleted: piecesNum > 0 ? piecesNum : null,
        ratePerPiece: piecesNum > 0 ? pieceRateNum : null,
      })
      setPaymentModalOpen(false)
    } catch (err) {
      setPaymentError(errorMessage(err, 'Failed to record payment.'))
    } finally {
      setSavingPayment(false)
    }
  }

  // --- Delete confirmation ---------------------------------------------------------
  const [confirmEntry, setConfirmEntry] = useState<TimelineEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)

  async function confirmDeleteEntry() {
    if (!confirmEntry) return
    const entry = confirmEntry
    setDeletingEntry(true)
    try {
      if (entry.type === 'Advance') {
        const id = Number(entry.id.replace('adv-', ''))
        await deleteAdvance(id)
        showToast('success', 'Advance deleted successfully.')
      } else {
        const id = Number(entry.id.replace('pay-', ''))
        await deleteUnitPayment(id)
        showToast('success', 'Payment deleted successfully.')
      }
      setConfirmEntry(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ProteesUnitPage] Failed to delete unit history record:', entry, err)
      const message = errorMessage(err, 'Failed to delete this record. Please try again.')
      showToast('error', message)
    } finally {
      setDeletingEntry(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Unit</h1>
          <p className="mt-1 text-sm text-slate-400">Give advances, make payments — advances deduct automatically.</p>
        </div>
        {supervisor ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2">
            <UserCog size={16} className="text-neon-cyan" />
            <span className="text-sm font-medium text-white">{supervisor.name}</span>
            <button className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white" onClick={openSupervisorModal}>
              <Pencil size={13} />
            </button>
            <button className="rounded-lg p-1 text-slate-400 hover:bg-neon-red/10 hover:text-neon-red" onClick={handleDeleteSupervisor}>
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={openSupervisorModal}>
            <Plus size={16} /> Add Supervisor
          </button>
        )}
      </div>

      {unitInfo && (
        <div className="flex items-center gap-3 rounded-xl border border-neon-purple/20 bg-neon-purple/5 px-4 py-3">
          <Boxes size={18} className="text-neon-purple" />
          <div>
            <p className="text-sm font-medium text-white">{unitInfo.name}</p>
            {unitInfo.location && (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={11} /> {unitInfo.location}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2">
          {lastPaymentDate && (
            <button
              type="button"
              onClick={() => setHistoryRange('since_payment')}
              className={classNames(
                'rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                historyRange === 'since_payment' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
              )}
            >
              Since last payment
            </button>
          )}
          {(['all', 'custom'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setHistoryRange(r)}
              className={classNames(
                'rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                historyRange === r ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
              )}
            >
              {r === 'all' ? 'All time' : 'Custom range'}
            </button>
          ))}
          {historyRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input-field py-1.5 text-xs" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} />
              <span className="text-xs text-slate-500">to</span>
              <input type="date" className="input-field py-1.5 text-xs" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} />
            </div>
          )}
          <span className="ml-auto text-xs text-slate-500">
            {historyRange === 'all' ? 'All records' : `From ${formatDate(historyFrom)}${historyRange === 'custom' ? ` to ${formatDate(historyTo)}` : ''}`}
          </span>
      </div>

      <div>
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-300">Unit Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Advances (Selected Period)"
            value={formatCurrency(periodAdvances)}
            icon={HandCoins}
            accent="amber"
            hint={`All time: ${formatCurrency(totalAdvancesGiven)}`}
          />
          <StatCard label="Total Payments Made" value={formatCurrency(totalPaymentsMade)} icon={Wallet} accent="green" hint={`${periodPayments.length} payments in period`} />
          <StatCard label="Total Unit Expenses" value={formatCurrency(totalUnitExpenses)} icon={Receipt} accent="purple" />
          <StatCard label="Total Unit Employee Salaries" value={formatCurrency(totalUnitEmployeeSalaries)} icon={Users} accent="cyan" />
          <StatCard label="Outstanding Balance" value={formatCurrency(outstandingBalance)} icon={HandCoins} accent={outstandingBalance > 0 ? 'red' : 'green'} />
          <StatCard label="Total Unit Cost" value={formatCurrency(totalUnitCost)} icon={Wallet} accent="cyan" hint="Payments + Unit Expenses" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={openAdvanceModal}
          disabled={!supervisor}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neon-red/30 bg-neon-red/5 px-4 py-6 text-neon-red transition hover:bg-neon-red/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HandCoins size={26} />
          <span className="text-base font-semibold">Give Advance</span>
        </button>
        <button
          onClick={openPaymentModal}
          disabled={!supervisor}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neon-green/30 bg-neon-green/5 px-4 py-6 text-neon-green transition hover:bg-neon-green/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wallet size={26} />
          <span className="text-base font-semibold">Make Payment</span>
        </button>
      </div>
      {!supervisor && <p className="text-center text-xs text-slate-500">Add a supervisor first to give advances or record payments.</p>}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Unit History</h2>
        {filteredTimeline.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions yet" description="Advances and payments will show up here, latest first." />
        ) : (
          <div className="space-y-3">
            {filteredTimeline.map((entry) => (
              <div key={entry.id} className="card group flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={entry.type === 'Advance' ? 'red' : 'green'}>{entry.type}</Badge>
                    <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
                    <span className="text-xs text-slate-600">· {entry.createdByUsername ?? '—'}</span>
                  </div>

                  {entry.type === 'Payment' ? (
                    <>
                      {entry.pieces ? (
                        <p className="mt-2 text-xs text-slate-400">
                          Pieces made <span className="text-slate-300">{entry.pieces}</span> × {formatCurrency(entry.rate ?? 0)}
                        </p>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                        <span>
                          Gross <span className="text-slate-300">{formatCurrency(entry.gross ?? 0)}</span>
                        </span>
                        <span>
                          Overtime <span className="text-neon-cyan">+{formatCurrency(entry.overtime ?? 0)}</span>
                        </span>
                        <span>
                          Deduction <span className="text-neon-red">-{formatCurrency(entry.deduction ?? 0)}</span>
                        </span>
                        <span>
                          Net <span className="font-semibold text-neon-green">{formatCurrency(entry.amount)}</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-neon-red">-{formatCurrency(entry.amount)}</p>
                  )}

                  {entry.notes && <p className="mt-1.5 text-xs text-slate-500">{entry.notes}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {entry.type === 'Payment' && (
                    <span className="hidden font-display text-sm font-bold text-neon-green sm:block">{formatCurrency(entry.amount)}</span>
                  )}
                  <button
                    className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-neon-red/10 hover:text-neon-red group-hover:opacity-100"
                    onClick={() => setConfirmEntry(entry)}
                    aria-label={`Delete ${entry.type.toLowerCase()} record`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={supervisorModalOpen} onClose={() => setSupervisorModalOpen(false)} title={supervisor ? 'Edit Supervisor' : 'Add Supervisor'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Supervisor name</label>
            <input className="input-field" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="e.g. Imran Khan" />
          </div>
          {supervisorError && <p className="text-xs text-neon-red">{supervisorError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setSupervisorModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveSupervisor} disabled={savingSupervisor}>
              {savingSupervisor ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} title="Give Advance" subtitle={supervisor ? `For ${supervisor.name}` : undefined}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Amount</label>
            <input type="number" className="input-field" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Cash', 'Online'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAdvanceMethod(m)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    advanceMethod === m ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'Cash' ? 'Cash' : 'Online / Bank Transfer'}
                </button>
              ))}
            </div>
          </div>
          {advanceMethod === 'Online' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Bank Account (optional)</label>
                <select className="input-field" value={advanceBankId} onChange={(e) => setAdvanceBankId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">No bank account selected</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Reference (optional)</label>
                <input className="input-field" value={advanceReference} onChange={(e) => setAdvanceReference(e.target.value)} placeholder="Transfer ID" />
              </div>
            </div>
          )}
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} placeholder="Optional" />
          </div>
          {advanceError && <p className="text-xs text-neon-red">{advanceError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setAdvanceModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveAdvance} disabled={savingAdvance}>
              {savingAdvance ? 'Saving…' : 'Save Advance'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Make Payment" subtitle={supervisor ? `For ${supervisor.name}` : undefined}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Pieces made</label>
              <input type="number" className="input-field" value={piecesInput} onChange={(e) => setPiecesInput(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Rate per piece (Rs)</label>
              <input type="number" className="input-field" value={pieceRateInput} onChange={(e) => setPieceRateInput(e.target.value)} placeholder="2" />
            </div>
          </div>
          <div>
            <label className="label-field">Gross payment amount {piecesNum > 0 && '(from pieces)'}</label>
            <input
              type="number"
              className="input-field"
              value={piecesNum > 0 ? String(pieceGross) : grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              disabled={piecesNum > 0}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label-field">Overtime amount (optional)</label>
            <input type="number" className="input-field" value={overtimeAmount} onChange={(e) => setOvertimeAmount(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>Total Outstanding Advances</span>
              <span className="text-slate-300">{formatCurrency(outstandingBalance)}</span>
            </div>
            {piecesNum > 0 && (
              <div className="flex items-center justify-between">
                <span>Pieces × Rate</span>
                <span className="text-slate-300">
                  {piecesNum} × {formatCurrency(pieceRateNum)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Gross Payment</span>
              <span className="text-slate-300">{formatCurrency(gross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Overtime</span>
              <span className="text-neon-cyan">+{formatCurrency(overtime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Advance Deduction</span>
              <span className="text-neon-red">-{formatCurrency(advanceDeduction)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-semibold">
              <span className="text-slate-300">Net Payment</span>
              <span className="text-neon-green">{formatCurrency(netPayment)}</span>
            </div>
          </div>

          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional" />
          </div>

          {paymentError && <p className="text-xs text-neon-red">{paymentError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSavePayment} disabled={savingPayment}>
              {savingPayment ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmEntry !== null} onClose={() => setConfirmEntry(null)} title="Delete Record" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Are you sure you want to delete this record?</p>
          {confirmEntry && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Badge color={confirmEntry.type === 'Advance' ? 'red' : 'green'}>{confirmEntry.type}</Badge>
                <span className="text-xs text-slate-500">{formatDate(confirmEntry.date)}</span>
              </div>
              <span className="font-display text-sm font-bold text-white">{formatCurrency(confirmEntry.amount)}</span>
            </div>
          )}
          <p className="text-xs text-slate-500">This cannot be undone. Summary totals will update automatically.</p>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setConfirmEntry(null)} disabled={deletingEntry}>
              Cancel
            </button>
            <button className="btn-danger flex-1" onClick={confirmDeleteEntry} disabled={deletingEntry}>
              {deletingEntry ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
