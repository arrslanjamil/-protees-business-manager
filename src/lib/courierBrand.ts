/** Courier "logo" — colored initials badge keyed off common Pakistani courier
 * names with brand-specific colors for visual distinction at a glance. */

interface CourierBrand {
  initials: string
  className: string
}

const KNOWN_COURIERS: { match: RegExp; initials: string; className: string }[] = [
  { match: /leopard/i, initials: 'LC', className: 'bg-yellow-500/15 text-yellow-400' },
  { match: /trex/i, initials: 'TRX', className: 'bg-red-500/15 text-red-400' },
  { match: /\bdhl\b/i, initials: 'DHL', className: 'bg-amber-500/15 text-amber-400' },
  { match: /fedex/i, initials: 'FX', className: 'bg-purple-500/15 text-purple-400' },
  { match: /tcs/i, initials: 'TCS', className: 'bg-green-500/15 text-green-400' },
  { match: /dawn/i, initials: 'DC', className: 'bg-blue-500/15 text-blue-400' },
  { match: /postex/i, initials: 'PE', className: 'bg-orange-500/15 text-orange-400' },
  { match: /service 7/i, initials: 'S7', className: 'bg-indigo-500/15 text-indigo-400' },
  { match: /malik/i, initials: 'MC', className: 'bg-cyan-500/15 text-cyan-400' },
  { match: /hbl express/i, initials: 'HBL', className: 'bg-teal-500/15 text-teal-400' },
  { match: /daraz/i, initials: 'DZ', className: 'bg-rose-500/15 text-rose-400' },
  { match: /fastco/i, initials: 'FC', className: 'bg-lime-500/15 text-lime-400' },
]

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getCourierBrand(name: string): CourierBrand {
  const known = KNOWN_COURIERS.find((c) => c.match.test(name))
  if (known) return { initials: known.initials, className: known.className }
  return { initials: initialsFromName(name), className: 'bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 text-white' }
}
