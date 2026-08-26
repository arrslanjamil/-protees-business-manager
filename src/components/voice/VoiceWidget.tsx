import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, Mic, MicOff, Sparkles, Square } from 'lucide-react'
import { useVoiceCommand } from '@/hooks/useVoiceCommand'
import { useData } from '@/context/DataContext'
import { parseVoiceCommand, type VoiceIntent } from '@/lib/voiceParser'
import { Modal } from '@/components/ui/Modal'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { classNames, formatCurrency } from '@/lib/utils'

type Phase = 'listening' | 'review' | 'done'

export function VoiceWidget() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('listening')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { status, transcript, errorMessage, start, stop, reset } = useVoiceCommand()
  const { employees, addAdvance, addExpense, recordSalaryPayment, suggestedDeduction, balanceFor } = useData()

  const [intent, setIntent] = useState<VoiceIntent>('unknown')
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [deduction, setDeduction] = useState<number>(0)
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [note, setNote] = useState('')

  const parsed = useMemo(() => (transcript ? parseVoiceCommand(transcript, employees) : null), [transcript, employees])

  useEffect(() => {
    if (status === 'processing' && parsed) {
      setIntent(parsed.intent)
      setEmployeeId(parsed.employee?.id ?? '')
      setAmount(parsed.amount ?? 0)
      setCategory(parsed.category ?? EXPENSE_CATEGORIES[0])
      setNote(parsed.reason ?? '')
      setPhase('review')
    }
  }, [status, parsed])

  useEffect(() => {
    if (intent === 'salary' && employeeId) {
      const emp = employees.find((e) => e.id === employeeId)
      if (emp) {
        setAmount((prev) => (prev > 0 ? prev : Number(emp.monthly_salary)))
        setDeduction(suggestedDeduction(employeeId, Number(emp.monthly_salary)))
      }
    }
  }, [intent, employeeId, employees, suggestedDeduction])

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

  async function handleConfirm() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (intent === 'advance') {
        if (!employeeId || amount <= 0) throw new Error('Pick an employee and enter a valid amount.')
        await addAdvance({ employeeId, amount, reason: note || undefined })
      } else if (intent === 'expense') {
        if (amount <= 0) throw new Error('Enter a valid amount.')
        await addExpense({ category: category || 'Miscellaneous', amount, description: note || undefined })
      } else if (intent === 'salary') {
        if (!employeeId || amount <= 0) throw new Error('Pick an employee and enter a valid amount.')
        const now = new Date()
        await recordSalaryPayment({
          employeeId,
          baseAmount: amount,
          deductionAmount: deduction,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          notes: note || undefined,
        })
      } else {
        throw new Error("Couldn't understand that command. Try again with a clearer phrase.")
      }
      setPhase('done')
      setTimeout(closeWidget, 1400)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedEmployee = employees.find((e) => e.id === employeeId)
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

      <Modal open={open} onClose={closeWidget} title="Voice Command" subtitle="Say something like “Give advance 5000 to Ali”" maxWidth="max-w-md">
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
                    {(['salary', 'advance', 'expense'] as VoiceIntent[]).map((opt) => (
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

                {(intent === 'salary' || intent === 'advance') && (
                  <div>
                    <label className="label-field">Employee</label>
                    <select className="input-field" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                      <option value="">Select employee…</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {intent === 'expense' && (
                  <div>
                    <label className="label-field">Category</label>
                    <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
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

                {intent === 'salary' && selectedEmployee && (
                  <div>
                    <label className="label-field">
                      Auto deduction from advance (outstanding: {formatCurrency(balanceFor(employeeId))})
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      value={deduction || ''}
                      onChange={(e) => setDeduction(Number(e.target.value))}
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-slate-500">Net pay: {formatCurrency(Math.max(0, amount - deduction))}</p>
                  </div>
                )}

                <div>
                  <label className="label-field">Note (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
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
