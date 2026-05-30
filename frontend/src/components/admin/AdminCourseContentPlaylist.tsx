import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Film, GripVertical, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError, getToken, xhrUploadForm } from '@/api/client'
import {
  computeCourseContentMetrics,
  formatCourseDuration,
  probeVideoDurationSec,
} from '@/lib/courseContent'
import { slideTypeFromFile } from '@/lib/courseSlides'
import { randomId } from '@/lib/randomId'
import { pdfFirstPagePreview, videoPosterPreview } from '@/lib/mediaPreview'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import type { CourseSlide } from '@/types'

type Props = {
  slides: CourseSlide[]
  onChange: (slides: CourseSlide[]) => void
  disabled?: boolean
  error?: string
  onUploadingChange?: (uploading: boolean) => void
}

type ConvJob = {
  slideId: string
  progress: number
  status: 'converting' | 'done' | 'error'
  error?: string
}

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}

function displayName(slide: CourseSlide): string {
  return slide.fileName ?? slide.title ?? (slide.type === 'video' ? 'Video' : 'PDF')
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const MAX_INLINE_PDF_PREVIEW_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_PROBE_BYTES = 80 * 1024 * 1024

export function AdminCourseContentPlaylist({ slides, onChange, disabled, error, onUploadingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const slidesRef = useRef(slides)
  slidesRef.current = slides
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadErr, setUploadErr] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [convJobs, setConvJobs] = useState<Map<string, ConvJob>>(new Map())

  const anyConverting = [...convJobs.values()].some((j) => j.status === 'converting')
  const busy = uploading || anyConverting

  // Keep refs so the polling interval always reads the latest values without
  // being in the effect dependency array (which would reset the timer on every render).
  const convJobsRef = useRef(convJobs)
  convJobsRef.current = convJobs
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    onUploadingChange?.(busy)
  }, [busy, onUploadingChange])

  // Poll active conversion jobs on a stable 1.5 s interval.
  // Only depends on anyConverting so the timer is never reset by parent re-renders.
  useEffect(() => {
    if (!anyConverting) return
    const interval = window.setInterval(async () => {
      const token = getToken()
      const current = convJobsRef.current
      const updates = new Map(current)
      let slidesChanged = false
      const nextSlides = [...slidesRef.current]

      for (const [jobId, job] of updates) {
        if (job.status !== 'converting') continue
        try {
          const res = await fetch(`${apiBase()}/api/admin/upload/convert-status/${jobId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!res.ok) continue
          const data = (await res.json()) as {
            status: 'converting' | 'done' | 'error'
            progress: number
            url?: string
            durationSec?: number
            error?: string
          }
          updates.set(jobId, { ...job, status: data.status, progress: data.progress, error: data.error })
          if (data.status === 'done' && data.url) {
            const idx = nextSlides.findIndex((s) => s.id === job.slideId)
            if (idx !== -1) {
              nextSlides[idx] = {
                ...nextSlides[idx],
                url: data.url,
                ...(data.durationSec ? { durationSec: data.durationSec } : {}),
              }
              slidesChanged = true
            }
          }
        } catch {
          // network error — retry next tick
        }
      }

      setConvJobs(new Map(updates))
      if (slidesChanged) onChangeRef.current(nextSlides)
    }, 1500)
    return () => window.clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyConverting])

  const metrics = computeCourseContentMetrics(slides)

  const patchSlidePreview = useCallback((slideId: string, previewDataUrl: string) => {
    onChange(slidesRef.current.map((s) => (s.id === slideId ? { ...s, previewDataUrl } : s)))
  }, [onChange])

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setUploadErr('')
    setUploading(true)
    setUploadPct(0)

    const next = [...slides]
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const type = slideTypeFromFile(file)
        if (type !== 'pdf' && type !== 'video') {
          setUploadErr('Only PDF and video files (MP4, MOV, WMV) are allowed.')
          continue
        }
        const { url, fileName, durationSec: serverDurationSec, jobId } = await xhrUploadForm(
          '/api/admin/upload/file',
          file,
          (p) => {
            const base = (i / files.length) * 100
            setUploadPct(Math.round(base + p.percent / files.length))
          },
        )
        const slideId = randomId()
        const title = fileName || file.name
        if (type === 'video') {
          const initialDuration = serverDurationSec && serverDurationSec > 0 ? serverDurationSec : 60
          next.push({ id: slideId, type: 'video', url, fileName: title, title, durationSec: initialDuration })
          onChange([...next])

          if (jobId) {
            // WMV/AVI — conversion running in background; track it
            setConvJobs((prev) => {
              const m = new Map(prev)
              m.set(jobId, { slideId, progress: 0, status: 'converting' })
              return m
            })
          } else {
            // MP4/MOV — probe duration client-side if server didn't return it
            if (!serverDurationSec && file.size <= MAX_VIDEO_PROBE_BYTES) {
              void probeVideoDurationSec(file)
                .then((durationSec) => {
                  onChange(slidesRef.current.map((s) => (s.id === slideId ? { ...s, durationSec: durationSec > 0 ? durationSec : 60 } : s)))
                })
                .catch(() => {})
            }
            void videoPosterPreview(file)
              .then((preview) => { if (preview) patchSlidePreview(slideId, preview) })
              .catch(() => {})
          }
        } else {
          next.push({ id: slideId, type: 'pdf', url, fileName: title, title, renderStatus: 'pending' })
          onChange([...next])
          if (file.size <= MAX_INLINE_PDF_PREVIEW_BYTES) {
            void pdfFirstPagePreview(file)
              .then((preview) => { if (preview) patchSlidePreview(slideId, preview) })
              .catch(() => {})
          }
        }
      }
    } catch (err) {
      setUploadErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const removeAt = (idx: number) => {
    onChange(slides.filter((_, i) => i !== idx))
  }

  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx == null || dragIdx === idx) return
    onChange(moveItem(slides, dragIdx, idx))
    setDragIdx(idx)
  }
  const onDragEnd = () => setDragIdx(null)

  // Find conversion job for a given slide id
  const convJobForSlide = (slideId: string): ConvJob | undefined => {
    for (const job of convJobs.values()) if (job.slideId === slideId) return job
    return undefined
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-200/90 bg-violet-50/40 p-4">
      <label className="text-xs font-semibold uppercase tracking-wider text-violet-900">
        Course content <span className="text-red-600">*</span>
      </label>
      <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-600">
        Add multiple PDFs and videos (MP4, MOV, WMV). Drag to reorder. PDF pages are converted when you save.
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,video/mp4,video/quicktime,video/x-ms-wmv,.mp4,.mov,.wmv"
        className="hidden"
        onChange={(e) => void onPickFiles(e)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="!rounded-lg !border-violet-300 !py-2 !text-xs"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Add PDFs or videos'}
        </Button>
        {slides.length > 0 ? (
          <span className="text-xs font-medium text-violet-900">
            Duration (auto): {formatCourseDuration(metrics.durationMinutes)}
            {metrics.pdfFileCount > 0 || metrics.videoCount > 0 ? (
              <> · {[
                metrics.pdfFileCount > 0 ? `${metrics.pdfFileCount} PDF${metrics.pdfFileCount !== 1 ? 's' : ''}` : null,
                metrics.videoCount > 0 ? `${metrics.videoCount} video${metrics.videoCount !== 1 ? 's' : ''}` : null,
              ].filter(Boolean).join(' · ')} (= {metrics.slideCount} learner steps)</>
            ) : null}
          </span>
        ) : null}
      </div>

      {uploading ? (
        <div className="mt-3" role="status">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Spinner size="sm" />
            <span>Uploading… {uploadPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      ) : null}

      {uploadErr ? <p className="mt-2 text-xs font-medium text-amber-800">{uploadErr}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}

      {anyConverting ? (
        <p className="mt-2 text-xs font-medium text-amber-700">
          Converting video{[...convJobs.values()].filter(j => j.status === 'converting').length > 1 ? 's' : ''}… Save will be available when done.
        </p>
      ) : null}

      {slides.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {slides.map((slide, idx) => {
            const thumbUrl = slide.previewDataUrl ?? (slide.type === 'pdf' ? slide.renderedSlideUrls?.[0] : null)
            const pages = slide.type === 'pdf'
              ? slide.renderedSlideUrls?.filter(Boolean).length ?? slide.pdfPageCount ?? slide.deckSlideCount
              : null
            const convJob = convJobForSlide(slide.id)
            const isConverting = convJob?.status === 'converting'
            const convError = convJob?.status === 'error'

            return (
              <li
                key={slide.id}
                draggable={!disabled && !busy}
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm ${
                  dragIdx === idx ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-200'
                }`}
              >
                <span className="cursor-grab text-slate-400 active:cursor-grabbing" aria-hidden>
                  <GripVertical className="h-4 w-4" />
                </span>
                {thumbUrl ? (
                  <img src={resolveMediaUrl(thumbUrl)} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                ) : (
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    slide.type === 'video' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isConverting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : slide.type === 'video'
                        ? <Film className="h-4 w-4" />
                        : <FileText className="h-4 w-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-900">{displayName(slide)}</p>
                  {isConverting ? (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[11px] text-amber-700">
                        <span>Converting to MP4…</span>
                        <span className="tabular-nums">{convJob.progress}%</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${convJob.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : convError ? (
                    <p className="text-[11px] text-red-600">Conversion failed — re-upload this file</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {slide.type === 'video'
                        ? slide.durationSec
                          ? `${Math.floor(slide.durationSec / 60)}:${String(slide.durationSec % 60).padStart(2, '0')}`
                          : 'Video'
                        : pages
                          ? `${pages} page${pages === 1 ? '' : 's'}`
                          : slide.renderStatus === 'pending'
                            ? 'PDF — converts on save'
                            : 'PDF'}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="!rounded-lg !border-red-200 !px-2 !py-1.5 !text-xs !text-red-800"
                  disabled={disabled || busy || isConverting}
                  onClick={() => removeAt(idx)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-400">No content yet — add a PDF or video above.</p>
      )}
    </div>
  )
}
