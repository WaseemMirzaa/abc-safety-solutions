import { useCallback, useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { getOrFetchPptxBuffer, prefetchPptxBuffer } from '@/lib/pptxDeckCache'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  url: string
  slideIndex: number
  className?: string
  compact?: boolean
  /** When true, user must tap to start (large decks). File may still prefetch in the background. */
  deferLoad?: boolean
}

type Phase = 'idle' | 'downloading' | 'processing' | 'ready' | 'error'

/** Renders one slide from a .pptx deck (prev/next controlled by parent). */
export function PptxSlideViewer({
  url,
  slideIndex,
  className = '',
  compact = false,
  deferLoad = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewerRef = useRef<ReturnType<typeof init> | null>(null)
  const [loadStarted, setLoadStarted] = useState(!deferLoad)
  const [phase, setPhase] = useState<Phase>(deferLoad ? 'idle' : 'downloading')
  const [err, setErr] = useState('')
  const [downloadPct, setDownloadPct] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const resolved = resolveMediaUrl(url)

  useEffect(() => {
    setLoadStarted(!deferLoad)
    setPhase(deferLoad ? 'idle' : 'downloading')
    setErr('')
    setDownloadPct(0)
  }, [url, deferLoad])

  useEffect(() => {
    prefetchPptxBuffer(url)
  }, [url])

  const retry = useCallback(() => {
    setErr('')
    setPhase('downloading')
    setDownloadPct(0)
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!loadStarted) return
    const el = containerRef.current
    if (!el) return
    let cancelled = false
    let previewer: ReturnType<typeof init> | null = null

    const run = async () => {
      setPhase('downloading')
      setErr('')
      setDownloadPct(0)

      const width = compact
        ? Math.max(280, Math.min(640, el.clientWidth || el.offsetWidth || 480))
        : Math.max(320, el.clientWidth || el.offsetWidth || 960)
      const height = compact ? 200 : Math.max(280, el.clientHeight || el.offsetHeight || 540)

      try {
        if (previewerRef.current) {
          previewerRef.current.destroy()
          previewerRef.current = null
        }
        el.innerHTML = ''

        const buf = await getOrFetchPptxBuffer(url, (pct) => {
          if (!cancelled) setDownloadPct(pct)
        })
        if (cancelled) return

        setPhase('processing')
        setDownloadPct(100)

        previewer = init(el, { width, height, mode: 'slide' })
        previewerRef.current = previewer

        await previewer.preview(buf)
        if (cancelled) return

        const idx = Math.min(slideIndex, Math.max(0, previewer.slideCount - 1))
        previewer.renderSingleSlide(idx)
        if (!cancelled) setPhase('ready')
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Failed to load PPTX')
          setPhase('error')
        }
      }
    }

    const start = () => void run()

    if (el.clientWidth > 0 || compact) {
      start()
    } else {
      const ro = new ResizeObserver(() => {
        if (el.clientWidth > 0 && !cancelled) {
          ro.disconnect()
          start()
        }
      })
      ro.observe(el)
      const timer = window.setTimeout(start, 200)
      return () => {
        cancelled = true
        ro.disconnect()
        window.clearTimeout(timer)
        previewer?.destroy()
        previewerRef.current = null
      }
    }

    return () => {
      cancelled = true
      previewer?.destroy()
      previewerRef.current = null
    }
  }, [url, reloadToken, compact, loadStarted])

  useEffect(() => {
    if (phase !== 'ready' || !previewerRef.current) return
    const max = Math.max(0, previewerRef.current.slideCount - 1)
    previewerRef.current.renderSingleSlide(Math.min(slideIndex, max))
  }, [slideIndex, phase])

  const loadingBoxClass = compact
    ? 'flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-600'
    : 'absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-dashed border-slate-200 bg-white/95 px-6 py-8 text-center text-sm text-slate-600 shadow-sm'

  const statusText =
    phase === 'downloading'
      ? downloadPct > 0
        ? t('ui_learn_pptx_downloading', {
            defaultValue: 'Downloading… {{pct}}%',
            pct: downloadPct,
            interpolation: { escapeValue: false },
          })
        : t('ui_learn_pptx_loading', { defaultValue: 'Loading presentation…' })
      : phase === 'processing'
        ? t('ui_learn_pptx_processing', {
            defaultValue: 'Processing slides… (large files can take 1–2 minutes the first time)',
          })
        : ''

  const containerClass = compact
    ? 'pptx-deck-viewer pptx-deck-viewer--compact mx-auto h-[200px] w-full max-w-full overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/80 [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden'
    : 'pptx-deck-viewer mx-auto h-full min-h-[min(70vh,520px)] w-full max-w-full flex-1 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/80 [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden'

  if (deferLoad && !loadStarted) {
    return (
      <div className={compact ? `w-full ${className}` : `flex min-h-[min(50vh,400px)] w-full flex-col items-center justify-center ${className}`}>
        <p className="max-w-md px-4 text-center text-sm text-slate-600">
          {t('ui_learn_pptx_tap_load', {
            defaultValue: 'Tap below to load the presentation. The file may already be downloading in the background.',
          })}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          onClick={() => {
            setLoadStarted(true)
            setPhase('downloading')
          }}
        >
          {t('ui_learn_pptx_load_btn', { defaultValue: 'Load presentation' })}
        </button>
      </div>
    )
  }

  return (
    <div
      className={
        compact
          ? `relative w-full ${className}`
          : `relative flex h-full min-h-[min(70vh,520px)] w-full flex-col ${className}`
      }
    >
      {(phase === 'downloading' || phase === 'processing') && !err ? (
        <div className={loadingBoxClass}>
          <p>{statusText}</p>
          {phase === 'downloading' && downloadPct > 0 ? (
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${downloadPct}%` }} />
            </div>
          ) : phase === 'processing' ? (
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-400" />
            </div>
          ) : null}
        </div>
      ) : null}
      {phase === 'error' ? (
        <div
          className={
            compact
              ? 'flex h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50/50 px-4 text-center'
              : 'flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center'
          }
        >
          <p className="text-sm text-red-600">{err}</p>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-slate-50"
            onClick={retry}
          >
            {t('ui_learn_pptx_retry', { defaultValue: 'Retry' })}
          </button>
          <a href={resolved} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-800 hover:underline">
            {t('ui_learn_pptx_open_file', { defaultValue: 'Open file in new tab' })}
          </a>
        </div>
      ) : null}
      <div ref={containerRef} className={`${containerClass} ${phase !== 'ready' ? 'hidden' : ''}`} />
    </div>
  )
}
