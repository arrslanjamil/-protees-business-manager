import { classNames } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'cyan' | 'purple' | 'green' | 'red' | 'amber' | 'slate'
}

const colorMap = {
  cyan: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
  purple: 'bg-neon-purple/10 text-neon-purple border-neon-purple/30',
  green: 'bg-neon-green/10 text-neon-green border-neon-green/30',
  red: 'bg-neon-red/10 text-neon-red border-neon-red/30',
  amber: 'bg-neon-amber/10 text-neon-amber border-neon-amber/30',
  slate: 'bg-white/5 text-slate-300 border-white/10',
}

export function Badge({ children, color = 'slate' }: BadgeProps) {
  return (
    <span className={classNames('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', colorMap[color])}>
      {children}
    </span>
  )
}
