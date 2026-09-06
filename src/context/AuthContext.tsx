import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppUser } from '@/lib/types'

export class UnauthorizedAccessError extends Error {
  constructor() {
    super('Unauthorized Access')
    this.name = 'UnauthorizedAccessError'
  }
}

interface AuthContextValue {
  loading: boolean
  user: User | null
  appUser: AppUser | null
  username: string | null
  displayName: string | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)

  async function loadAppUser(userId: string): Promise<AppUser | null> {
    const { data } = await supabase.from('app_users').select('*').eq('id', userId).maybeSingle()
    return data ?? null
  }

  useEffect(() => {
    let active = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (data.session) {
        const found = await loadAppUser(data.session.user.id)
        if (!active) return
        if (!found) {
          // Valid Supabase credentials, but not one of the allowed app
          // users — never let this session through to the rest of the app.
          await supabase.auth.signOut()
          setSession(null)
          setAppUser(null)
        } else {
          setSession(data.session)
          setAppUser(found)
        }
      } else {
        setSession(null)
        setAppUser(null)
      }
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return
      if (newSession) {
        const found = await loadAppUser(newSession.user.id)
        if (!active) return
        setSession(newSession)
        setAppUser(found)
      } else {
        setSession(null)
        setAppUser(null)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(username: string, password: string) {
    const trimmed = username.trim().toLowerCase()
    const { data: email, error: lookupError } = await supabase.rpc('resolve_login_email', { p_username: trimmed })
    if (lookupError || !email) {
      throw new UnauthorizedAccessError()
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError

    const found = await loadAppUser(signInData.user.id)
    if (!found) {
      await supabase.auth.signOut()
      throw new UnauthorizedAccessError()
    }
    setAppUser(found)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAppUser(null)
  }

  const value: AuthContextValue = {
    loading,
    user: session?.user ?? null,
    appUser,
    username: appUser?.username ?? null,
    displayName: appUser?.display_name ?? null,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
