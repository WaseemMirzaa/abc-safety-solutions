/** Copy text with Clipboard API, then execCommand fallback (Safari / non-HTTPS). */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim()
  if (!value) return false

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      /* fall through to legacy copy */
    }
  }

  return legacyCopy(value)
}

function legacyCopy(value: string): boolean {
  if (typeof document === 'undefined') return false

  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '0'
  ta.style.width = '2em'
  ta.style.height = '2em'
  ta.style.padding = '0'
  ta.style.border = 'none'
  ta.style.outline = 'none'
  ta.style.boxShadow = 'none'
  ta.style.background = 'transparent'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'
  ta.setAttribute('aria-hidden', 'true')

  document.body.appendChild(ta)

  const selection = document.getSelection()
  const savedRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  let ok = false
  try {
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, value.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    document.body.removeChild(ta)
    if (savedRange && selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  return ok
}
