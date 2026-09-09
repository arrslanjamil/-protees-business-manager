import {
  Boxes,
  Factory,
  FileBarChart,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Receipt,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { classNames } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/protees-unit', label: 'Protees Unit', icon: Boxes },
  { to: '/unit-expenses', label: 'Unit Expenses', icon: Receipt },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/salary', label: 'Salary', icon: Wallet },
  { to: '/advances', label: 'Advances', icon: HandCoins },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/activity-log', label: 'Activity Log', icon: History },
  { to: '/factory', label: 'Factory', icon: Factory },
]

export function Sidebar() {
  const { signOut, displayName } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-base-900/95 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple shadow-glow">
          <Zap size={18} className="text-base-950" />
        </div>
        <div>
          <p className="font-display text-sm font-bold tracking-wider text-white">PROTEES</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Business Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              classNames(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-neon-cyan/15 to-neon-purple/10 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-neon-cyan' : 'text-slate-500 group-hover:text-slate-300'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 px-6 py-5">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <p className="text-xs font-medium text-slate-400">Say a command</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            "Ali ko 5000 advance diya" · "Pay salary to Sara" · "Add expense for thread"
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neon-cyan/10 text-xs font-bold text-neon-cyan">
              {displayName?.[0] ?? '?'}
            </div>
            <span className="text-sm font-medium text-slate-200">{displayName ?? 'Unknown'}</span>
          </div>
          <button
            onClick={signOut}
            aria-label="Log out"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-neon-red"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
