/** Client-side thumbnails for admin playlist (before server PDF conversion). */

export async function pdfFirstPagePreview(file: File): Promise<string | null> {
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
    const data = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data }).promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 0.35 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  }
}

const MAX_VIDEO_POSTER_BYTES = 40 * 1024 * 1024
const MAX_POSTER_WIDTH = 320

export function videoPosterPreview(file: File): Promise<string | null> {
  if (file.size > MAX_VIDEO_POSTER_BYTES) return Promise.resolve(null)
  return new Promise((resolve) => {
    const blob = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const cleanup = () => URL.revokeObjectURL(blob)

    video.onerror = () => {
      cleanup()
      resolve(null)
    }
    video.onloadedmetadata = () => {
      const t = Math.min(1, Math.max(0.1, (video.duration || 2) * 0.05))
      video.currentTime = t
    }
    video.onseeked = () => {
      try {
        const w = video.videoWidth || 320
        const h = video.videoHeight || 180
        const scale = Math.min(1, MAX_POSTER_WIDTH / Math.max(w, 1))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(w * scale))
        canvas.height = Math.max(1, Math.round(h * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      } catch {
        resolve(null)
      } finally {
        cleanup()
      }
    }
    video.src = blob
  })
}
