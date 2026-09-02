import type { Department } from './types'
import { fuzzyScore } from './utils'

export type VoiceIntent = 'salary' | 'advance' | 'expense' | 'unit_payment' | 'unknown'

export interface NamedPerson {
  name: string
  department: Department
}

export interface VoiceParseResult {
  intent: VoiceIntent
  amount: number | null
  person: NamedPerson | null
  nameGuess: string | null
  title: string | null
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
  hazar: 1000,
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
  const digitMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|hazar|lakh|lac|million)?/i)
  if (digitMatch) {
    let value = parseFloat(digitMatch[1].replace(/,/g, ''))
    const suffix = digitMatch[2]?.toLowerCase()
    if (suffix === 'k' || suffix === 'thousand' || suffix === 'hazar') value *= 1000
    if (suffix === 'lakh' || suffix === 'lac') value *= 100000
    if (suffix === 'million') value *= 1000000
    if (!Number.isNaN(value)) return value
  }
  return wordsToNumber(text)
}

/** Roman-Urdu and English keywords for each intent. */
function detectIntent(text: string): VoiceIntent {
  const t = text.toLowerCase()
  if (/\b(advance|loan|qarza|qarz|borrow|diya|dena|de do|udhaar)\b/.test(t)) return 'advance'
  if (/\b(unit payment|supervisor payment|protees unit)\b/.test(t)) return 'unit_payment'
  if (/\b(expense|spent|spend|cost|bill|purchase|bought|kharcha|kharch)\b/.test(t)) return 'expense'
  if (/\b(salary|pay|paid|wage|payroll|tankhwah|tankhwa)\b/.test(t)) return 'salary'
  return 'unknown'
}

/** Pulls the name that follows "to"/"for"/"of" (English), or precedes "ko" (Roman Urdu). */
function extractNameGuess(text: string): string | null {
  // Roman Urdu: "Ali ko 5000 advance diya" — name comes before "ko".
  const urduMatch = text.match(/^\s*([a-z][a-z\s]{1,30}?)\s+ko\b/i)
  if (urduMatch) return urduMatch[1].trim()

  const englishMatch = text.match(/\b(?:to|for|of)\s+([a-z][a-z\s]{1,30}?)(?:\s+(?:for|because|as|on|amount|rupees|pkr|rs)\b|[,.]|$)/i)
  if (englishMatch) return englishMatch[1].trim()
  return null
}

function bestPersonMatch(nameGuess: string | null, fullText: string, people: NamedPerson[]): NamedPerson | null {
  if (people.length === 0) return null
  const candidates = nameGuess ? [nameGuess] : []
  let best: { person: NamedPerson; score: number } | null = null
  for (const person of people) {
    for (const candidate of [...candidates, fullText]) {
      const score = fuzzyScore(candidate, person.name)
      if (score > 0 && (!best || score > best.score)) {
        best = { person, score }
      }
    }
  }
  if (best && best.score >= 55) return best.person
  return null
}

/** For an expense command, pulls a freeform title from the trailing "for X" phrase. */
function extractExpenseTitle(text: string): string | null {
  const match = text.match(/\bfor\s+([a-z][a-z\s]{2,40})$/i)
  if (match) return match[1].trim()
  return null
}

export function parseVoiceCommand(rawText: string, people: NamedPerson[]): VoiceParseResult {
  const raw = rawText.trim()
  const intent = detectIntent(raw)
  const amount = extractAmount(raw)
  const nameGuess = extractNameGuess(raw)
  const person = bestPersonMatch(nameGuess, raw, people)

  const title = intent === 'expense' ? extractExpenseTitle(raw) : null

  return {
    intent,
    amount,
    person,
    nameGuess,
    title,
    raw,
  }
}
