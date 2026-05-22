/** Resolve upload/media URLs for display and fetch (always same-origin for /uploads). */
export function resolveMediaUrl(url: string): string {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed

  let path = trimmed
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      if (u.pathname.startsWith('/uploads/')) path = u.pathname
      else return trimmed
    } catch {
      return trimmed
    }
  } else if (!path.startsWith('/')) {
    path = path.startsWith('uploads/') ? `/${path}` : `/${path.replace(/^\//, '')}`
  }

  if (path.startsWith('/uploads/') && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  if (path.startsWith('/')) {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    try {
      return new URL(path, base).href
    } catch {
      return path
    }
  }
  return trimmed
}

export function slideTypeFromUrl(url: string): 'image' | 'pdf' | 'video' {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.pdf')) return 'pdf'
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video'
  return 'image'
}
