import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { VoiceWidget } from '@/components/voice/VoiceWidget'
import { useData } from '@/context/DataContext'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function AppLayout() {
  const { loading, error, configured } = useData()

  return (
    <div className="min-h-screen bg-base-900 bg-grid-glow">
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {!configured && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-neon-amber/30 bg-neon-amber/5 px-4 py-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-neon-amber" />
              <div className="text-sm text-slate-300">
                <p className="font-medium text-neon-amber">Supabase not configured</p>
                <p className="mt-0.5 text-slate-400">
                  Copy <code className="rounded bg-white/10 px-1 py-0.5">.env.example</code> to{' '}
                  <code className="rounded bg-white/10 px-1 py-0.5">.env</code>, add your project URL and anon key, then
                  restart the dev server.
                </p>
              </div>
            </div>
          )}
          {error && configured && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-neon-red" />
              <p className="text-sm text-slate-300">{error}</p>
            </div>
          )}
          {loading ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="animate-spin text-neon-cyan" size={28} />
              <p className="text-sm">Loading data…</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <VoiceWidget />
    </div>
  )
}
