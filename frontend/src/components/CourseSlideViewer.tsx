import { useEffect } from 'react'
import { FileText, Presentation } from 'lucide-react'
import type { CourseSlide } from '@/types'
import { PptxSlideViewer } from '@/components/PptxSlideViewer'
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
  className = '',
}: Props) {
  const src = slide ? resolveMediaUrl(slide.url) : ''

  useEffect(() => {
    if (slide?.type === 'pptx') {
      prefetchPptxBuffer(slide.url)
      return
    }
    onPptxReadyChange?.(true)
  }, [slide?.url, slide?.type, onPptxReadyChange])

  return (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden ${className}`}
    >
      <p className="pointer-events-none absolute left-2 top-2 z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:left-3 sm:top-3 sm:text-xs">
        {t('ui_learn_slide_progress', { n: slideNum, total: totalSlides })}
      </p>

      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center p-8 pt-10 pb-9 sm:p-10 sm:pt-11 sm:pb-10">
        {!slide ? (
          <div className="max-w-xl px-2 text-center">
            <p className="font-display text-lg font-medium leading-snug text-brand-900 sm:text-xl">
              {t('ui_learn_voice_placeholder', { n: slideNum })}
            </p>
            <p className="mt-3 text-xs text-slate-600">{t('ui_learn_upload_hint')}</p>
          </div>
        ) : slide.type === 'pdf' ? (
          <iframe
            title={slide.title ?? `Slide ${slideNum} PDF`}
            src={`${src}#view=FitH&toolbar=1`}
            className="h-full w-full min-h-0 rounded-lg bg-white ring-1 ring-slate-200/60"
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
        ) : slide.type === 'pptx' ? (
          <PptxSlideViewer
            url={slide.url}
            slideIndex={pptxSlideIndex}
            className="h-full w-full min-h-0"
            onReadyChange={onPptxReadyChange}
          />
        ) : slide.type === 'video' ? (
          <VideoSlidePlayer
            src={src}
            title={slide.title}
            initialMaxTimeSec={videoResumeTimeSec}
            onProgress={onVideoProgress}
            onComplete={(watchedSec, durationSec) => onVideoEnded?.(watchedSec, durationSec)}
          />
        ) : (
          <img
            src={src}
            alt={slide.title ?? ''}
            className="max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-slate-200/80"
          />
        )}
      </div>

      {slide?.type === 'pdf' ? (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          {t('ui_learn_pdf_hint')}
        </p>
      ) : null}
      {slide?.type === 'pptx' ? (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:text-xs">
          <Presentation className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden />
          {t('ui_learn_pptx_hint', { defaultValue: 'Use Previous / Next to move through the presentation.' })}
        </p>
      ) : null}
    </div>
  )
}
