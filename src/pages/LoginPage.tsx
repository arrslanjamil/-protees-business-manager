import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert, Zap } from 'lucide-react'
import { useAuth, UnauthorizedAccessError } from '@/context/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setUnauthorized(false)
    setSubmitting(true)
    try {
      await signIn(username, password)
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof UnauthorizedAccessError) {
        setUnauthorized(true)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple shadow-glow">
            <Zap size={22} className="text-base-950" />
          </div>
          <h1 className="font-display text-lg font-bold text-white">Protees Business Manager</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to continue.</p>
        </div>

        {unauthorized ? (
          <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neon-red/10 text-neon-red">
              <ShieldAlert size={20} />
            </div>
            <p className="font-medium text-neon-red">Unauthorized Access</p>
            <p className="mt-1.5 text-xs text-slate-400">This account is not permitted to access this application.</p>
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={() => {
                setUnauthorized(false)
                setPassword('')
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label-field">Username</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="aqeel or arslan"
                autoCapitalize="none"
                autoFocus
              />
            </div>
            <div>
              <label className="label-field">Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-xs text-neon-red">{error}</p>}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
