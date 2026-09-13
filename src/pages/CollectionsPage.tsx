import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Clock, Landmark, Layers, ShoppingBag, Truck, Wallet } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { dashboardDateRange, formatCurrency, formatDate, isWithinRange, type DashboardDatePreset } from '@/lib/utils'

export function CollectionsPage() {
  const { shopifyOrders, couriersWithBalance, courierPayments, cashBalance, bankAccountsWithBalance } = useCollections()

  const [preset, setPreset] = useState<DashboardDatePreset>('monthly')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('15d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('15d').end)
  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const periodShopifyOrders = useMemo(
    () => shopifyOrders.filter((o) => isWithinRange(o.order_date.slice(0, 10), start, end)),
    [shopifyOrders, start, end]
  )
  const shopifyCollections = useMemo(() => periodShopifyOrders.reduce((s, o) => s + Number(o.total_amount), 0), [periodShopifyOrders])

  const periodCourierPayments = useMemo(
    () => courierPayments.filter((p) => isWithinRange(p.payment_date, start, end)),
    [courierPayments, start, end]
  )
  const courierCollections = useMemo(() => periodCourierPayments.reduce((s, p) => s + Number(p.amount), 0), [periodCourierPayments])

  const totalCollections = shopifyCollections + courierCollections
  const totalPendingCourier = useMemo(() => couriersWithBalance.reduce((s, c) => s + c.pendingBalance, 0), [couriersWithBalance])
  const totalBankBalance = useMemo(() => bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0), [bankAccountsWithBalance])

  const recentOrders = useMemo(
    () => [...shopifyOrders].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()).slice(0, 10),
    [shopifyOrders]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Collections</h1>
        <p className="mt-1 text-sm text-slate-400">Unified view of Shopify payments and courier collections.</p>
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        rangeStart={start}
        rangeEnd={end}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Collections (period)" value={formatCurrency(totalCollections)} icon={Layers} accent="cyan" />
        <StatCard label="Shopify Collections" value={formatCurrency(shopifyCollections)} icon={ShoppingBag} accent="purple" />
        <StatCard label="Courier Collections Received" value={formatCurrency(courierCollections)} icon={Truck} accent="green" />
        <StatCard label="Total Pending Courier Payments" value={formatCurrency(totalPendingCourier)} icon={Clock} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Cash Balance" value={formatCurrency(cashBalance)} icon={Wallet} accent="cyan" hint="Office cash on hand" />
        <StatCard label="Bank Account Balances" value={formatCurrency(totalBankBalance)} icon={Landmark} accent="purple" hint="Across all bank accounts" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/couriers" className="card group flex items-center gap-3 transition hover:-translate-y-0.5">
          <div className="rounded-xl bg-neon-green/10 p-2.5 text-neon-green">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Courier Accounts</p>
            <p className="text-xs text-slate-500">Manage expected & received collections</p>
          </div>
        </Link>
        <Link to="/bank-accounts" className="card group flex items-center gap-3 transition hover:-translate-y-0.5">
          <div className="rounded-xl bg-neon-purple/10 p-2.5 text-neon-purple">
            <Landmark size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Bank Accounts</p>
            <p className="text-xs text-slate-500">View balances & transaction history</p>
          </div>
        </Link>
        <Link to="/cash" className="card group flex items-center gap-3 transition hover:-translate-y-0.5">
          <div className="rounded-xl bg-neon-cyan/10 p-2.5 text-neon-cyan">
            <Banknote size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Office Cash</p>
            <p className="text-xs text-slate-500">Record cash in / cash out</p>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Shopify Orders</h2>
        {recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Shopify orders imported yet"
            description="Shopify order sync has not been configured. Once connected, paid orders will appear here automatically."
          />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Order #</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payment Method</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{o.order_number}</td>
                    <td className="px-5 py-3.5 text-slate-300">{o.customer_name || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(o.total_amount)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{o.payment_method || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-400">{o.financial_status}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(o.order_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
