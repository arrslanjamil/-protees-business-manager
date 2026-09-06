import { Banknote, Boxes, Factory, FileBarChart, HandCoins, History, LayoutDashboard, LogOut, Receipt, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
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
  { to: '/activity-log', label: 'Activity', icon: History },
  { to: '/factory', label: 'Factory', icon: Factory },
]

export function MobileNav() {
  const { signOut } = useAuth()

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
      <button
        onClick={signOut}
        className="flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-slate-500 hover:text-neon-red"
      >
        <LogOut size={18} />
        Log Out
      </button>
    </nav>
  )
}
