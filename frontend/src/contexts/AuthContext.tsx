import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authMe } from '@/api/localData'
import { getToken, setToken } from '@/api/client'
import { t } from '@/i18n/t'
import type { UserSession } from '@/types'

type AuthState = {
  user: UserSession | null
  ready: boolean
  applySession: (accessToken: string, user: UserSession) => void
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export type AuthProviderProps = {
  children: React.ReactNode
  /** Vitest: skip remote bootstrap */
  initialSession?: { accessToken?: string; user: UserSession }
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<UserSession | null>(initialSession?.user ?? null)
  const [ready, setReady] = useState(Boolean(initialSession))

  useEffect(() => {
    if (initialSession) {
      if (initialSession.accessToken) setToken(initialSession.accessToken)
      setUser(initialSession.user)
      setReady(true)
      return
    }
    const tok = getToken()
    if (!tok) {
      setReady(true)
      return
    }
    authMe()
      .then((u) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setReady(true))
  }, [initialSession])

  const applySession = useCallback((accessToken: string, u: UserSession) => {
    setToken(accessToken)
    setUser(u)
    setReady(true)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setUser(null)
      return
    }
    try {
      const u = await authMe()
      setUser(u)
    } catch {
      setToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, ready, applySession, logout, refreshMe }),
    [user, ready, applySession, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error(t('ui_error_auth_provider'))
  return ctx
}
