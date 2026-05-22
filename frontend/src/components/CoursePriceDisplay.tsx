import { clsx } from 'clsx'
import type { Course } from '@/types'
import { courseSalePriceCents, formatUsd, hasCourseSale } from '@/lib/pricing'
import { t } from '@/i18n/t'

type Props = {
  course: Pick<Course, 'priceCents' | 'discountPercent'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: { price: 'text-lg', was: 'text-xs', badge: 'text-[10px] px-1.5 py-0.5' },
  md: { price: 'text-xl', was: 'text-sm', badge: 'text-[10px] px-2 py-0.5' },
  lg: { price: 'text-4xl sm:text-[2.75rem]', was: 'text-lg', badge: 'text-xs px-2.5 py-1' },
}

export function CoursePriceDisplay({ course, size = 'md', className }: Props) {
  const onSale = hasCourseSale(course)
  const sale = courseSalePriceCents(course)
  const s = sizeClass[size]

  if (course.priceCents < 1) {
    return (
      <p className={clsx('font-display font-bold text-emerald-700', s.price, className)}>
        {t('ui_price_free', { defaultValue: 'Free' })}
      </p>
    )
  }

  return (
    <div className={clsx('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      <p className={clsx('font-display font-bold tracking-tight text-brand-900', s.price)}>
        {formatUsd(onSale ? sale : course.priceCents)}
      </p>
      {onSale ? (
        <>
          <p className={clsx('font-medium text-slate-400 line-through', s.was)}>{formatUsd(course.priceCents)}</p>
          <span
            className={clsx(
              'inline-flex rounded-full bg-emerald-500/15 font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-500/25',
              s.badge,
            )}
          >
            {t('ui_price_save_percent', {
              percent: course.discountPercent ?? 0,
              defaultValue: 'Save {{percent}}%',
            })}
          </span>
        </>
      ) : null}
    </div>
  )
}
