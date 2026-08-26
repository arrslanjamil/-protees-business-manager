import { Boxes, HandCoins, LayoutDashboard, Receipt, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { classNames } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/employees', label: 'Staff', icon: Users },
  { to: '/salary', label: 'Salary', icon: Wallet },
  { to: '/advances', label: 'Advance', icon: HandCoins },
  { to: '/units', label: 'Units', icon: Boxes },
  { to: '/expenses', label: 'Expense', icon: Receipt },
]

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/5 bg-base-900/95 backdrop-blur-xl lg:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
              isActive ? 'text-neon-cyan' : 'text-slate-500'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
