import { queryClient } from '@/api/queryClient'
import { setToken } from '@/api/client'

let onSessionCleared: (() => void) | null = null

export function registerSessionClearedHandler(handler: () => void): () => void {
  onSessionCleared = handler
  return () => {
    if (onSessionCleared === handler) onSessionCleared = null
  }
}

export function resetAppSessionCache() {
  queryClient.cancelQueries()
  queryClient.clear()
  setToken(null)
}

export function notifySessionCleared() {
  onSessionCleared?.()
}
