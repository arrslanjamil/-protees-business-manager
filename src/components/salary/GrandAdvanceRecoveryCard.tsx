import { useEffect, useState } from 'react'
import { GrandAdvance } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface GrandAdvanceRecoveryCardProps {
  grandAdvance: GrandAdvance
  onRecoveryChange: (amount: number, enabled: boolean) => void
}

export function GrandAdvanceRecoveryCard({ grandAdvance, onRecoveryChange }: GrandAdvanceRecoveryCardProps) {
  const [recoveryAmount, setRecoveryAmount] = useState(grandAdvance.monthly_recovery_amount?.toString() || '')
  const [isChecked, setIsChecked] = useState(false)

  const recoveryNum = Number(recoveryAmount) || 0
  const remainingAfter = Math.max(0, grandAdvance.outstanding_balance - recoveryNum)

  useEffect(() => {
    onRecoveryChange(recoveryNum, isChecked)
  }, [recoveryNum, isChecked, onRecoveryChange])

  return (
    <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          className="h-5 w-5 rounded border-slate-400 text-neon-amber"
        />
        <h3 className="font-semibold text-white">Grand Advance Recovery</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Original Grand Advance:</span>
          <span className="font-medium text-white">{formatCurrency(grandAdvance.original_amount)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Outstanding Balance:</span>
          <span className="font-medium text-neon-amber">{formatCurrency(grandAdvance.outstanding_balance)}</span>
        </div>

        {grandAdvance.monthly_recovery_amount && (
          <div className="flex justify-between">
            <span className="text-slate-400">Suggested Recovery:</span>
            <span className="text-slate-300">{formatCurrency(grandAdvance.monthly_recovery_amount)}</span>
          </div>
        )}

        <div>
          <label className="label-field">Recovery Amount This Month</label>
          <input
            type="number"
            className="input-field"
            value={recoveryAmount}
            onChange={(e) => setRecoveryAmount(e.target.value)}
            placeholder="0"
            disabled={!isChecked}
          />
        </div>

        <div className="border-t border-neon-amber/10 pt-3">
          <div className="flex justify-between">
            <span className="text-slate-400">Remaining Balance After Recovery:</span>
            <span className={`font-semibold ${remainingAfter === 0 ? 'text-neon-green' : 'text-neon-amber'}`}>
              {formatCurrency(remainingAfter)}
            </span>
          </div>
          {remainingAfter === 0 && recoveryNum > 0 && (
            <p className="mt-2 text-xs text-neon-green">✓ Grand Advance will be fully recovered after this payment</p>
          )}
        </div>
      </div>
    </div>
  )
}
