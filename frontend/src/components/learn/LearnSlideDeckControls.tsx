import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { t } from '@/i18n/t'

type Props = {
  canPrev: boolean
  canNext: boolean
  disabled?: boolean
  onPrev: () => void
  onNext: () => void
  onFullscreen: () => void
}

const btnClass =
  'flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-slate-900/75 disabled:pointer-events-none disabled:opacity-40'

export function LearnSlideDeckControls({
  canPrev,
  canNext,
  disabled = false,
  onPrev,
  onNext,
  onFullscreen,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-3 pb-3 pt-8">
      <button
        type="button"
        className={`${btnClass} pointer-events-auto`}
        disabled={disabled || !canPrev}
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
        aria-label={t('ui_learn_previous')}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        className={`${btnClass} pointer-events-auto`}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          onFullscreen()
        }}
        aria-label={t('ui_learn_fullscreen', { defaultValue: 'Fullscreen slide preview' })}
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={`${btnClass} pointer-events-auto`}
        disabled={disabled || !canNext}
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        aria-label={t('ui_learn_next')}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
