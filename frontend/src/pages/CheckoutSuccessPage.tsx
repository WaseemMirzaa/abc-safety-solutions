import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { completeStripeCheckout, fetchCategories, type CheckoutConfirmation } from '@/api/localData'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { findCategory } from '@/data/catalog'
import {
  displayCategoryName,
  displayCourseDescription,
  displayCourseImageUrl,
  displayCourseSummary,
  displayCourseTitle,
} from '@/lib/courseDisplay'
import { t } from '@/i18n/t'

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.length === 3 ? currency : 'USD',
  }).format(cents / 100)
}

export function CheckoutSuccessPage() {
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const sessionId = sp.get('session_id')?.trim() ?? ''
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [confirmation, setConfirmation] = useState<CheckoutConfirmation | null>(null)

  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    enabled: Boolean(confirmation?.course.categoryId),
  })

  useEffect(() => {
    if (!sessionId) {
      setErr(t('ui_checkout_success_missing', { defaultValue: 'Missing payment session.' }))
      setBusy(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await completeStripeCheckout(sessionId)
        if (cancelled) return
        setConfirmation(result)
        await qc.invalidateQueries({ queryKey: qk.enrollments })
        await qc.invalidateQueries({ queryKey: qk.myOrders })
        await qc.invalidateQueries({ queryKey: qk.courses })
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('ui_checkout_err'))
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, qc])

  const course = confirmation?.course
  const cat = course ? findCategory(categoryList, course.categoryId) : undefined

  return (
    <div className="py-12 sm:py-20">
      <Container className="max-w-2xl">
        {busy ? (
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-brand-900">
              {t('ui_checkout_success_title', { defaultValue: 'Payment received' })}
            </h1>
            <p className="mt-4 text-sm text-slate-600">
              {t('ui_checkout_success_busy', { defaultValue: 'Activating your course access…' })}
            </p>
          </div>
        ) : err ? (
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-brand-900">
              {t('ui_checkout_success_title', { defaultValue: 'Payment received' })}
            </h1>
            <p className="mt-4 text-sm text-red-600">{err}</p>
            <Link to="/my-courses" className="mt-8 inline-block">
              <Button variant="secondary">{t('ui_learn_back_my_courses')}</Button>
            </Link>
          </div>
        ) : confirmation && course ? (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold text-brand-900">
                {t('ui_order_confirmed_title', { defaultValue: 'Order confirmed' })}
              </h1>
              <p className="mt-2 text-slate-600">
                {t('ui_order_confirmed_sub', {
                  defaultValue: 'Thank you. Your payment was successful and your course is ready.',
                })}
              </p>
            </div>

            <div className="card-elevated overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('ui_order_confirmation_heading', { defaultValue: 'Order confirmation' })}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {new Date(confirmation.order.purchasedAt).toLocaleString()} ·{' '}
                  {confirmation.order.orderId.slice(0, 24)}…
                </p>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,200px)_1fr]">
                <img
                  src={displayCourseImageUrl(course) || course.imageUrl}
                  alt=""
                  className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-slate-200/80"
                />
                <div>
                  {cat ? (
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                      {displayCategoryName(cat)}
                    </p>
                  ) : null}
                  <h2 className="mt-1 font-display text-2xl font-bold text-brand-900">
                    {displayCourseTitle(course)}
                  </h2>
                  {displayCourseSummary(course) ? (
                    <p className="mt-2 text-sm font-medium text-slate-700">{displayCourseSummary(course)}</p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-4">
                    {displayCourseDescription(course)}
                  </p>
                  <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Amount paid</dt>
                      <dd className="mt-1 font-display text-xl font-bold text-brand-900">
                        {formatPrice(confirmation.order.amountCents, confirmation.order.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</dt>
                      <dd className="mt-1 font-semibold text-emerald-700">Paid · Access granted</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {confirmation.billing.receiptUrl ||
              confirmation.billing.invoiceUrl ||
              confirmation.billing.invoicePdf ? (
                <div className="border-t border-slate-100 bg-white px-6 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stripe documents</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {confirmation.billing.receiptUrl ? (
                      <a
                        href={confirmation.billing.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Payment receipt
                      </a>
                    ) : null}
                    {confirmation.billing.invoiceUrl ? (
                      <a
                        href={confirmation.billing.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" />
                        View invoice
                      </a>
                    ) : null}
                    {confirmation.billing.invoicePdf ? (
                      <a
                        href={confirmation.billing.invoicePdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" />
                        Invoice PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to={`/learn/${course.id}`}>
                <Button className="w-full sm:w-auto">
                  {t('CourseDetailPage_134_continue_to_course_6b6b6ed6e8')}
                </Button>
              </Link>
              <Link to="/my-courses">
                <Button variant="secondary" className="w-full sm:w-auto">
                  {t('ui_learn_back_my_courses')}
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Container>
    </div>
  )
}
