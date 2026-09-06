import { Loader2, ShieldQuestion } from 'lucide-react'
import { useFactoryAuth } from '@/context/FactoryAuthContext'
import { FactoryShell } from '@/components/factory/FactoryShell'
import { FactoryLoginPage } from './FactoryLoginPage'

function FactoryLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow">
      <Loader2 size={28} className="animate-spin text-neon-cyan" />
    </div>
  )
}

function FactoryPendingApprovalScreen() {
  const { signOut } = useFactoryAuth()
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow px-4">
      <div className="card w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-amber/10 text-neon-amber">
          <ShieldQuestion size={24} />
        </div>
        <h1 className="font-display text-lg font-bold text-white">Waiting for approval</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your account is created but an admin hasn't assigned you a role yet. Ask an admin to approve you from Team Members.
        </p>
        <button className="btn-secondary mt-5 w-full" onClick={signOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export function FactoryRoot() {
  const { loading, user, profile } = useFactoryAuth()

  if (loading) return <FactoryLoadingScreen />
  if (!user) return <FactoryLoginPage />
  if (!profile?.role) return <FactoryPendingApprovalScreen />

  return <FactoryShell />
}
