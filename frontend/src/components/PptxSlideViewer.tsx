import { useCallback, useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { PresentationLoader } from '@/components/learn/PresentationLoader'
import { getOrFetchPptxBuffer, prefetchPptxBuffer } from '@/lib/pptxDeckCache'
import {
  fitPresentationBox,
  inferSlideAspectRatio,
  scalePptxCanvasToFit,
  SLIDE_ASPECT_16_9,
} from '@/lib/pptxFitBox'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  url: string
  slideIndex: number
  className?: string
  compact?: boolean
  onReadyChange?: (ready: boolean) => void
  /** Fired when the deck is ready with the real slide count from the .pptx file. */
  onSlideCount?: (count: number) => void
  /** 16/9 or 4/3 after the current slide renders. */
  onSlideAspect?: (aspect: number) => void
}

type Phase = 'downloading' | 'processing' | 'ready' | 'error'

function measureHost(host: HTMLElement | null, compact: boolean, aspect = SLIDE_ASPECT_16_9) {
  const w = host?.clientWidth || host?.offsetWidth || 0
  const h = host?.clientHeight || host?.offsetHeight || 0
  if (w > 0 && h > 0) {
    return fitPresentationBox(w, h, aspect)
  }
  const fallbackW = compact ? 480 : 960
  return fitPresentationBox(fallbackW, compact ? 200 : 540, aspect)
}

/**
 * Fallback PPTX viewer used when server-side rendered images are not available.
 * Uses pptx-preview's load() API to parse the deck once, then renderSingleSlide()
 * on demand — avoids the extra render that preview() does before jumping to the
 * target slide.
 */
export function PptxSlideViewer({
  url,
  slideIndex,
  className = '',
  compact = false,
  onReadyChange,
  onSlideCount,
  onSlideAspect,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewerRef = useRef<ReturnType<typeof init> | null>(null)
  const slideIndexRef = useRef(slideIndex)
  const [phase, setPhase] = useState<Phase>('downloading')
  const [err, setErr] = useState('')
  const [downloadPct, setDownloadPct] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [slideAspect, setSlideAspect] = useState(SLIDE_ASPECT_16_9)

  slideIndexRef.current = slideIndex

  const resolved = resolveMediaUrl(url)

  const reportCanvasAspect = useCallback(() => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas?.width || !canvas?.height) return
    const aspect = inferSlideAspectRatio(canvas.width, canvas.height)
    setSlideAspect(aspect)
    onSlideAspect?.(aspect)
  }, [onSlideAspect])

  const hideBuiltInNav = useCallback(() => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('button, [class*="pagination"], [class*="Pagination"]').forEach((el) => {
      const node = el as HTMLElement
      node.style.display = 'none'
      node.style.pointerEvents = 'none'
      node.setAttribute('aria-hidden', 'true')
    })
  }, [])

  const applyCanvasFit = useCallback(() => {
    scalePptxCanvasToFit(containerRef.current)
    reportCanvasAspect()
    hideBuiltInNav()
  }, [reportCanvasAspect, hideBuiltInNav])

  useEffect(() => {
    prefetchPptxBuffer(url)
  }, [url])

  useEffect(() => {
    onReadyChange?.(phase === 'ready')
  }, [phase, onReadyChange])

  useEffect(() => {
    setPhase('downloading')
    setErr('')
    setDownloadPct(0)
    setSlideAspect(SLIDE_ASPECT_16_9)
    onReadyChange?.(false)
  }, [url, onReadyChange])

  const retry = useCallback(() => {
    setErr('')
    setPhase('downloading')
    setDownloadPct(0)
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    let previewer: ReturnType<typeof init> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      const el = containerRef.current
      if (!el) {
        if (!cancelled) {
          retryTimer = setTimeout(() => {
            if (!cancelled) void run()
          }, 50)
        }
        return
      }

      setPhase('downloading')
      setErr('')
      setDownloadPct(0)

      const { width, height } = measureHost(hostRef.current, compact, slideAspect)

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

        const { width: w2, height: h2 } = measureHost(hostRef.current, compact, slideAspect)
        previewer = init(el, { width: w2 || width, height: h2 || height, mode: 'slide' })
        previewerRef.current = previewer

        // Use load() instead of preview() — load() parses the deck without rendering
        // slide 0 first, so we jump directly to the requested slide index.
        await previewer.load(buf)
        if (cancelled) return

        const max = Math.max(0, previewer.slideCount - 1)
        const idx = Math.min(slideIndexRef.current, max)
        previewer.renderSingleSlide(idx)

        if (!cancelled) {
          if (previewer.slideCount > 0) onSlideCount?.(previewer.slideCount)
          setPhase('ready')
          requestAnimationFrame(() => {
            applyCanvasFit()
            const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
            if (!canvas?.width || !canvas?.height) return
            const detected = inferSlideAspectRatio(canvas.width, canvas.height)
            if (Math.abs(detected - slideAspect) > 0.04) {
              setSlideAspect(detected)
              setReloadToken((n) => n + 1)
            }
          })
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Failed to load PPTX')
          setPhase('error')
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      previewer?.destroy()
      previewerRef.current = null
    }
  }, [url, reloadToken, compact, slideAspect, applyCanvasFit])

  useEffect(() => {
    if (phase !== 'ready' || !previewerRef.current) return
    const max = Math.max(0, previewerRef.current.slideCount - 1)
    previewerRef.current.renderSingleSlide(Math.min(slideIndex, max))
    requestAnimationFrame(() => applyCanvasFit())
  }, [slideIndex, phase, applyCanvasFit])

  useEffect(() => {
    const host = hostRef.current
    if (!host || phase !== 'ready') return
    const ro = new ResizeObserver(() => applyCanvasFit())
    ro.observe(host)
    return () => ro.disconnect()
  }, [phase, applyCanvasFit])

  const containerClass = compact
    ? 'pptx-deck-viewer pptx-deck-viewer--compact'
    : 'pptx-deck-viewer'

  const isLoading = phase === 'downloading' || phase === 'processing'
  const showDeck = phase === 'ready'

  return (
    <div
      ref={hostRef}
      className={
        compact
          ? `relative h-full min-h-[160px] w-full ${className}`
          : `relative h-full min-h-0 w-full ${className}`
      }
    >
      {isLoading && !err ? (
        <PresentationLoader
          phase={phase === 'processing' ? 'processing' : 'downloading'}
          downloadPct={downloadPct}
          compact={compact}
        />
      ) : null}
      {phase === 'error' ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50/80 px-4 text-center">
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
      <div
        ref={containerRef}
        className={`${containerClass} ${showDeck ? 'opacity-100' : 'pointer-events-none opacity-0'} absolute inset-0`}
        aria-hidden={!showDeck}
      />
    </div>
  )
}
