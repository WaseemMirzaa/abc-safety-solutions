import { useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  url: string
  slideIndex: number
  className?: string
}

/** Renders one slide from a .pptx deck (prev/next controlled by parent). */
export function PptxSlideViewer({ url, slideIndex, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewerRef = useRef<ReturnType<typeof init> | null>(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false
    const previewer = init(el, {
      width: Math.max(320, el.clientWidth || 960),
      height: Math.max(240, el.clientHeight || 540),
      mode: 'slide',
    })
    previewerRef.current = previewer
    setReady(false)
    setErr('')

    ;(async () => {
      try {
        const res = await fetch(resolveMediaUrl(url))
        if (!res.ok) throw new Error('Failed to load presentation')
        const buf = await res.arrayBuffer()
        if (cancelled) return
        await previewer.preview(buf)
        const idx = Math.min(slideIndex, Math.max(0, previewer.slideCount - 1))
        previewer.renderSingleSlide(idx)
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load PPTX')
      }
    })()

    return () => {
      cancelled = true
      previewer.destroy()
      previewerRef.current = null
      setReady(false)
    }
  }, [url])

  useEffect(() => {
    if (!ready || !previewerRef.current) return
    const max = Math.max(0, previewerRef.current.slideCount - 1)
    previewerRef.current.renderSingleSlide(Math.min(slideIndex, max))
  }, [slideIndex, ready])

  return (
    <div className={`relative h-full w-full ${className}`}>
      {err ? (
        <p className="px-4 text-sm text-red-600">{err}</p>
      ) : !ready ? (
        <p className="px-4 text-sm text-slate-600">{t('ui_learn_pptx_loading', { defaultValue: 'Loading presentation…' })}</p>
      ) : null}
      <div
        ref={containerRef}
        className="pptx-deck-viewer mx-auto h-full min-h-[min(70vh,520px)] w-full max-w-full overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/80 [&_.pptx-preview-pagination]:hidden [&_.pptx-preview-wrapper+div]:hidden"
      />
    </div>
  )
}
