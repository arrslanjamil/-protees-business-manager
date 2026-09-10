import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { VoiceWidget } from '@/components/voice/VoiceWidget'
import { useData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AlertTriangle, Loader2, LogOut, Zap } from 'lucide-react'

export function AppLayout() {
  const { loading, error, configured } = useData()
  const { displayName, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-base-900 bg-grid-glow">
      <Sidebar />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-base-900/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-neon-cyan" />
          <p className="font-display text-sm font-bold tracking-wider text-white">PROTEES</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">{displayName}</span>
          <ThemeToggle />
          <button onClick={signOut} aria-label="Log out" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-neon-red">
            <LogOut size={15} />
          </button>
        </div>
      </header>
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
