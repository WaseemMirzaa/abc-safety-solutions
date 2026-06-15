import { useEffect, useLayoutEffect } from 'react'
import { FileText } from 'lucide-react'
import type { CourseSlide } from '@/types'
import { PptxSlideViewer } from '@/components/PptxSlideViewer'
import { SlideImageViewer } from '@/components/SlideImageViewer'
import { LearnSlideChrome } from '@/components/learn/LearnSlideChrome'
import { VideoSlidePlayer } from '@/components/learn/VideoSlidePlayer'
import { prefetchPptxBuffer } from '@/lib/pptxDeckCache'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  slide: CourseSlide | undefined
  slideNum: number
  totalSlides: number
  /** 0-based index inside a .pptx deck (Learn page prev/next). */
  pptxSlideIndex?: number
  /** Fired when the learner has watched the full training video. */
  onVideoEnded?: (watchedSec: number, durationSec: number) => void
  /** Saved watch position for video courses (seconds). */
  videoResumeTimeSec?: number
  onVideoProgress?: (maxTimeSec: number, durationSec: number) => void
  /** True when a .pptx deck has finished loading. */
  onPptxReadyChange?: (ready: boolean) => void
  onPptxSlideCount?: (count: number) => void
  onPptxSlideAspect?: (aspect: number) => void
  /** Learn page: full-bleed deck, chrome overlay, no duplicate hints. */
  learnDeck?: boolean
  /** Learn page: media fills the frame (video/PDF/PPTX); no slide counter on video. */
  learnMode?: boolean
  pptxLoading?: boolean
  className?: string
}

/** Renders image, PDF, PowerPoint (.pptx), or video inside a fitted 16:9 stage. */
export function CourseSlideViewer({
  slide,
  slideNum,
  totalSlides,
  pptxSlideIndex = 0,
  onVideoEnded,
  videoResumeTimeSec = 0,
  onVideoProgress,
  onPptxReadyChange,
  onPptxSlideCount,
  onPptxSlideAspect,
  learnDeck = false,
  learnMode = false,
  pptxLoading = false,
  className = '',
}: Props) {
  const src = slide ? resolveMediaUrl(slide.url) : ''
  const slideType = slide?.type
  const isVideo = slideType === 'video'
  const isPdf = slideType === 'pdf'
  const isPptx = slideType === 'pptx'
  const isPresentationSlide = isPptx || isPdf
  const isDeckLearn = learnDeck && isPresentationSlide
  const contentFullBleed = learnMode && (isVideo || isPresentationSlide || slideType === 'image')
  const showSlideLabel = !isVideo && !(learnMode && isPresentationSlide)

  // When server-side rendered images are available use them directly (fastest path).
  const renderedImages = (() => {
    const urls = slide?.renderedSlideUrls?.filter(Boolean) ?? []
    return urls.length > 0 ? urls : null
  })()

  useLayoutEffect(() => {
    if (renderedImages?.length) {
      onPptxSlideCount?.(renderedImages.length)
    }
  }, [renderedImages, onPptxSlideCount])

  useEffect(() => {
    // Only prefetch PPTX buffer when there are no rendered images (fallback path)
    if (slide?.type === 'pptx' && !renderedImages) {
      prefetchPptxBuffer(slide.url)
      return
    }
    if (slide?.type !== 'pptx') {
      onPptxReadyChange?.(true)
    }
  }, [slide?.url, slide?.type, renderedImages, onPptxReadyChange])

  return (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden ${className}`}
    >
      {isDeckLearn ? (
        <LearnSlideChrome slideNum={slideNum} totalSlides={totalSlides} loading={pptxLoading} />
      ) : showSlideLabel ? (
        <p className="pointer-events-none absolute left-2 top-2 z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:left-3 sm:top-3 sm:text-xs">
          {t('ui_learn_slide_progress', { n: slideNum, total: totalSlides })}
        </p>
      ) : null}

      <div
        className={`flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden ${
          isDeckLearn
            ? 'min-h-0 bg-slate-900/5 p-1 pt-12 pb-1'
            : contentFullBleed
              ? 'min-h-0 p-0'
              : isPresentationSlide
                ? 'min-h-0 p-2 pt-9 pb-8 sm:p-3 sm:pt-10 sm:pb-9'
                : 'p-8 pt-10 pb-9 sm:p-10 sm:pt-11 sm:pb-10'
        }`}
      >
        {!slide ? (
          <div className="max-w-xl px-2 text-center">
            <p className="font-display text-lg font-medium leading-snug text-brand-900 sm:text-xl">
              {t('ui_learn_voice_placeholder', { n: slideNum })}
            </p>
            <p className="mt-3 text-xs text-slate-600">{t('ui_learn_upload_hint')}</p>
          </div>
        ) : slide.type === 'pdf' && !renderedImages ? (
          <iframe
            title={slide.title ?? `Slide ${slideNum} PDF`}
            src={`${src}#view=FitH&toolbar=1`}
            className={
              contentFullBleed
                ? 'h-full w-full min-h-0 border-0 bg-white'
                : 'h-full w-full min-h-0 rounded-lg bg-white ring-1 ring-slate-200/60'
            }
          />
        ) : slide.type === 'ppt' ? (
          <div className="max-w-lg px-4 text-center">
            <p className="font-display text-lg font-semibold text-brand-900">
              {t('ui_learn_ppt_legacy_title', { defaultValue: 'Legacy .ppt file' })}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              {t('ui_learn_ppt_legacy_body', {
                defaultValue: 'Re-upload this course as .pptx in Admin → Courses for slide playback.',
              })}
            </p>
          </div>
        ) : isPresentationSlide && renderedImages ? (
          <SlideImageViewer
            slideImages={renderedImages}
            slideIndex={pptxSlideIndex}
            className="h-full w-full min-h-0"
            onReadyChange={onPptxReadyChange}
            onSlideCount={onPptxSlideCount}
          />
        ) : slide.type === 'pptx' ? (
          <PptxSlideViewer
            url={slide.url}
            slideIndex={pptxSlideIndex}
            className="h-full w-full min-h-0"
            learnMode={learnMode || learnDeck}
            onReadyChange={onPptxReadyChange}
            onSlideCount={onPptxSlideCount}
            onSlideAspect={onPptxSlideAspect}
          />
        ) : slide.type === 'video' ? (
          <VideoSlidePlayer
            src={src}
            title={slide.title}
            initialMaxTimeSec={videoResumeTimeSec}
            onProgress={onVideoProgress}
            onComplete={(watchedSec, durationSec) => onVideoEnded?.(watchedSec, durationSec)}
            frameOnly={learnMode}
          />
        ) : (
          <img
            src={src}
            alt={slide.title ?? ''}
            className={
              contentFullBleed
                ? 'h-full w-full min-h-0 object-contain'
                : 'max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-slate-200/80'
            }
          />
        )}
      </div>

      {slide?.type === 'pdf' && !contentFullBleed && !renderedImages ? (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          {t('ui_learn_pdf_hint')}
        </p>
      ) : null}
    </div>
  )
}
