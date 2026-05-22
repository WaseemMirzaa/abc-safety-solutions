import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CreditCard } from 'lucide-react'
import { t } from '@/i18n/t'
import { useAuth } from '@/contexts/AuthContext'
import {
  createStripeCheckoutSession,
  fetchCourseBySlug,
  fetchMyEnrollments,
  fetchStripeConfig,
  purchaseCourse,
} from '@/api/localData'
import { findEnrollment, hasCourseAccess } from '@/lib/courseAccess'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { useState } from 'react'

const viteStripe = import.meta.env.VITE_STRIPE_ENABLED === 'true'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function CheckoutPage() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, ready } = useAuth()
  const courseSlug = sp.get('course')?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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
        if (!stripeEnabled) {
          setErr(t('ui_checkout_stripe_fail'))
          return
        }
        const { url } = await createStripeCheckoutSession(course.id)
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
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-display text-lg font-semibold text-brand-900">{displayCourseTitle(course)}</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-900">{formatPrice(course.priceCents)}</p>
          </div>
        )}
        <div className="card-elevated mt-8 space-y-4 p-6">
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
