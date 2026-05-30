import { notifySessionCleared, resetAppSessionCache } from '@/lib/sessionReset'
import { logError } from '@/lib/log'
import { withRetries } from '@/lib/retry'

export const TOKEN_KEY = 'abc_access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}

async function apiJsonOnce<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const body = init?.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers, credentials: 'include' })
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Network error')
    ;(err as Error & { status?: number }).status = 0
    throw err
  }
  const text = await res.text()
  if (res.status === 401 && token) {
    resetAppSessionCache()
    notifySessionCleared()
  }
  if (!res.ok) {
    let msg = text || res.statusText
    try {
      const j = JSON.parse(text) as { message?: string | string[] }
      if (Array.isArray(j.message)) msg = j.message.join(', ')
      else if (typeof j.message === 'string') msg = j.message
    } catch {
      /* keep raw */
    }
    const apiErr = new ApiError(res.status, msg)
    logError('api', apiErr, { path, status: res.status })
    throw apiErr
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const safeToRetry = method === 'GET' || method === 'HEAD'
  if (!safeToRetry) return apiJsonOnce<T>(path, init)
  return withRetries(() => apiJsonOnce<T>(path, init), {
    attempts: 4,
    delayMs: 1000,
    backoff: true,
    shouldRetry: (err) => {
      if (err instanceof ApiError) return err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504
      return true
    },
  })
}

/** Unauthenticated JSON (e.g. public certificate verify). */
export async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const body = init?.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers, credentials: 'omit' })
  const text = await res.text()
  if (!res.ok) {
    let msg = text || res.statusText
    try {
      const j = JSON.parse(text) as { message?: string | string[] }
      if (Array.isArray(j.message)) msg = j.message.join(', ')
      else if (typeof j.message === 'string') msg = j.message
    } catch {
      /* keep raw */
    }
    const apiErr = new ApiError(res.status, msg)
    logError('api:public', apiErr, { path, status: res.status })
    throw apiErr
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export type UploadProgress = {
  loaded: number
  total: number
  percent: number
}

function parseUploadError(status: number, text: string): string {
  let msg = text || 'Upload failed'
  if (status === 413) {
    return 'File too large for nginx (413). On the server run: sudo cp deploy/nginx-pm2.conf /etc/nginx/sites-available/abc-safety && sudo nginx -t && sudo systemctl reload nginx'
  }
  try {
    const j = JSON.parse(text) as { message?: string | string[] }
    if (Array.isArray(j.message)) return j.message.join(', ')
    if (typeof j.message === 'string') return j.message
  } catch {
    if (text.includes('413') && text.includes('Too Large')) {
      return 'Upload rejected by nginx (413). Increase client_max_body_size on the server and reload nginx.'
    }
  }
  return msg
}

function xhrUploadFormOnce(
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ url: string; fileName: string; kind?: string; durationSec?: number }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase()}${path}`)
    xhr.withCredentials = true
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        const total = e.lengthComputable ? e.total : file.size
        const loaded = e.loaded
        const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
        onProgress({ loaded, total, percent })
      })
    }

    xhr.addEventListener('load', () => {
      const text = xhr.responseText ?? ''
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(text) as { url: string; fileName: string; kind?: string; durationSec?: number })
        } catch {
          reject(new Error('Invalid upload response from server.'))
        }
        return
      }
      const apiErr = new ApiError(xhr.status, parseUploadError(xhr.status, text))
      logError('api:upload', apiErr, { path, status: xhr.status, file: file.name })
      reject(apiErr)
    })

    xhr.addEventListener('error', () =>
      reject(new Error('Network error during upload. If the site reloaded, wait for the API to finish restarting and try again.')),
    )
    xhr.addEventListener('abort', () =>
      reject(new Error('Upload interrupted. Keep this tab open until the progress bar reaches 100%.')),
    )
    xhr.send(fd)
  })
}

/** XHR upload with retries on network / gateway errors (not on 4xx except 0). */
export function xhrUploadForm(
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ url: string; fileName: string; kind?: string; durationSec?: number }> {
  return withRetries(() => xhrUploadFormOnce(path, file, onProgress), {
    attempts: 4,
    delayMs: 2000,
    backoff: true,
    shouldRetry: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 413 || err.status === 401 || err.status === 403) return false
        return err.status >= 502 || err.status === 0
      }
      return true
    },
  })
}

function adminUpload(
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ url: string; fileName: string; kind?: string }> {
  return xhrUploadForm(path, file, onProgress)
}

export async function adminUploadImage(file: File): Promise<{ url: string; fileName: string }> {
  return adminUpload('/api/admin/upload/image', file)
}

/** Images, PDFs, videos, and PowerPoint for course slides / media library. */
export async function adminUploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ url: string; fileName: string; kind: string }> {
  const r = await adminUpload('/api/admin/upload/file', file, onProgress)
  return { url: r.url, fileName: r.fileName, kind: r.kind ?? 'image' }
}

/** Picks /file or /image (both accept the same types on the server). */
export async function adminUploadMedia(file: File): Promise<{ url: string; fileName: string; kind: string }> {
  if (file.type.startsWith('image/')) {
    const r = await adminUploadImage(file)
    return { url: r.url, fileName: r.fileName, kind: 'image' }
  }
  return adminUploadFile(file)
}
