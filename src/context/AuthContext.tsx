import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppUser } from '@/lib/types'

export class UnauthorizedAccessError extends Error {
  constructor() {
    super('Unauthorized Access')
    this.name = 'UnauthorizedAccessError'
  }
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes before timeout

interface AuthContextValue {
  loading: boolean
  user: User | null
  appUser: AppUser | null
  username: string | null
  displayName: string | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sessionTimeoutWarning: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)

  async function loadAppUser(userId: string): Promise<AppUser | null> {
    const { data } = await supabase.from('app_users').select('*').eq('id', userId).maybeSingle()
    return data ?? null
  }

  function resetSessionTimeout() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    setSessionTimeoutWarning(false)

    // Show warning before timeout
    warningRef.current = setTimeout(() => {
      setSessionTimeoutWarning(true)
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS)

    // Auto logout after timeout
    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      setSession(null)
      setAppUser(null)
      setSessionTimeoutWarning(false)
    }, SESSION_TIMEOUT_MS)
  }

  function setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    const handler = () => resetSessionTimeout()

    events.forEach((event) => document.addEventListener(event, handler))
    return () => events.forEach((event) => document.removeEventListener(event, handler))
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
          resetSessionTimeout()
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
        resetSessionTimeout()
      } else {
        setSession(null)
        setAppUser(null)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (warningRef.current) clearTimeout(warningRef.current)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Setup activity listeners when session is active
  useEffect(() => {
    if (!appUser) return
    return setupActivityListeners()
  }, [appUser])

  async function signIn(username: string, password: string) {
    const trimmed = username.trim().toLowerCase()
    const { data: email, error: lookupError } = await supabase.rpc('resolve_login_email', { p_username: trimmed })
    // A real infrastructure error (missing function/table, network failure)
    // is NOT the same as "this username isn't allowed" — surface it as a
    // normal error instead of the polished Unauthorized Access screen,
    // which would otherwise misleadingly imply the backend is working.
    if (lookupError) {
      throw new Error(lookupError.message)
    }
    if (!email) {
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
    sessionTimeoutWarning,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
