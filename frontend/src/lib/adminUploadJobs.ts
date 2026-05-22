import { ApiError, xhrUploadForm } from '@/api/client'
import { countPptxSlides } from '@/lib/pptxDeck'
import type { CourseSlide } from '@/types'

export type AdminUploadJobStatus = 'uploading' | 'processing' | 'done' | 'error'

export type AdminUploadJob = {
  id: string
  fileName: string
  status: AdminUploadJobStatus
  percent: number
  phase: 'upload' | 'processing'
  error?: string
  result?: { url: string; fileName: string; kind: string; deckSlideCount?: number }
}

const jobs = new Map<string, AdminUploadJob>()
const listeners = new Set<() => void>()

const PENDING_COURSE_KEY = 'abc_admin_pending_course_upload'
const PENDING_MEDIA_KEY = 'abc_admin_pending_media_upload'

export type PendingCourseUpload = {
  draftId: string
  deliveryMode: 'pptx' | 'video'
  slides: CourseSlide[]
  slideCount: number
}

export type PendingMediaUpload = {
  url: string
  fileName: string
  kind: 'image' | 'audio' | 'document' | 'other'
  labelHint: string
}

function notify() {
  listeners.forEach((l) => l())
}

export function subscribeAdminUploadJobs(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAdminUploadJob(id: string): AdminUploadJob | undefined {
  return jobs.get(id)
}

export function hasActiveAdminUploads(): boolean {
  return [...jobs.values()].some((j) => j.status === 'uploading' || j.status === 'processing')
}

function patchJob(id: string, patch: Partial<AdminUploadJob>) {
  const cur = jobs.get(id)
  if (!cur) return
  jobs.set(id, { ...cur, ...patch })
  notify()
}

function createJob(fileName: string): string {
  const id = crypto.randomUUID()
  jobs.set(id, {
    id,
    fileName,
    status: 'uploading',
    percent: 0,
    phase: 'upload',
  })
  notify()
  return id
}

export function readPendingCourseUpload(): PendingCourseUpload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_COURSE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingCourseUpload
  } catch {
    return null
  }
}

export function clearPendingCourseUpload() {
  sessionStorage.removeItem(PENDING_COURSE_KEY)
}

export function readPendingMediaUpload(): PendingMediaUpload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_MEDIA_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingMediaUpload
  } catch {
    return null
  }
}

export function clearPendingMediaUpload() {
  sessionStorage.removeItem(PENDING_MEDIA_KEY)
}

function savePendingCourseUpload(payload: PendingCourseUpload) {
  sessionStorage.setItem(PENDING_COURSE_KEY, JSON.stringify(payload))
}

function savePendingMediaUpload(payload: PendingMediaUpload) {
  sessionStorage.setItem(PENDING_MEDIA_KEY, JSON.stringify(payload))
}

/** Runs in module scope so uploads continue when the tab is backgrounded or admin routes change. */
export function startAdminFileUpload(
  path: '/api/admin/upload/file' | '/api/admin/upload/image',
  file: File,
): string {
  const id = createJob(file.name)
  void (async () => {
    try {
      const result = await xhrUploadForm(path, file, (p) => {
        patchJob(id, { percent: p.percent, phase: 'upload', status: 'uploading' })
      })
      patchJob(id, {
        status: 'done',
        percent: 100,
        phase: 'upload',
        result: { url: result.url, fileName: result.fileName, kind: result.kind ?? 'image' },
      })
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Upload failed.'
      patchJob(id, { status: 'error', error: msg })
    }
  })()
  return id
}

export function startCourseDeckUpload(
  file: File,
  draftId: string,
  mode: 'pptx' | 'video',
): string {
  const id = createJob(file.name)
  void (async () => {
    try {
      const { url, fileName, kind } = await xhrUploadForm('/api/admin/upload/file', file, (p) => {
        patchJob(id, { percent: p.percent, phase: 'upload', status: 'uploading' })
      })

      if (mode === 'pptx') {
        patchJob(id, { status: 'processing', phase: 'processing', percent: 100 })
        const deckSlideCount = await countPptxSlides(file)
        const title = fileName || file.name
        const slides: CourseSlide[] = [
          {
            id: `deck-${Date.now()}`,
            type: 'pptx',
            url,
            title,
            deckSlideCount,
          },
        ]
        savePendingCourseUpload({
          draftId,
          deliveryMode: 'pptx',
          slides,
          slideCount: deckSlideCount,
        })
        patchJob(id, {
          status: 'done',
          percent: 100,
          phase: 'processing',
          result: { url, fileName: fileName || file.name, kind: kind ?? 'pptx', deckSlideCount },
        })
        return
      }

      const title = fileName || file.name
      const slides: CourseSlide[] = [
        {
          id: `video-${Date.now()}`,
          type: 'video',
          url,
          title,
        },
      ]
      savePendingCourseUpload({
        draftId,
        deliveryMode: 'video',
        slides,
        slideCount: 1,
      })
      patchJob(id, {
        status: 'done',
        percent: 100,
        phase: 'upload',
        result: { url, fileName: fileName || file.name, kind: kind ?? 'video' },
      })
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Upload failed.'
      patchJob(id, { status: 'error', error: msg })
    }
  })()
  return id
}

export function startMediaLibraryUpload(
  file: File,
  kind: PendingMediaUpload['kind'],
  labelHint: string,
): string {
  const path = file.type.startsWith('image/')
    ? '/api/admin/upload/image'
    : '/api/admin/upload/file'
  const id = createJob(file.name)
  void (async () => {
    try {
      const result = await xhrUploadForm(path, file, (p) => {
        patchJob(id, { percent: p.percent, phase: 'upload', status: 'uploading' })
      })
      const uploadKind = result.kind ?? 'image'
      const mediaKind: PendingMediaUpload['kind'] =
        uploadKind === 'pdf' || uploadKind === 'pptx' || uploadKind === 'ppt'
          ? 'document'
          : uploadKind === 'video'
            ? 'other'
            : kind
      savePendingMediaUpload({
        url: result.url,
        fileName: result.fileName,
        kind: mediaKind,
        labelHint,
      })
      patchJob(id, {
        status: 'done',
        percent: 100,
        result: { url: result.url, fileName: result.fileName, kind: uploadKind },
      })
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Upload failed.'
      patchJob(id, { status: 'error', error: msg })
    }
  })()
  return id
}
