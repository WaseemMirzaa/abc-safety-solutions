import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/Button'
import { PptxSlideViewer } from '@/components/PptxSlideViewer'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import type { CourseSlide } from '@/types'

type Props = {
  slide: CourseSlide
  /** Blob URL for instant preview while upload is in progress. */
  blobPreviewUrl?: string | null
}

export function AdminCourseDeckPreview({ slide, blobPreviewUrl }: Props) {
  const [index, setIndex] = useState(0)
  const src = blobPreviewUrl ?? resolveMediaUrl(slide.url)
  const pptxTotal = slide.deckSlideCount && slide.deckSlideCount > 0 ? slide.deckSlideCount : 1

  if (slide.type === 'pptx') {
    return (
      <div className="mt-4 rounded-xl border border-violet-200 bg-white p-2 ring-1 ring-violet-100">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-violet-800">
          Deck preview {slide.deckSlideCount ? `· ${slide.deckSlideCount} slides` : ''}
        </p>
        <PptxSlideViewer url={src} slideIndex={index} className="min-h-[240px] max-h-[360px]" />
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
      </div>
    )
  }

  if (slide.type === 'pdf') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white ring-1 ring-amber-100">
        <iframe title={slide.title ?? 'PDF preview'} src={`${src}#view=FitH`} className="h-[min(360px,50vh)] w-full" />
      </div>
    )
  }

  if (slide.type === 'video') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-sky-200 bg-black ring-1 ring-sky-100">
        <video src={src} controls playsInline className="max-h-[360px] w-full" />
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white ring-1 ring-slate-100">
      <img src={src} alt={slide.title ?? ''} className="max-h-[360px] w-full object-contain" />
    </div>
  )
}
