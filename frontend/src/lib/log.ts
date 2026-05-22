/** Log API/UI failures in the browser console (DevTools → Console). */
export function shouldLogToConsole(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true'
}

export function logError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  if (!shouldLogToConsole()) return
  if (extra) console.error(`[${scope}]`, err, extra)
  else console.error(`[${scope}]`, err)
}

export function logWarn(scope: string, message: string, extra?: unknown): void {
  if (!shouldLogToConsole()) return
  if (extra !== undefined) console.warn(`[${scope}]`, message, extra)
  else console.warn(`[${scope}]`, message)
}
