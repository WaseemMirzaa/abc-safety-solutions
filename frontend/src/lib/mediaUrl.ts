/** Resolve stored upload paths for same-origin proxy (dev + production). */
export function resolveMediaUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/')) return url
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/uploads/')) return u.pathname
  } catch {
    /* relative or invalid */
  }
  return url
}

export function slideTypeFromUrl(url: string): 'image' | 'pdf' | 'video' {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.pdf')) return 'pdf'
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video'
  return 'image'
}
