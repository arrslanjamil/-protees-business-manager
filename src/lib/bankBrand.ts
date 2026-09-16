/** A per-bank "logo" — since bank_accounts is a free-text, admin-managed
 * list (any name can be added from Collections → Manage Banks), there's
 * no real logo artwork to fetch or ship for an arbitrary typed string,
 * and embedding actual trademarked bank logos isn't something to do
 * without permission. Instead: a colored initials badge, keyed off
 * common Pakistani bank/wallet names when recognizable, falling back to
 * the same initials-avatar treatment already used for staff cards
 * elsewhere in the app (see EmployeesPage) so every card still reads as
 * visually distinct at a glance. */

interface BankBrand {
  initials: string
  className: string
}

const KNOWN_BRANDS: { match: RegExp; initials: string; className: string }[] = [
  { match: /meezan/i, initials: 'MB', className: 'bg-emerald-500/15 text-emerald-400' },
  { match: /alfalah/i, initials: 'BAF', className: 'bg-rose-500/15 text-rose-400' },
  { match: /\bhbl\b|habib bank/i, initials: 'HBL', className: 'bg-teal-500/15 text-teal-400' },
  { match: /al.?habib/i, initials: 'BAH', className: 'bg-lime-500/15 text-lime-400' },
  { match: /\bubl\b|united bank/i, initials: 'UBL', className: 'bg-sky-500/15 text-sky-400' },
  { match: /\bmcb\b/i, initials: 'MCB', className: 'bg-red-500/15 text-red-400' },
  { match: /faysal/i, initials: 'FB', className: 'bg-cyan-500/15 text-cyan-400' },
  { match: /askari/i, initials: 'AB', className: 'bg-green-500/15 text-green-400' },
  { match: /allied/i, initials: 'ABL', className: 'bg-indigo-500/15 text-indigo-400' },
  { match: /standard chartered/i, initials: 'SC', className: 'bg-blue-500/15 text-blue-400' },
  { match: /postex/i, initials: 'PE', className: 'bg-orange-500/15 text-orange-400' },
  { match: /jazz\s?cash/i, initials: 'JC', className: 'bg-red-500/15 text-red-400' },
  { match: /easypaisa/i, initials: 'EP', className: 'bg-emerald-500/15 text-emerald-400' },
]

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .map((w) => w[0])
    .slice(0, 3)
    .join('')
    .toUpperCase()
}

export function getBankBrand(name: string): BankBrand {
  const known = KNOWN_BRANDS.find((b) => b.match.test(name))
  if (known) return { initials: known.initials, className: known.className }
  return { initials: initialsFromName(name), className: 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 text-white' }
}
