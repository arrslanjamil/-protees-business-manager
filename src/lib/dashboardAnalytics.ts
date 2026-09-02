import { MONTH_NAMES } from '@/lib/types'

export interface MonthBucket {
  key: string
  label: string
  month: number
  year: number
}

/** Builds one bucket per calendar month spanning [start, end], inclusive.
 * Capped at 24 buckets as a safety net against pathological custom ranges. */
export function monthBucketsInRange(start: string, end: string): MonthBucket[] {
  const s = new Date(start)
  const e = new Date(end)
  const buckets: MonthBucket[] = []
  let cursor = new Date(s.getFullYear(), s.getMonth(), 1)
  const last = new Date(e.getFullYear(), e.getMonth(), 1)
  while (cursor <= last && buckets.length < 24) {
    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
      label: `${MONTH_NAMES[cursor.getMonth()].slice(0, 3)} ${String(cursor.getFullYear()).slice(2)}`,
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return buckets
}

/** Cycling palette for category pie/bar charts — theme neon colors first,
 * then generated hues so any number of custom categories stays distinct. */
const BASE_CATEGORY_COLORS = ['#22d3ee', '#a855f7', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#818cf8', '#2dd4bf', '#fb923c', '#c084fc']

export function colorForIndex(index: number): string {
  if (index < BASE_CATEGORY_COLORS.length) return BASE_CATEGORY_COLORS[index]
  const hue = (index * 47) % 360
  return `hsl(${hue}, 70%, 60%)`
}
