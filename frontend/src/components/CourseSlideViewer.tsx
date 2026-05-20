import { FileText, Film } from 'lucide-react'
import type { CourseSlide } from '@/types'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { t } from '@/i18n/t'

type Props = {
  slide: CourseSlide | undefined
  slideNum: number
  totalSlides: number
  className?: string
}

/** Renders image, PDF (browser-native, supports embedded video/images), or video. */
export function CourseSlideViewer({ slide, slideNum, totalSlides, className = '' }: Props) {
  const src = slide ? resolveMediaUrl(slide.url) : ''

  return (
    <div className={`relative flex h-full w-full max-h-full flex-col items-center justify-center ${className}`}>
      <p className="absolute left-3 top-3 z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:left-4 sm:top-4 sm:text-xs">
        {t('ui_learn_slide_progress', { n: slideNum, total: totalSlides })}
        {slide?.title ? (
          <span className="mt-1 block font-normal normal-case tracking-normal text-slate-600">{slide.title}</span>
        ) : null}
      </p>

      {!slide ? (
        <>
          <p className="mt-10 max-w-xl px-4 font-display text-xl font-medium leading-snug text-brand-900 sm:text-2xl">
            {t('ui_learn_voice_placeholder', { n: slideNum })}
          </p>
          <p className="mt-5 text-xs text-slate-600">{t('ui_learn_upload_hint')}</p>
        </>
      ) : slide.type === 'pdf' ? (
        <iframe
          title={slide.title ?? `Slide ${slideNum} PDF`}
          src={`${src}#view=FitH&toolbar=1`}
          className="h-full min-h-[min(70vh,520px)] w-full rounded-xl bg-white shadow-md ring-1 ring-slate-200/80"
        />
      ) : slide.type === 'video' ? (
        <video
          key={src}
          src={src}
          controls
          playsInline
          className="max-h-full max-w-full rounded-xl object-contain shadow-md ring-1 ring-slate-200/80"
        >
          <track kind="captions" />
        </video>
      ) : (
        <img
          src={src}
          alt={slide.title ?? ''}
          className="max-h-full max-w-full rounded-xl object-contain shadow-md ring-1 ring-slate-200/80"
        />
      )}

      {slide?.type === 'pdf' ? (
        <p className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          {t('ui_learn_pdf_hint')}
        </p>
      ) : null}
      {slide?.type === 'video' ? (
        <p className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80">
          <Film className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
          {t('ui_learn_video_hint')}
        </p>
      ) : null}
    </div>
  )
}
