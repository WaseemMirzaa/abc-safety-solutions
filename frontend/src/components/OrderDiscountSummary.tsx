import { formatUsd } from '@/lib/pricing'
import { t } from '@/i18n/t'

type Props = {
  listPriceCents: number
  amountCents: number
  courseDiscountPercent: number
  promoCode: string | null
  promoDiscountPercent: number
  compact?: boolean
}

export function OrderDiscountSummary({
  listPriceCents,
  amountCents,
  courseDiscountPercent,
  promoCode,
  promoDiscountPercent,
  compact = false,
}: Props) {
  const saved = listPriceCents - amountCents
  if (listPriceCents < 1 || saved < 1) return null

  return (
    <div className={compact ? 'text-xs text-slate-600' : 'mt-3 space-y-1 text-sm text-slate-600'}>
      <p>
        <span className="text-slate-500">{t('ui_order_list_price', { defaultValue: 'List price' })}:</span>{' '}
        <span className="line-through">{formatUsd(listPriceCents)}</span>
      </p>
      {courseDiscountPercent > 0 ? (
        <p>
          {t('ui_order_course_discount', {
            percent: courseDiscountPercent,
            defaultValue: 'Course sale: {{percent}}% off',
          })}
        </p>
      ) : null}
      {promoCode && promoDiscountPercent > 0 ? (
        <p>
          {t('ui_order_promo_applied', {
            code: promoCode,
            percent: promoDiscountPercent,
            defaultValue: 'Promo {{code}}: {{percent}}% off',
          })}
        </p>
      ) : null}
      <p className="font-semibold text-emerald-800">
        {t('ui_order_you_paid', { defaultValue: 'Paid' })}: {formatUsd(amountCents)}
        {saved > 0 ? (
          <span className="ml-1 font-normal text-slate-500">
            ({t('ui_order_saved', { amount: formatUsd(saved), defaultValue: 'saved {{amount}}' })})
          </span>
        ) : null}
      </p>
    </div>
  )
}
