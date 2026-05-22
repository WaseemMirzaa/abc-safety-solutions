import { useCallback, useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { PresentationLoader } from '@/components/learn/PresentationLoader'
import { getOrFetchPptxBuffer, prefetchPptxBuffer } from '@/lib/pptxDeckCache'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  url: string
  slideIndex: number
  className?: string
  compact?: boolean
  onReadyChange?: (ready: boolean) => void
}

type Phase = 'downloading' | 'processing' | 'ready' | 'error'

function measureHost(host: HTMLElement | null, compact: boolean) {
  const w = host?.clientWidth || host?.offsetWidth || 0
  const h = host?.clientHeight || host?.offsetHeight || 0
  const width = w > 0 ? w : compact ? 480 : 960
  const height = h > 0 ? h : compact ? 200 : Math.round((width * 9) / 16)
  return {
    width: compact ? Math.max(280, Math.min(640, width)) : Math.max(320, width),
    height: Math.max(compact ? 160 : 200, height),
  }
}

/** Renders one slide from a .pptx deck (prev/next controlled by parent). Auto-loads on mount. */
export function PptxSlideViewer({
  url,
  slideIndex,
  className = '',
  compact = false,
  onReadyChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewerRef = useRef<ReturnType<typeof init> | null>(null)
  const [phase, setPhase] = useState<Phase>('downloading')
  const [err, setErr] = useState('')
  const [downloadPct, setDownloadPct] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const resolved = resolveMediaUrl(url)

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

      const { width, height } = measureHost(hostRef.current, compact)

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

        const { width: w2, height: h2 } = measureHost(hostRef.current, compact)
        previewer = init(el, { width: w2 || width, height: h2 || height, mode: 'slide' })
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

    void run()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      previewer?.destroy()
      previewerRef.current = null
    }
  }, [url, reloadToken, compact])

  useEffect(() => {
    if (phase !== 'ready' || !previewerRef.current) return
    const max = Math.max(0, previewerRef.current.slideCount - 1)
    previewerRef.current.renderSingleSlide(Math.min(slideIndex, max))
  }, [slideIndex, phase])

  const containerClass = compact
    ? 'pptx-deck-viewer pptx-deck-viewer--compact absolute inset-0 mx-auto overflow-hidden rounded-lg bg-white [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden'
    : 'pptx-deck-viewer absolute inset-0 mx-auto overflow-hidden rounded-lg bg-white [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden [&_.pptx-preview-wrapper]:!max-h-full [&_.pptx-preview-wrapper]:!max-w-full [&_canvas]:!max-h-full [&_canvas]:!max-w-full [&_canvas]:!object-contain'

  const isLoading = phase === 'downloading' || phase === 'processing'
  const showDeck = phase === 'ready'

  return (
    <div
      ref={hostRef}
      className={
        compact
          ? `relative h-full min-h-[160px] w-full ${className}`
          : `relative flex h-full min-h-0 w-full flex-col ${className}`
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
        className={`${containerClass} ${showDeck ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showDeck}
      />
    </div>
  )
}
