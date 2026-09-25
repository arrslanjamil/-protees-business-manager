import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, Mic, MicOff, Sparkles, Square } from 'lucide-react'
import { useVoiceCommand } from '@/hooks/useVoiceCommand'
import { useData } from '@/context/DataContext'
import { parseVoiceCommand, type NamedPerson, type VoiceIntent } from '@/lib/voiceParser'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { DEPARTMENT_LABELS, type Department } from '@/lib/types'
import { classNames, errorMessage as getErrorMessage, formatCurrency } from '@/lib/utils'

type Phase = 'listening' | 'review' | 'done'
type SelectableIntent = Exclude<VoiceIntent, 'unit_payment'>

export function VoiceWidget() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('listening')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { status, transcript, errorMessage, start, stop, reset } = useVoiceCommand()
  const { employees, supervisors, addAdvance, addExpense, addExpenseCategory, expenseCategoryNames, recordSalaryPayment, suggestedDeduction, balanceFor } = useData()

  const people = useMemo<NamedPerson[]>(
    () => [
      ...employees.map((e) => ({ name: e.name, department: 'cutting_department' as Department })),
      ...supervisors.map((s) => ({ name: s.name, department: 'protees_unit' as Department })),
    ],
    [employees, supervisors]
  )

  const [intent, setIntent] = useState<SelectableIntent>('unknown')
  const [department, setDepartment] = useState<Department>('cutting_department')
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [overtime, setOvertime] = useState<number>(0)
  const [deduction, setDeduction] = useState<number>(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('')
  const [notes, setNotes] = useState('')

  const parsed = useMemo(() => (transcript ? parseVoiceCommand(transcript, people) : null), [transcript, people])

  useEffect(() => {
    if (status === 'processing' && parsed) {
      const resolvedIntent: SelectableIntent = parsed.intent === 'unit_payment' ? 'unknown' : parsed.intent
      setIntent(resolvedIntent)
      setDepartment(parsed.person?.department ?? 'cutting_department')
      setPersonName(parsed.person?.name ?? '')
      setAmount(parsed.amount ?? 0)
      setOvertime(0)
      setTitle(parsed.title ?? '')
      setCategory(expenseCategoryNames[expenseCategoryNames.length - 1] ?? '')
      setNotes('')
      setPhase('review')
    }
  }, [status, parsed, expenseCategoryNames])

  useEffect(() => {
    if (intent === 'salary' && personName) {
      const emp = employees.find((e) => e.name === personName)
      if (emp) {
        setAmount((prev) => (prev > 0 ? prev : Number(emp.salary)))
        setDeduction(suggestedDeduction(personName, 'cutting_department', Number(emp.salary)))
      }
    }
  }, [intent, personName, employees, suggestedDeduction])

  function openWidget() {
    setOpen(true)
    setPhase('listening')
    setSubmitError(null)
    reset()
    setTimeout(() => start(), 150)
  }

  function closeWidget() {
    stop()
    setOpen(false)
    reset()
    setSubmitError(null)
  }

  function handleDepartmentChange(dept: Department) {
    setDepartment(dept)
    setPersonName('')
  }

  const nameOptions = department === 'cutting_department' ? employees : supervisors

  async function handleConfirm() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (intent === 'advance') {
        if (!personName || amount <= 0) throw new Error('Pick a person and enter a valid amount.')
        await addAdvance({ name: personName, department, amount, notes: notes || undefined })
      } else if (intent === 'expense') {
        if (amount <= 0) throw new Error('Enter a valid amount.')
        await addExpense({ title: title.trim() || 'Expense', category, amount, notes: notes || undefined, paymentSource: 'cash' })
      } else if (intent === 'salary') {
        if (!personName || amount <= 0) throw new Error('Pick an employee and enter a valid amount.')
        const now = new Date()
        await recordSalaryPayment({
          employeeName: personName,
          baseAmount: amount,
          overtimeAmount: overtime,
          deductionAmount: deduction,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          notes: notes || undefined,
        })
      } else {
        throw new Error("Couldn't understand that command. Try again with a clearer phrase.")
      }
      setPhase('done')
      setTimeout(closeWidget, 1400)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Something went wrong.'))
    } finally {
      setSubmitting(false)
    }
  }

  const unsupported = status === 'unsupported'

  return (
    <>
      <button
        onClick={openWidget}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-base-950 shadow-glow transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        aria-label="Voice command"
      >
        <Mic size={22} />
      </button>

      <Modal open={open} onClose={closeWidget} title="Voice Command" subtitle="e.g. “Ali ko 5000 advance diya” or “Give advance 5000 to Ali”" maxWidth="max-w-md">
        {unsupported ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="text-neon-amber" size={28} />
            <p className="text-sm text-slate-300">
              Voice recognition isn't supported in this browser. Try Chrome or Edge on desktop or Android.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {phase === 'listening' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  className={classNames(
                    'flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all',
                    status === 'listening'
                      ? 'border-neon-cyan shadow-glow animate-pulseSlow'
                      : 'border-white/10'
                  )}
                >
                  {status === 'listening' ? (
                    <Mic size={30} className="text-neon-cyan" />
                  ) : status === 'processing' ? (
                    <Loader2 size={28} className="animate-spin text-neon-purple" />
                  ) : (
                    <MicOff size={28} className="text-slate-500" />
                  )}
                </div>
                <p className="min-h-[3rem] max-w-xs text-center text-sm text-slate-300">
                  {transcript || (status === 'listening' ? 'Listening…' : 'Tap the mic to start speaking')}
                </p>
                {errorMessage && <p className="text-xs text-neon-red">{errorMessage}</p>}
                <div className="flex gap-3">
                  {status === 'listening' ? (
                    <button onClick={stop} className="btn-secondary">
                      <Square size={16} /> Stop
                    </button>
                  ) : (
                    <button onClick={start} className="btn-primary">
                      <Mic size={16} /> {status === 'error' ? 'Try again' : 'Start listening'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-neon-purple/20 bg-neon-purple/5 px-3.5 py-2.5">
                  <Sparkles size={16} className="shrink-0 text-neon-purple" />
                  <p className="text-xs text-slate-300">
                    Heard: <span className="italic text-slate-400">"{transcript}"</span>
                  </p>
                </div>

                <div>
                  <label className="label-field">Command type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['salary', 'advance', 'expense'] as SelectableIntent[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIntent(opt)}
                        className={classNames(
                          'rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition',
                          intent === opt
                            ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                            : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {intent === 'advance' && (
                  <div>
                    <label className="label-field">Department</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['cutting_department', 'protees_unit'] as Department[]).map((dept) => (
                        <button
                          key={dept}
                          onClick={() => handleDepartmentChange(dept)}
                          className={classNames(
                            'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                            department === dept
                              ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                              : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                          )}
                        >
                          {DEPARTMENT_LABELS[dept]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(intent === 'salary' || intent === 'advance') && (
                  <div>
                    <label className="label-field">{intent === 'salary' ? 'Employee' : department === 'cutting_department' ? 'Employee' : 'Supervisor'}</label>
                    <SearchableSelect
                      value={personName}
                      onChange={setPersonName}
                      options={(intent === 'salary' ? employees : nameOptions).map((p) => ({ value: p.name, label: p.name }))}
                      placeholder="Select…"
                      searchPlaceholder="Search name…"
                      emptyMessage="No match found"
                    />
                  </div>
                )}

                {intent === 'expense' && (
                  <>
                    <div>
                      <label className="label-field">Title</label>
                      <input type="text" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thread purchase" />
                    </div>
                    <CategoryPicker value={category} onChange={setCategory} categories={expenseCategoryNames} onAddCategory={addExpenseCategory} />
                  </>
                )}

                <div>
                  <label className="label-field">{intent === 'salary' ? 'Base salary amount' : 'Amount'}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                {intent === 'salary' && (
                  <div>
                    <label className="label-field">Overtime</label>
                    <input
                      type="number"
                      className="input-field"
                      value={overtime || ''}
                      onChange={(e) => setOvertime(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                )}

                {intent === 'salary' && personName && (
                  <div>
                    <label className="label-field">
                      Auto deduction from advance (outstanding: {formatCurrency(balanceFor(personName, 'cutting_department'))})
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      value={deduction || ''}
                      onChange={(e) => setDeduction(Number(e.target.value))}
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-slate-500">Net pay: {formatCurrency(Math.max(0, amount + overtime - deduction))}</p>
                  </div>
                )}

                <div>
                  <label className="label-field">Notes (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason / description"
                  />
                </div>

                {submitError && <p className="text-xs text-neon-red">{submitError}</p>}

                <div className="flex gap-3 pt-1">
                  <button className="btn-secondary flex-1" onClick={openWidget}>
                    <Mic size={16} /> Redo
                  </button>
                  <button className="btn-primary flex-1" onClick={handleConfirm} disabled={submitting || intent === 'unknown'}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {phase === 'done' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green/10 text-neon-green shadow-glow-green">
                  <Check size={26} />
                </div>
                <p className="text-sm font-medium text-white">Saved successfully</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
