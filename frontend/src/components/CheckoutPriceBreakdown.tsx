import type { Course } from '@/types'
import {
  computeCheckoutAmountCents,
  courseSalePriceCents,
  formatUsd,
  hasCourseSale,
  normalizedCoursePricing,
} from '@/lib/pricing'
import type { PromoValidation } from '@/api/localData'
import { t } from '@/i18n/t'

type Props = {
  course: Course
  promoApplied?: PromoValidation | null
  className?: string
}

export function CheckoutPriceBreakdown({ course, promoApplied, className = '' }: Props) {
  const { listPriceCents, salePriceCents } = normalizedCoursePricing(course)
  const afterCourse = courseSalePriceCents(course)
  const promoPct = promoApplied?.valid ? promoApplied.discountPercent : 0
  const total = computeCheckoutAmountCents(course, promoPct)
  const onSale = hasCourseSale(course)

  if (listPriceCents < 1) return null

  return (
    <div className={`space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm ${className}`}>
      <div className="flex justify-between gap-3 text-slate-600">
        <span>{t('ui_checkout_line_list', { defaultValue: 'List price' })}</span>
        <span className={onSale ? 'line-through' : 'font-medium text-brand-900'}>{formatUsd(listPriceCents)}</span>
      </div>
      {onSale ? (
        <div className="flex justify-between gap-3 text-emerald-800">
          <span>{t('ui_checkout_line_sale', { defaultValue: 'Course sale price' })}</span>
          <span className="font-semibold">{formatUsd(salePriceCents)}</span>
        </div>
      ) : null}
      {promoApplied?.valid && promoPct > 0 ? (
        <div className="flex justify-between gap-3 text-emerald-800">
          <span>
            {t('ui_checkout_promo_applied', {
              code: promoApplied.code,
              percent: promoPct,
              defaultValue: 'Promo {{code}}: extra {{percent}}% off',
            })}
          </span>
          <span className="font-medium">−{promoPct}%</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-display text-lg font-bold text-brand-900">
        <span>{t('ui_checkout_total', { defaultValue: 'Total' })}</span>
        <span>{formatUsd(total)}</span>
      </div>
      {afterCourse < listPriceCents && total < listPriceCents ? (
        <p className="text-xs font-medium text-emerald-700">
          {t('ui_checkout_you_save', {
            amount: formatUsd(listPriceCents - total),
            defaultValue: 'You save {{amount}}',
          })}
        </p>
      ) : null}
    </div>
  )
}
