/** Resolve upload/media URLs for display and fetch (relative or absolute). */
export function resolveMediaUrl(url: string): string {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/uploads/')) return trimmed
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(trimmed, base)
    if (u.pathname.startsWith('/uploads/')) return u.pathname
  } catch {
    if (trimmed.startsWith('/')) return trimmed
  }
  return trimmed
}

export function slideTypeFromUrl(url: string): 'image' | 'pdf' | 'video' {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.pdf')) return 'pdf'
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video'
  return 'image'
}
