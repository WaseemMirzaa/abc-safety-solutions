import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CoursePriceDisplay } from '@/components/CoursePriceDisplay'
import { CreditCard, Tag } from 'lucide-react'
import { t } from '@/i18n/t'
import { useAuth } from '@/contexts/AuthContext'
import {
  createStripeCheckoutSession,
  fetchCourseBySlug,
  fetchMyEnrollments,
  fetchStripeConfig,
  purchaseCourse,
  purchaseDiscountedCourse,
  validatePromoCode,
  type PromoValidation,
} from '@/api/localData'
import { findEnrollment, hasCourseAccess } from '@/lib/courseAccess'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { computeCheckoutAmountCents, formatUsd } from '@/lib/pricing'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { useEffect, useMemo, useState } from 'react'

const viteStripe = import.meta.env.VITE_STRIPE_ENABLED === 'true'

export function CheckoutPage() {
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, ready } = useAuth()
  const courseSlug = sp.get('course')?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [promoInput, setPromoInput] = useState(sp.get('promo')?.trim().toUpperCase() ?? '')
  const [promoApplied, setPromoApplied] = useState<PromoValidation | null>(null)
  const [promoBusy, setPromoBusy] = useState(false)

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: qk.course(courseSlug),
    queryFn: () => fetchCourseBySlug(courseSlug),
    enabled: Boolean(courseSlug),
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: qk.enrollments,
    queryFn: fetchMyEnrollments,
    enabled: Boolean(user && courseSlug),
  })

  const { data: stripeConfig } = useQuery({
    queryKey: ['stripe', 'config'],
    queryFn: fetchStripeConfig,
    staleTime: 60_000,
  })

  const stripeEnabled = stripeConfig?.enabled ?? viteStripe
  const enrollment = course ? findEnrollment(enrollments, course.id) : undefined
  const alreadyPaid =
    enrollment?.hasAccess ?? (enrollment && course ? hasCourseAccess(enrollment, course) : false)

  const loginHref = `/login?redirect=${encodeURIComponent(`/checkout?course=${encodeURIComponent(courseSlug)}`)}`

  const finalCents = useMemo(() => {
    if (!course) return 0
    return computeCheckoutAmountCents(
      course,
      promoApplied?.valid ? promoApplied.discountPercent : 0,
    )
  }, [course, promoApplied])

  useEffect(() => {
    const fromUrl = sp.get('promo')?.trim()
    if (!fromUrl || !course || !user) return
    setPromoInput(fromUrl.toUpperCase())
    void (async () => {
      try {
        const v = await validatePromoCode(fromUrl, course.id)
        if (v.valid) setPromoApplied(v)
      } catch {
        /* ignore */
      }
    })()
  }, [sp, course?.id, user])

  async function applyPromo() {
    if (!course || !promoInput.trim()) return
    setPromoBusy(true)
    setErr(null)
    try {
      const v = await validatePromoCode(promoInput, course.id)
      setPromoApplied(v)
      if (!v.valid) setErr(v.message)
      else {
        setSp((prev) => {
          const next = new URLSearchParams(prev)
          next.set('promo', v.code)
          return next
        })
      }
    } catch (e) {
      setPromoApplied(null)
      setErr(e instanceof ApiError ? e.message : 'Could not validate promo code.')
    } finally {
      setPromoBusy(false)
    }
  }

  async function pay() {
    if (!user || !course) return
    if (alreadyPaid) {
      navigate(`/learn/${course.id}`)
      return
    }
    setErr(null)
    setBusy(true)
    try {
      if (course.priceCents > 0) {
        if (finalCents < 1) {
          await purchaseDiscountedCourse(course.id, promoApplied?.valid ? promoApplied.code : undefined)
          await qc.invalidateQueries({ queryKey: qk.enrollments })
          await qc.invalidateQueries({ queryKey: qk.myOrders })
          navigate('/my-courses')
          return
        }
        if (!stripeEnabled) {
          setErr(t('ui_checkout_stripe_fail'))
          return
        }
        const { url, freeEnroll } = await createStripeCheckoutSession(
          course.id,
          promoApplied?.valid ? promoApplied.code : undefined,
        )
        if (freeEnroll) {
          await purchaseDiscountedCourse(course.id, promoApplied?.valid ? promoApplied.code : undefined)
          await qc.invalidateQueries({ queryKey: qk.enrollments })
          navigate('/my-courses')
          return
        }
        if (url) window.location.href = url
        else setErr(t('ui_checkout_stripe_fail'))
      } else {
        await purchaseCourse(course.id)
        await qc.invalidateQueries({ queryKey: qk.enrollments })
        await qc.invalidateQueries({ queryKey: qk.myOrders })
        navigate('/my-courses')
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('ui_checkout_err')
      setErr(stripeEnabled ? msg : t('ui_checkout_err'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
          <CreditCard className="h-6 w-6" />
        </div>
        <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">{t('CheckoutPage_17_checkout_0b65b4487f')}</h1>
        <p className="mt-3 text-sm text-slate-600">{t('ui_checkout_stripe_body')}</p>
        {courseSlug ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-700">
            {t('ui_checkout_course_label', { slug: courseSlug })}
          </p>
        ) : (
          <p className="mt-4 text-sm text-amber-800">{t('ui_checkout_no_course')}</p>
        )}
        {!courseSlug ? null : courseLoading ? (
          <p className="mt-4 text-sm text-slate-600">{t('ui_checkout_busy')}</p>
        ) : !course ? (
          <p className="mt-4 text-sm text-red-600">{t('ui_checkout_err')}</p>
        ) : (
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-display text-lg font-semibold text-brand-900">{displayCourseTitle(course)}</p>
            <CoursePriceDisplay course={course} size="md" />
            {promoApplied?.valid ? (
              <p className="text-sm font-medium text-emerald-800">
                {t('ui_checkout_promo_applied', {
                  code: promoApplied.code,
                  percent: promoApplied.discountPercent,
                  defaultValue: 'Promo {{code}}: extra {{percent}}% off',
                })}
              </p>
            ) : null}
            {course.priceCents > 0 ? (
              <p className="border-t border-slate-100 pt-3 font-display text-2xl font-bold text-brand-900">
                {t('ui_checkout_total', { defaultValue: 'Total' })}: {formatUsd(finalCents)}
              </p>
            ) : null}
          </div>
        )}
        <div className="card-elevated mt-8 space-y-4 p-6">
          {course && course.priceCents > 0 && !alreadyPaid ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Tag className="h-4 w-4" />
                {t('ui_checkout_promo_label', { defaultValue: 'Promo code' })}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  className="input-pro min-w-0 flex-1 font-mono uppercase"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                />
                <Button type="button" variant="secondary" disabled={promoBusy} onClick={() => void applyPromo()}>
                  {promoBusy ? '…' : t('ui_checkout_promo_apply', { defaultValue: 'Apply' })}
                </Button>
              </div>
            </div>
          ) : null}
          {course && course.priceCents > 0 && !alreadyPaid ? (
            <p className="text-xs text-slate-600">
              {stripeEnabled
                ? 'Stripe Checkout opens when you click Purchase below. Course access is granted only after payment succeeds.'
                : t('ui_checkout_stripe_fail')}
            </p>
          ) : null}
          {alreadyPaid ? (
            <p className="text-xs text-emerald-800">Payment complete — you can open the course.</p>
          ) : null}
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          {!ready ? null : !user ? (
            <>
              <p className="text-sm text-slate-600">{t('ui_checkout_need_login')}</p>
              <Link to={loginHref}>
                <Button className="w-full">{t('ui_checkout_go_signin')}</Button>
              </Link>
            </>
          ) : courseSlug && course ? (
            <>
              <Button className="w-full" disabled={busy} onClick={() => void pay()}>
                {busy
                  ? t('ui_checkout_busy')
                  : alreadyPaid
                    ? t('CourseDetailPage_134_continue_to_course_6b6b6ed6e8')
                    : course.priceCents > 0 && finalCents < 1
                      ? t('ui_checkout_enroll_btn')
                      : course.priceCents > 0
                        ? t('ui_checkout_pay_stripe')
                        : t('ui_checkout_enroll_btn')}
              </Button>
            </>
          ) : null}
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
