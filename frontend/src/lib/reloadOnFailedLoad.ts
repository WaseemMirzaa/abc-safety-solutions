const RELOAD_COUNT_KEY = 'abc_auto_reload_count'
const RELOAD_TS_KEY = 'abc_auto_reload_ts'
const MAX_RELOADS = 6
const RELOAD_WINDOW_MS = 10 * 60 * 1000

function mayReload(): boolean {
  const now = Date.now()
  const ts = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? '0')
  let count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0')
  if (!ts || now - ts > RELOAD_WINDOW_MS) {
    count = 0
    sessionStorage.setItem(RELOAD_TS_KEY, String(now))
  }
  if (count >= MAX_RELOADS) return false
  sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1))
  sessionStorage.setItem(RELOAD_TS_KEY, String(now))
  return true
}

function scheduleReload(_reason: string) {
  if (!mayReload()) return
  window.setTimeout(() => window.location.reload(), 400)
}

function messageFromReason(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String((reason as Error).message)
  }
  return String(reason ?? '')
}

const CHUNK_RE =
  /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed|ChunkLoadError/i

/** Only stale bundle / chunk failures — not API uploads or XHR network blips. */
const CHUNK_ONLY_RE =
  /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed|ChunkLoadError|Loading module/i

function isBenignNetworkRejection(msg: string): boolean {
  return (
    /upload|network error during upload|upload interrupted|aborted|api\//i.test(msg) ||
    /xhr|multipart|multer/i.test(msg)
  )
}

/**
 * Recover from stale caches / failed chunks after deploy by reloading (capped per session).
 */
export function installReloadOnFailedLoad() {
  window.addEventListener('load', () => {
    sessionStorage.removeItem(RELOAD_COUNT_KEY)
    sessionStorage.removeItem(RELOAD_TS_KEY)
  })

  window.addEventListener('vite:preloadError', () => scheduleReload('vite:preloadError'))

  window.addEventListener('error', (ev) => {
    const msg = ev.message ?? ''
    if (CHUNK_RE.test(msg) || /Loading module/i.test(msg)) {
      scheduleReload('window.error')
    }
  })

  window.addEventListener('unhandledrejection', (ev) => {
    const msg = messageFromReason(ev.reason)
    if (isBenignNetworkRejection(msg)) return
    if (CHUNK_RE.test(msg) || CHUNK_ONLY_RE.test(msg)) {
      ev.preventDefault()
      scheduleReload('unhandledrejection')
    }
  })

  // Stuck blank shell after deploy (no root content)
  window.setTimeout(() => {
    const root = document.getElementById('root')
    if (!root || root.childElementCount > 0) return
    scheduleReload('empty-root')
  }, 12_000)
}
