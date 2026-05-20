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

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const body = init?.body
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers, credentials: 'include' })
  const text = await res.text()
  if (res.status === 401) {
    setToken(null)
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
    throw new ApiError(res.status, msg)
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
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
    throw new ApiError(res.status, msg)
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function adminUpload(path: string, file: File): Promise<{ url: string; fileName: string; kind?: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers,
    body: fd,
    credentials: 'include',
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text || res.statusText
    try {
      const j = JSON.parse(text) as { message?: string | string[] }
      if (Array.isArray(j.message)) msg = j.message.join(', ')
      else if (typeof j.message === 'string') msg = j.message
    } catch {
      /* */
    }
    throw new ApiError(res.status, msg)
  }
  return JSON.parse(text) as { url: string; fileName: string; kind?: string }
}

export async function adminUploadImage(file: File): Promise<{ url: string; fileName: string }> {
  return adminUpload('/api/admin/upload/image', file)
}

/** Images, PDFs (up to 50 MB), videos (up to 100 MB) for course slides. */
export async function adminUploadFile(file: File): Promise<{ url: string; fileName: string; kind: string }> {
  const r = await adminUpload('/api/admin/upload/file', file)
  return { url: r.url, fileName: r.fileName, kind: r.kind ?? 'image' }
}
