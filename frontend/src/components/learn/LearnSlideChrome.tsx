import { Presentation } from 'lucide-react'
import { t } from '@/i18n/t'

type Props = {
  slideNum: number
  totalSlides: number
  loading?: boolean
}

/** Top overlay for learn slide / deck player. */
export function LearnSlideChrome({ slideNum, totalSlides, loading = false }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-3">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 backdrop-blur-sm ${
          loading
            ? 'bg-sky-50/95 text-sky-900 ring-sky-200/80'
            : 'bg-white/95 text-brand-900 ring-slate-200/90'
        }`}
      >
        <Presentation className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
        <span
          key={`slide-badge-${slideNum}-${totalSlides}-${loading ? 'load' : 'ready'}`}
          className="uppercase tracking-[0.14em] text-[10px] text-sky-800 sm:text-[11px]"
        >
          {loading
            ? t('ui_learn_slides_loading_short', { defaultValue: 'Loading…' })
            : t('ui_learn_slide_progress', { n: slideNum, total: totalSlides })}
        </span>
      </div>
    </div>
  )
}
