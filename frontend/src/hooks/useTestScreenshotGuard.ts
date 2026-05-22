import { useEffect } from 'react'

/** Best-effort deterrence during knowledge checks (OS screenshots cannot be fully blocked in browsers). */
export function useTestScreenshotGuard(active: boolean) {
  useEffect(() => {
    if (!active) return

    const block = (e: Event) => e.preventDefault()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        void navigator.clipboard?.writeText('').catch(() => {})
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault()
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        void navigator.clipboard?.writeText('').catch(() => {})
      }
    }

    document.addEventListener('contextmenu', block)
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.addEventListener('dragstart', block)
    window.addEventListener('beforeprint', block)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keyup', onKeyUp, true)
    document.body.classList.add('test-secure-mode')

    return () => {
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('dragstart', block)
      window.removeEventListener('beforeprint', block)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keyup', onKeyUp, true)
      document.body.classList.remove('test-secure-mode')
    }
  }, [active])
}
