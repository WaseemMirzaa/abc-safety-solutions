import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import type { UserSession } from '@/types'
import { localCache } from '@/lib/localCache'

type AuthState = {
  user: UserSession | null
  login: (u: UserSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

let listeners: Array<() => void> = []
function emit() {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

function getSnapshot(): UserSession | null {
  return localCache.getUser()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const login = useCallback((u: UserSession) => {
    localCache.setUser(u)
    emit()
  }, [])

  const logout = useCallback(() => {
    localCache.setUser(null)
    emit()
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
