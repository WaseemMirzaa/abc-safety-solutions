import { useCallback, useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { withRetries } from '@/lib/retry'
import { t } from '@/i18n/t'

type Props = {
  url: string
  slideIndex: number
  className?: string
}

async function fetchPptxBuffer(resolvedUrl: string): Promise<ArrayBuffer> {
  return withRetries(
    async () => {
      const res = await fetch(resolvedUrl, { credentials: 'same-origin', cache: 'no-store' })
      if (!res.ok) {
        const err = new Error(
          res.status === 404
            ? 'Presentation file not found on server (404). Re-upload the .pptx in Admin → Courses.'
            : `Failed to load presentation (HTTP ${res.status}).`,
        ) as Error & { status?: number }
        err.status = res.status
        throw err
      }
      return res.arrayBuffer()
    },
    { attempts: 4, delayMs: 1500, backoff: true },
  )
}

/** Renders one slide from a .pptx deck (prev/next controlled by parent). */
export function PptxSlideViewer({ url, slideIndex, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewerRef = useRef<ReturnType<typeof init> | null>(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = useCallback(() => {
    setErr('')
    setLoading(true)
    setReady(false)
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false
    let previewer: ReturnType<typeof init> | null = null

    const run = async () => {
      setLoading(true)
      setReady(false)
      setErr('')

      const width = Math.max(320, el.clientWidth || el.offsetWidth || 960)
      const height = Math.max(280, el.clientHeight || el.offsetHeight || 540)

      try {
        if (previewerRef.current) {
          previewerRef.current.destroy()
          previewerRef.current = null
        }
        el.innerHTML = ''

        previewer = init(el, {
          width,
          height,
          mode: 'slide',
        })
        previewerRef.current = previewer

        const resolved = resolveMediaUrl(url)
        const buf = await fetchPptxBuffer(resolved)
        if (cancelled) return

        await previewer.preview(buf)
        if (cancelled) return

        const idx = Math.min(slideIndex, Math.max(0, previewer.slideCount - 1))
        previewer.renderSingleSlide(idx)
        if (!cancelled) {
          setReady(true)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Failed to load PPTX')
          setLoading(false)
        }
      }
    }

    const start = () => {
      void run()
    }

    if (el.clientWidth > 0) {
      start()
    } else {
      const ro = new ResizeObserver(() => {
        if (el.clientWidth > 0 && !cancelled) {
          ro.disconnect()
          start()
        }
      })
      ro.observe(el)
      const t = window.setTimeout(start, 300)
      return () => {
        cancelled = true
        ro.disconnect()
        window.clearTimeout(t)
        previewer?.destroy()
        previewerRef.current = null
        setReady(false)
      }
    }

    return () => {
      cancelled = true
      previewer?.destroy()
      previewerRef.current = null
      setReady(false)
    }
  }, [url, reloadToken])

  useEffect(() => {
    if (!ready || !previewerRef.current) return
    const max = Math.max(0, previewerRef.current.slideCount - 1)
    previewerRef.current.renderSingleSlide(Math.min(slideIndex, max))
  }, [slideIndex, ready])

  return (
    <div className={`relative flex h-full min-h-[min(70vh,520px)] w-full flex-col ${className}`}>
      {err ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-red-600">{err}</p>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-slate-50"
            onClick={retry}
          >
            {t('ui_learn_pptx_retry', { defaultValue: 'Retry loading presentation' })}
          </button>
        </div>
      ) : loading && !ready ? (
        <p className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-4 text-center text-sm text-slate-600">
          {t('ui_learn_pptx_loading', { defaultValue: 'Loading presentation…' })}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={`pptx-deck-viewer mx-auto h-full min-h-[min(70vh,520px)] w-full max-w-full flex-1 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/80 [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden ${loading && !ready ? 'opacity-30' : ''}`}
      />
    </div>
  )
}
