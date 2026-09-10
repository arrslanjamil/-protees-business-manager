/** Shared Zakat outstanding-balance math — used by the dashboard widget,
 * the Zakat page, and the Reports page so all three agree on one formula:
 *
 *   Outstanding Balance = Opening Balance
 *                        + (months elapsed since opening_month × Monthly Target)
 *                        - (Zakat distributed since opening_month)
 *
 * The monthly addition is never written to the database by a cron job —
 * it's a pure function of the current date, computed fresh on every read,
 * so it can never silently fail to run.
 */

function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth()
}

function startOfMonth(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** How many monthly accruals have happened from `openingMonth` through
 * `asOf`, inclusive of the opening month itself (0 = same month). */
export function monthsElapsedSince(openingMonth: string, asOf: Date = new Date()): number {
  return Math.max(0, monthIndex(asOf) - monthIndex(startOfMonth(openingMonth)))
}

export interface ZakatOutstandingInput {
  openingBalance: number
  openingMonth: string
  monthlyTarget: number
  /** Sum of all Zakat distributed on or after openingMonth. */
  totalDistributedSinceOpening: number
  asOf?: Date
}

/** The current running outstanding balance — Opening Balance plus every
 * monthly accrual through today, minus everything distributed since. */
export function computeZakatOutstanding({
  openingBalance,
  openingMonth,
  monthlyTarget,
  totalDistributedSinceOpening,
  asOf = new Date(),
}: ZakatOutstandingInput): number {
  const monthsElapsed = monthsElapsedSince(openingMonth, asOf)
  const accrued = openingBalance + monthsElapsed * monthlyTarget
  return accrued - totalDistributedSinceOpening
}

/** How many monthly accruals fall inside [start, end] (clamped to not
 * count before openingMonth) — used by the Zakat report's "Monthly Added
 * Zakat" figure, which is period-aware rather than a flat Rs 100,000. */
export function monthsAccruedInRange(start: string, end: string, openingMonth: string): number {
  const rangeStart = new Date(Math.max(new Date(start).getTime(), startOfMonth(openingMonth).getTime()))
  const rangeEnd = new Date(end)
  if (rangeStart > rangeEnd) return 0
  const fromIdx = monthIndex(rangeStart)
  const toIdx = monthIndex(rangeEnd)
  return Math.max(0, toIdx - fromIdx + 1)
}

export interface ZakatProgressSnapshot {
  /** What should have been distributed by now — Opening Balance plus
   * every monthly accrual through today. This is the progress bar's
   * "Target"/denominator, not a flat Rs 100,000. */
  grossAccrued: number
  /** Total Zakat distributed since openingMonth. */
  totalDistributed: number
  /** grossAccrued - totalDistributed — identical to computeZakatOutstanding,
   * so "Remaining" on the progress bar always matches the Outstanding
   * Balance card instead of a separate this-month-only figure. */
  remaining: number
  /** totalDistributed / grossAccrued, clamped to [0, 100]. */
  percent: number
}

/** Single source of truth for the Zakat progress bar — Target/Distributed/
 * Remaining/Percent all derived from the same running balance so
 * "Remaining" is never out of sync with the Outstanding Balance figure. */
export function computeZakatProgress({
  openingBalance,
  openingMonth,
  monthlyTarget,
  totalDistributedSinceOpening,
  asOf = new Date(),
}: ZakatOutstandingInput): ZakatProgressSnapshot {
  const monthsElapsed = monthsElapsedSince(openingMonth, asOf)
  const grossAccrued = openingBalance + monthsElapsed * monthlyTarget
  const remaining = grossAccrued - totalDistributedSinceOpening
  const percent = grossAccrued > 0 ? Math.min(100, Math.max(0, Math.round((totalDistributedSinceOpening / grossAccrued) * 100))) : 0
  return { grossAccrued, totalDistributed: totalDistributedSinceOpening, remaining, percent }
}
