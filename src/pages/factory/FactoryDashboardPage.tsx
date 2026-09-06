import { ClipboardList, Factory, Scissors, ShieldCheck, Sparkles, Store, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFactoryData } from '@/context/FactoryDataContext'
import { StatCard } from '@/components/ui/StatCard'

export function FactoryDashboardPage() {
  const { plans, loading } = useFactoryData()

  const pendingPlans = plans.filter((p) => p.status === 'pending').length
  const inProgressPlans = plans.filter((p) => p.status === 'in_progress').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Factory Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Production today, across every stage.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <Link to="/factory/plans">
          <StatCard label="Plans" value={String(loading ? '—' : plans.length)} icon={ClipboardList} accent="cyan" hint={`${pendingPlans} pending`} />
        </Link>
        <StatCard label="Digital Print" value="0" icon={Sparkles} accent="purple" hint="Phase 2" />
        <StatCard label="Cutting" value="0" icon={Scissors} accent="amber" hint="Phase 2" />
        <StatCard label="Stitching" value="0" icon={Factory} accent="green" hint="Phase 3" />
        <StatCard label="Quality" value="0" icon={ShieldCheck} accent="red" hint="Phase 4" />
        <StatCard label="Store" value="0" icon={Store} accent="cyan" hint="Phase 4" />
        <StatCard label="Shopify" value="0" icon={ShoppingBag} accent="purple" hint="Phase 5" />
        <StatCard label="In Progress" value={String(loading ? '—' : inProgressPlans)} icon={ClipboardList} accent="amber" />
      </div>
    </div>
  )
}
