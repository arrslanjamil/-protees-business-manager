import { useState } from 'react'
import { Factory, Loader2 } from 'lucide-react'
import { useFactoryAuth } from '@/context/FactoryAuthContext'
import { errorMessage } from '@/lib/utils'

export function FactoryLoginPage() {
  const { signIn, signUp } = useFactoryAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        if (!name.trim()) throw new Error('Enter your name.')
        await signUp(email.trim(), password, name.trim())
        setSignedUp(true)
      }
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (signedUp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow px-4">
        <div className="card w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-cyan/10 text-neon-cyan">
            <Factory size={24} />
          </div>
          <h1 className="font-display text-lg font-bold text-white">Account created</h1>
          <p className="mt-2 text-sm text-slate-400">
            An admin needs to approve your account and assign a role before you can access the Factory module. Check back soon.
          </p>
          <button className="btn-secondary mt-5 w-full" onClick={() => { setSignedUp(false); setMode('signin') }}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-900 bg-grid-glow px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-purple/10 text-neon-purple">
            <Factory size={24} />
          </div>
          <h1 className="font-display text-lg font-bold text-white">Factory / Unit Production</h1>
          <p className="mt-1 text-sm text-slate-400">Sign {mode === 'signin' ? 'in' : 'up'} to continue.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div>
              <label className="label-field">Name</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div>
            <label className="label-field">Email</label>
            <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@protees.com" />
          </div>
          <div>
            <label className="label-field">Password</label>
            <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-xs text-neon-red">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
