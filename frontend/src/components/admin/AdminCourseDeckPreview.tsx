import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/Button'
import { PptxSlideViewer } from '@/components/PptxSlideViewer'
import { prefetchPptxBuffer } from '@/lib/pptxDeckCache'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import type { CourseSlide } from '@/types'

const HEAVY_DECK_SLIDES = 15

type Props = {
  slide: CourseSlide
  /** Blob URL for instant preview right after upload. */
  blobPreviewUrl?: string | null
}

export function AdminCourseDeckPreview({ slide, blobPreviewUrl }: Props) {
  const [index, setIndex] = useState(0)
  const src = blobPreviewUrl ?? resolveMediaUrl(slide.url)
  const fileUrl = resolveMediaUrl(slide.url)
  const pptxTotal = slide.deckSlideCount && slide.deckSlideCount > 0 ? slide.deckSlideCount : 1
  const heavyDeck = pptxTotal > HEAVY_DECK_SLIDES
  const [showPreview, setShowPreview] = useState(!heavyDeck)

  useEffect(() => {
    setIndex(0)
    setShowPreview(!heavyDeck)
  }, [slide.url, blobPreviewUrl, heavyDeck])

  useEffect(() => {
    if (slide.type === 'pptx' && heavyDeck && !showPreview) {
      prefetchPptxBuffer(blobPreviewUrl ?? slide.url)
    }
  }, [slide.type, slide.url, blobPreviewUrl, heavyDeck, showPreview])

  if (slide.type === 'pptx') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/30 p-3 ring-1 ring-violet-100">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-800">
              Presentation {pptxTotal > 1 ? `· ${pptxTotal} slides` : ''}
            </p>
            {slide.title ? (
              <p className="mt-1 truncate text-sm font-medium text-brand-900">{slide.title}</p>
            ) : null}
          </div>
          {fileUrl && !fileUrl.startsWith('blob:') ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-800 hover:underline"
            >
              Open file
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        {!showPreview ? (
          <div className="mt-3 rounded-lg border border-dashed border-violet-200 bg-white px-3 py-4 text-center">
            <p className="text-xs text-slate-600">
              Large deck ({pptxTotal} slides). Load preview when ready — it may take a moment.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 !rounded-lg !py-2 !text-xs"
              onClick={() => setShowPreview(true)}
            >
              Load slide preview
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-3 max-h-[280px] overflow-hidden rounded-lg bg-white">
              <PptxSlideViewer url={src} slideIndex={index} compact />
            </div>
            {pptxTotal > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="!rounded-lg !py-1.5 !text-xs"
                  disabled={index <= 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium text-slate-600">
                  {index + 1} / {pptxTotal}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="!rounded-lg !py-1.5 !text-xs"
                  disabled={index >= pptxTotal - 1}
                  onClick={() => setIndex((i) => Math.min(pptxTotal - 1, i + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    )
  }

  if (slide.type === 'ppt') {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-4 text-sm text-amber-950">
        <p className="font-medium">Legacy .ppt file on server</p>
        <p className="mt-1 text-xs">
          Re-save as .pptx for slide preview. Learners may only download the file.
        </p>
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:underline">
            Open file
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    )
  }

  if (slide.type === 'pdf') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white ring-1 ring-amber-100">
        <iframe title={slide.title ?? 'PDF preview'} src={`${src}#view=FitH`} className="h-[min(280px,40vh)] w-full" />
      </div>
    )
  }

  if (slide.type === 'video') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-sky-200 bg-black ring-1 ring-sky-100">
        <video src={src} controls playsInline className="max-h-[280px] w-full" />
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white ring-1 ring-slate-100">
      <img src={src} alt={slide.title ?? ''} className="max-h-[280px] w-full object-contain" />
    </div>
  )
}
