/**
 * Recover from stale caches / failed lazy chunks after deploy by reloading once.
 * @see https://vite.dev/guide/build#load-error-handling
 */
export function installReloadOnFailedLoad() {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload()
  })

  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason
    const msg = typeof r === 'string' ? r : (r && typeof r === 'object' && 'message' in r ? String((r as Error).message) : String(r))
    if (
      /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed/i.test(
        msg,
      )
    ) {
      ev.preventDefault()
      window.location.reload()
    }
  })
}
