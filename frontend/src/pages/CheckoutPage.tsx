import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CreditCard } from 'lucide-react'
import { t } from '@/i18n/t'

/** Stripe Checkout placeholder — course slug via ?course= */
export function CheckoutPage() {
  const [sp] = useSearchParams()
  const course = sp.get('course') ?? ''

  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
          <CreditCard className="h-6 w-6" />
        </div>
        <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">{t('CheckoutPage_17_checkout_0b65b4487f')}</h1>
        <p className="mt-3 text-sm text-slate-600">{t('ui_checkout_stripe_body')}</p>
        {course ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-700">
            {t('ui_checkout_course_label', { slug: course })}
          </p>
        ) : null}
        <div className="card-elevated mt-8 space-y-4 p-6">
          <Button className="w-full" disabled>
            {t('ui_checkout_pay_stripe')}
          </Button>
          <Link to="/courses">
            <Button variant="secondary" className="w-full">
              {t('ui_checkout_back_catalog')}
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  )
}
