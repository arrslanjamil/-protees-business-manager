import { MONTH_NAMES } from '@/lib/types'
import { toLocalISODate } from '@/lib/utils'

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

export interface TrendBucket {
  key: string
  label: string
  start: string
  end: string
}

/** Buckets [start,end] by day when the range is short (<=45 days),
 * otherwise by calendar month — keeps the trend chart readable across
 * every preset from "Today" to "Annually" without either a single-point
 * chart or an unreadably dense one. */
export function trendBucketsInRange(start: string, end: string): TrendBucket[] {
  const s = new Date(start)
  const e = new Date(end)
  const dayCount = Math.round((e.getTime() - s.getTime()) / 86400000) + 1

  if (dayCount <= 45) {
    const buckets: TrendBucket[] = []
    const cursor = new Date(s)
    while (cursor <= e && buckets.length < 45) {
      const iso = toLocalISODate(cursor)
      buckets.push({ key: iso, label: `${cursor.getDate()} ${MONTH_NAMES[cursor.getMonth()].slice(0, 3)}`, start: iso, end: iso })
      cursor.setDate(cursor.getDate() + 1)
    }
    return buckets
  }

  return monthBucketsInRange(start, end).map((m) => {
    const monthStart = new Date(m.year, m.month - 1, 1)
    const monthEnd = new Date(m.year, m.month, 0)
    return { key: m.key, label: m.label, start: toLocalISODate(monthStart), end: toLocalISODate(monthEnd) }
  })
}

/** Cycling palette for category pie/bar charts — theme neon colors first,
 * then generated hues so any number of custom categories stays distinct. */
const BASE_CATEGORY_COLORS = ['#22d3ee', '#a855f7', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#818cf8', '#2dd4bf', '#fb923c', '#c084fc']

export function colorForIndex(index: number): string {
  if (index < BASE_CATEGORY_COLORS.length) return BASE_CATEGORY_COLORS[index]
  const hue = (index * 47) % 360
  return `hsl(${hue}, 70%, 60%)`
}
