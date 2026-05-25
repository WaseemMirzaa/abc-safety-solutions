import { ChevronLeft, ChevronRight, Loader2, Presentation } from 'lucide-react'
import { Button } from '@/components/Button'
import { t } from '@/i18n/t'

type Props = {
  slideIndex: number
  totalSlides: number
  courseProgressPct: number
  pptxNavLocked: boolean
  isLastSlide: boolean
  canGoNext: boolean
  dwellHint?: string
  dwellPct?: number
  customTestReady: boolean
  canTakeKnowledgeCheck: boolean
  contentComplete: boolean
  showRetakeHint: boolean
  onPrev: () => void
  onNext: () => void
  onOpenTest: () => void
}

export function LearnSlideFooter({
  slideIndex,
  totalSlides,
  courseProgressPct,
  pptxNavLocked,
  isLastSlide,
  canGoNext,
  dwellHint,
  dwellPct,
  customTestReady,
  canTakeKnowledgeCheck,
  contentComplete,
  showRetakeHint,
  onPrev,
  onNext,
  onOpenTest,
}: Props) {
  const slideNum = Math.min(slideIndex + 1, totalSlides)

  let statusMessage = t('LearnPage_389_complete_all_slides_to_unlock_the_test_0825f886f3')
  if (pptxNavLocked) {
    statusMessage = t('ui_learn_slides_loading', { defaultValue: 'Loading presentation…' })
  } else if (showRetakeHint) {
    statusMessage = t('ui_learn_retake_slides_hint', {
      defaultValue: 'Review all slides again from the start to unlock the knowledge check.',
    })
  } else if (isLastSlide && contentComplete && customTestReady) {
    statusMessage = t('ui_learn_ready_for_test', {
      defaultValue: 'You have reached the end. Take the knowledge check when you are ready.',
    })
  } else if (isLastSlide && !customTestReady) {
    statusMessage = t('ui_learn_no_test_configured', {
      defaultValue: 'Knowledge check is not set up for this course yet.',
    })
  }

  return (
    <div className="shrink-0 border-t border-slate-200/90 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <Button
          variant="secondary"
          className="!rounded-xl !px-3"
          disabled={slideIndex <= 0 || pptxNavLocked}
          onClick={onPrev}
          aria-label={t('ui_learn_previous')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('ui_learn_previous')}</span>
        </Button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            {pptxNavLocked ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600" aria-hidden />
            ) : (
              <Presentation className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
            )}
            <span className="tabular-nums">
              {t('ui_learn_slide_counter', {
                current: slideNum,
                total: totalSlides,
                defaultValue: 'Slide {{current}} of {{total}}',
              })}
              <span className="text-slate-500"> · </span>
              <span className="text-sky-800">
                {t('ui_learn_course_progress_pct', {
                  pct: courseProgressPct,
                  defaultValue: '{{pct}}% complete',
                })}
              </span>
            </span>
          </div>
          <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-300"
              style={{ width: `${courseProgressPct}%` }}
              role="progressbar"
              aria-valuenow={courseProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('ui_learn_course_progress_pct', {
                pct: courseProgressPct,
                defaultValue: '{{pct}}% complete',
              })}
            />
          </div>
          {dwellPct !== undefined ? (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${dwellPct}%` }}
                role="progressbar"
                aria-valuenow={dwellPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('ui_learn_dwell_timer', { defaultValue: 'Reading timer' })}
              />
            </div>
          ) : null}
        </div>

        <Button
          variant="secondary"
          className="!rounded-xl !px-3"
          disabled={isLastSlide || pptxNavLocked || !canGoNext}
          onClick={onNext}
          aria-label={t('ui_learn_next')}
        >
          <span className="hidden sm:inline">{t('ui_learn_next')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-center text-sm text-slate-600 sm:text-left">
          {dwellHint && !canGoNext && !isLastSlide ? dwellHint : statusMessage}
        </p>
        {isLastSlide && customTestReady ? (
          <Button
            className="!rounded-xl sm:shrink-0"
            disabled={!canTakeKnowledgeCheck}
            onClick={onOpenTest}
          >
            {t('ui_learn_take_knowledge_check')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
