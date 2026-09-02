import { Banknote, Boxes, FileBarChart, HandCoins, LayoutDashboard, Receipt, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { classNames } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/protees-unit', label: 'Unit', icon: Boxes },
  { to: '/unit-expenses', label: 'Expense', icon: Receipt },
  { to: '/employees', label: 'Staff', icon: Users },
  { to: '/salary', label: 'Salary', icon: Wallet },
  { to: '/advances', label: 'Advance', icon: HandCoins },
  { to: '/khadim-hussain', label: 'Khadim', icon: Banknote },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
]

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-white/5 bg-base-900/95 backdrop-blur-xl lg:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            classNames(
              'flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
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
