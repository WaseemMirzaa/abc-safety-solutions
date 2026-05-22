import { resolveMediaUrl } from '@/lib/mediaUrl'
import { withRetries } from '@/lib/retry'

const buffers = new Map<string, ArrayBuffer>()
const inflight = new Map<string, Promise<ArrayBuffer>>()

function cacheKey(url: string): string {
  return resolveMediaUrl(url)
}

function fetchBuffer(
  resolved: string,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  return withRetries(
    () =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', resolved)
        xhr.responseType = 'arraybuffer'
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
            return
          }
          reject(new Error(`Failed to download presentation (HTTP ${xhr.status}).`))
        }
        xhr.onerror = () => reject(new Error('Network error while downloading presentation.'))
        xhr.onprogress = (e) => {
          if (!onProgress) return
          const total = e.lengthComputable ? e.total : 0
          const pct = total > 0 ? Math.min(99, Math.round((e.loaded / total) * 100)) : 0
          onProgress(pct)
        }
        xhr.send()
      }),
    { attempts: 3, delayMs: 1200, backoff: true },
  )
}

/** Start downloading a .pptx in the background (deduped). */
export function prefetchPptxBuffer(url: string): void {
  const key = cacheKey(url)
  if (buffers.has(key) || inflight.has(key)) return
  inflight.set(
    key,
    fetchBuffer(key).then((buf) => {
      buffers.set(key, buf)
      inflight.delete(key)
      return buf
    }),
  )
}

export function hasCachedPptxBuffer(url: string): boolean {
  return buffers.has(cacheKey(url))
}

/** Fetch .pptx bytes once per session; reuse across admin + learn views. */
export async function getOrFetchPptxBuffer(
  url: string,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const key = cacheKey(url)
  const hit = buffers.get(key)
  if (hit) {
    onProgress?.(100)
    return hit
  }
  let job = inflight.get(key)
  if (!job) {
    job = fetchBuffer(key, onProgress).then((buf) => {
      buffers.set(key, buf)
      inflight.delete(key)
      return buf
    })
    inflight.set(key, job)
  }
  return job
}

export function clearPptxBufferCache(url?: string) {
  if (url) {
    const key = cacheKey(url)
    buffers.delete(key)
    inflight.delete(key)
    return
  }
  buffers.clear()
  inflight.clear()
}
