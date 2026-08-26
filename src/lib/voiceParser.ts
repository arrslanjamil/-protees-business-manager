import type { Employee } from './types'
import { EXPENSE_CATEGORIES } from './types'
import { fuzzyScore } from './utils'

export type VoiceIntent = 'salary' | 'advance' | 'expense' | 'unknown'

export interface VoiceParseResult {
  intent: VoiceIntent
  amount: number | null
  employee: Employee | null
  employeeNameGuess: string | null
  category: string | null
  reason: string | null
  raw: string
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lac: 100000,
  million: 1000000,
}

function wordsToNumber(text: string): number | null {
  const tokens = text.toLowerCase().split(/[\s-]+/).filter(Boolean)
  let total = 0
  let current = 0
  let matched = false
  for (const token of tokens) {
    const value = NUMBER_WORDS[token]
    if (value === undefined) continue
    matched = true
    if (value === 100 || value === 1000 || value === 100000 || value === 1000000) {
      current = (current || 1) * value
      if (value >= 1000) {
        total += current
        current = 0
      }
    } else {
      current += value
    }
  }
  total += current
  return matched ? total : null
}

function extractAmount(text: string): number | null {
  const digitMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac|million)?/i)
  if (digitMatch) {
    let value = parseFloat(digitMatch[1].replace(/,/g, ''))
    const suffix = digitMatch[2]?.toLowerCase()
    if (suffix === 'k' || suffix === 'thousand') value *= 1000
    if (suffix === 'lakh' || suffix === 'lac') value *= 100000
    if (suffix === 'million') value *= 1000000
    if (!Number.isNaN(value)) return value
  }
  return wordsToNumber(text)
}

function detectIntent(text: string): VoiceIntent {
  const t = text.toLowerCase()
  if (/\b(advance|loan|qarza|qarz|borrow)\b/.test(t)) return 'advance'
  if (/\b(expense|spent|spend|cost|bill|purchase|bought)\b/.test(t)) return 'expense'
  if (/\b(salary|pay|paid|wage|payroll)\b/.test(t)) return 'salary'
  return 'unknown'
}

/** Pulls the name that follows "to"/"for"/"of" in the transcript, if any. */
function extractNameGuess(text: string): string | null {
  const match = text.match(/\b(?:to|for|of)\s+([a-z][a-z\s]{1,30}?)(?:\s+(?:for|because|as|on|amount|rupees|pkr|rs)\b|[,.]|$)/i)
  if (match) return match[1].trim()
  return null
}

function bestEmployeeMatch(nameGuess: string | null, fullText: string, employees: Employee[]): Employee | null {
  if (employees.length === 0) return null
  const candidates = nameGuess ? [nameGuess] : []
  // Also try matching each employee name directly against the full transcript.
  let best: { employee: Employee; score: number } | null = null
  for (const emp of employees) {
    for (const candidate of [...candidates, fullText]) {
      const score = fuzzyScore(candidate, emp.name)
      if (score > 0 && (!best || score > best.score)) {
        best = { employee: emp, score }
      }
    }
  }
  if (best && best.score >= 55) return best.employee
  return null
}

function extractCategory(text: string): string | null {
  const t = text.toLowerCase()
  for (const cat of EXPENSE_CATEGORIES) {
    if (t.includes(cat.toLowerCase())) return cat
  }
  const match = text.match(/\bfor\s+([a-z][a-z\s]{2,30})$/i)
  if (match) return match[1].trim()
  return null
}

export function parseVoiceCommand(rawText: string, employees: Employee[]): VoiceParseResult {
  const raw = rawText.trim()
  const intent = detectIntent(raw)
  const amount = extractAmount(raw)
  const nameGuess = extractNameGuess(raw)
  const employee = bestEmployeeMatch(nameGuess, raw, employees)

  let category: string | null = null
  let reason: string | null = null

  if (intent === 'expense') {
    category = extractCategory(raw)
    reason = category
  } else if (intent === 'advance') {
    const reasonMatch = raw.match(/\bfor\s+([a-z][a-z\s]{2,40})$/i)
    reason = reasonMatch ? reasonMatch[1].trim() : null
  }

  return {
    intent,
    amount,
    employee,
    employeeNameGuess: nameGuess,
    category,
    reason,
    raw,
  }
}
