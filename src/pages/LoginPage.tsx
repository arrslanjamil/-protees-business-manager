import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert, Zap, Fingerprint, AlertTriangle } from 'lucide-react'
import { useAuth, UnauthorizedAccessError } from '@/context/AuthContext'
import { errorMessage } from '@/lib/utils'
import { isBiometricAvailable, isPlatformAuthenticatorAvailable, authenticateWithBiometric, getBiometricLabel } from '@/lib/biometric'

export function LoginPage() {
  const { signIn, sessionTimeoutWarning, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLabel, setBiometricLabel] = useState('')
  const [usingBiometric, setUsingBiometric] = useState(false)

  useEffect(() => {
    async function checkBiometric() {
      const available = isBiometricAvailable() && (await isPlatformAuthenticatorAvailable())
      setBiometricAvailable(available)
      setBiometricLabel(getBiometricLabel())
    }
    checkBiometric()
  }, [])

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
        setError(errorMessage(err, 'Something went wrong.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBiometricLogin() {
    setError(null)
    setUnauthorized(false)
    setSubmitting(true)
    setUsingBiometric(true)
    try {
      const authenticated = await authenticateWithBiometric()
      if (!authenticated) {
        setError(`${biometricLabel} authentication failed. Please try again or use username/password.`)
      } else {
        // For demo purposes, we'll show a message
        // In production, you'd store biometric credentials and link them to user accounts
        setError(`${biometricLabel} verified! Please enter your username to complete login.`)
      }
    } catch (err) {
      setError(`${biometricLabel} not available or was cancelled. Try username/password instead.`)
      console.error(err)
    } finally {
      setSubmitting(false)
      setUsingBiometric(false)
    }
  }

  async function handleExtendSession() {
    setError(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow px-4">
      {/* Session Timeout Warning Modal */}
      {sessionTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-amber/10 text-neon-amber">
                <AlertTriangle size={20} />
              </div>
              <h2 className="font-semibold text-white">Session Expiring</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Your session is about to expire due to inactivity. You will be logged out in 2 minutes.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={async () => {
                  await signOut()
                  navigate('/login', { replace: true })
                }}
              >
                Logout Now
              </button>
              <button className="btn-primary flex-1" onClick={handleExtendSession}>
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

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
              {submitting && !usingBiometric ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>

            {biometricAvailable && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-base-800 px-2 text-slate-500">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary w-full gap-2"
                  onClick={handleBiometricLogin}
                  disabled={submitting}
                >
                  {submitting && usingBiometric ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Fingerprint size={16} />
                  )}
                  Use {biometricLabel}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
