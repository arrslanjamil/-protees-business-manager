import { Outlet, NavLink, Link } from 'react-router-dom'
import {
  ClipboardList,
  Factory,
  LayoutDashboard,
  LogOut,
  Package,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { useFactoryAuth } from '@/context/FactoryAuthContext'
import { FactoryDataProvider } from '@/context/FactoryDataContext'
import { FACTORY_ROLE_LABELS, type FactoryRole } from '@/lib/factoryTypes'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { classNames } from '@/lib/utils'

interface FactoryNavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: FactoryRole[] | 'all'
  end?: boolean
}

const NAV_ITEMS: FactoryNavItem[] = [
  { to: '/factory', label: 'Dashboard', icon: LayoutDashboard, roles: 'all', end: true },
  { to: '/factory/products', label: 'Products', icon: Package, roles: ['admin'] },
  { to: '/factory/plans', label: 'Production Plans', icon: ClipboardList, roles: ['admin'] },
  { to: '/factory/digital-print', label: 'Digital Print', icon: Sparkles, roles: ['admin'] },
  { to: '/factory/cutting', label: 'Cutting', icon: Scissors, roles: ['admin', 'cutting_head'] },
  { to: '/factory/stitching', label: 'Stitching', icon: Factory, roles: ['admin', 'stitching_head'] },
  { to: '/factory/quality', label: 'Quality', icon: ShieldCheck, roles: ['admin', 'quality_head'] },
  { to: '/factory/store', label: 'Store', icon: Store, roles: ['admin', 'store_manager'] },
  { to: '/factory/shopify', label: 'Shopify', icon: ShoppingBag, roles: ['admin'] },
  { to: '/factory/team', label: 'Team Members', icon: Users, roles: ['admin'] },
]

export function FactoryShell() {
  const { profile, signOut } = useFactoryAuth()
  const role = profile?.role

  const visibleItems = NAV_ITEMS.filter((item) => item.roles === 'all' || (role && item.roles.includes(role)))

  return (
    <FactoryDataProvider>
      <div className="min-h-screen bg-base-900 bg-grid-glow">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-base-900/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link to="/factory" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan">
                <Factory size={16} className="text-base-950" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-white">Factory</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Unit Production</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-300">{profile?.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-neon-cyan">{role ? FACTORY_ROLE_LABELS[role] : ''}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={signOut}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-neon-red"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
            {visibleItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  classNames(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    isActive ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </FactoryDataProvider>
  )
}
