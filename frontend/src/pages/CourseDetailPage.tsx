import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CourseDetailSkeleton } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { easeOut } from '@/lib/motionPresets'
import {
  createStripeCheckoutSession,
  fetchCategories,
  fetchCourseBySlug,
  fetchMyEnrollments,
  fetchStripeConfig,
  purchaseDiscountedCourse,
} from '@/api/localData'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/contexts/AuthContext'
import { findCategory } from '@/data/catalog'
import {
  displayCategoryName,
  displayCourseDescription,
  displayCourseImageUrl,
  displayCourseSummary,
  displayCourseTitle,
  displaySlidesLabel,
} from '@/lib/courseDisplay'
import { findEnrollment, hasCourseAccess } from '@/lib/courseAccess'
import { courseSalePriceCents } from '@/lib/pricing'
import { CoursePriceDisplay } from '@/components/CoursePriceDisplay'
import { t } from '@/i18n/t'
import type { Course } from '@/types'

import { formatCourseDuration } from '@/lib/courseContent'

function formatHours(minutes: number) {
  return formatCourseDuration(minutes)
}

function purchaseCtaLabel(course: Course, busy: boolean) {
  if (busy) return t('ui_checkout_busy')
  if (course.priceCents > 0) return t('ui_course_detail_cta_purchase')
  return t('ui_course_detail_cta_free')
}

type PurchasePanelProps = {
  course: Course
  hasAccess: boolean
  user: ReturnType<typeof useAuth>['user']
  enrollBusy: boolean
  enrollErr: string | null
  loginHref: string
  onPurchase: () => void
  compact?: boolean
}

function PurchasePanel({
  course,
  hasAccess,
  user,
  enrollBusy,
  enrollErr,
  loginHref,
  onPurchase,
  compact = false,
}: PurchasePanelProps) {
  return (
    <div
      className={
        compact
          ? 'flex w-full items-center gap-3'
          : 'card-elevated overflow-hidden ring-1 ring-amber-500/10'
      }
    >
      {!compact ? (
        <div className="bg-gradient-to-br from-amber-50/90 via-white to-sky-50/50 px-6 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('CourseDetailPage_121_your_investment_10257b1552')}
          </p>
          <CoursePriceDisplay course={course} size="lg" className="mt-1" />
          <p className="mt-2 text-sm font-medium text-slate-600">
            {t('ui_course_detail_price_onetime')}
          </p>
        </div>
      ) : (
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t('CourseDetailPage_121_your_investment_10257b1552')}
          </p>
          <CoursePriceDisplay course={course} size="sm" />
        </div>
      )}

      <div className={compact ? 'min-w-0 flex-1' : 'px-6 pb-6 pt-2 sm:px-8 sm:pb-8'}>
        {!compact ? (
          <p className="text-sm leading-relaxed text-slate-600">{t('ui_course_detail_cta_subline')}</p>
        ) : null}
        {enrollErr ? <p className="mt-3 text-sm text-red-600">{enrollErr}</p> : null}
        <div className={compact ? 'mt-0' : 'mt-5'}>
          {hasAccess ? (
            <Link to={`/learn/${course.id}`} className="block">
              <Button className="w-full !py-3.5 !text-base shadow-lg shadow-amber-900/20">
                {t('CourseDetailPage_134_continue_to_course_6b6b6ed6e8')}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          ) : user ? (
            <Button
              className="w-full !py-3.5 !text-base shadow-lg shadow-amber-900/20"
              disabled={enrollBusy}
              onClick={() => void onPurchase()}
            >
              {purchaseCtaLabel(course, enrollBusy)}
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Link to={loginHref} className="block">
              <Button className="w-full !py-3.5 !text-base shadow-lg shadow-amber-900/20">
                {t('ui_course_signin_enroll')}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
        {!hasAccess && !compact ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {t('ui_course_detail_secure_line')}
          </p>
        ) : null}
        {!compact ? (
          <Link
            to="/courses"
            className="mt-5 block text-center text-sm font-medium text-slate-500 transition hover:text-brand-800"
          >
            {t('ui_course_detail_back_link')}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [enrollBusy, setEnrollBusy] = useState(false)
  const [enrollErr, setEnrollErr] = useState<string | null>(null)

  const { data: course, isLoading } = useQuery({
    queryKey: qk.course(slug),
    queryFn: () => fetchCourseBySlug(slug),
    enabled: Boolean(slug),
  })

  const { data: stripeConfig } = useQuery({
    queryKey: ['stripe', 'config'],
    queryFn: fetchStripeConfig,
    staleTime: 60_000,
  })
  const stripeEnabled = stripeConfig?.enabled === true

  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const { data: enrollments = [] } = useQuery({
    queryKey: qk.enrollments,
    queryFn: fetchMyEnrollments,
    enabled: Boolean(user),
  })

  const enrollment = course ? findEnrollment(enrollments, course.id) : undefined
  const hasAccess =
    enrollment?.hasAccess ?? (enrollment && course ? hasCourseAccess(enrollment, course) : false)

  const includedItems = useMemo(() => {
    if (!course) return []
    const items: { icon: typeof Clock; text: string }[] = [
      { icon: Clock, text: formatHours(course.durationMinutes) },
      { icon: Layers, text: displaySlidesLabel(course) },
      { icon: CheckCircle2, text: t('ui_course_knowledge_cert') },
    ]
    if (course.certificateValidityDays != null && course.certificateValidityDays > 0) {
      items.push({
        icon: Award,
        text: t('ui_course_cert_validity_days', {
          days: course.certificateValidityDays,
          defaultValue: `Completion certificate expires ${course.certificateValidityDays} days after it is issued.`,
        }),
      })
    }
    return items
  }, [course])

  const howItWorks = useMemo(
    () => [
      {
        step: '1',
        title: t('ui_course_detail_step1_title'),
        desc: t('ui_course_detail_step1_desc'),
      },
      {
        step: '2',
        title: t('ui_course_detail_step2_title'),
        desc: t('ui_course_detail_step2_desc'),
      },
      {
        step: '3',
        title: t('ui_course_detail_step3_title'),
        desc: t('ui_course_detail_step3_desc'),
      },
    ],
    [],
  )

  const faq = useMemo(
    () => [
      { q: t('ui_course_detail_faq_q1'), a: t('ui_course_detail_faq_a1') },
      { q: t('ui_course_detail_faq_q2'), a: t('ui_course_detail_faq_a2') },
      { q: t('ui_course_detail_faq_q3'), a: t('ui_course_detail_faq_a3') },
    ],
    [],
  )

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16">
        <Container>
          <PageLoader message={t('ui_page_loader_course')} minHeight="min-h-[24vh]" />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut, delay: 0.06 }}
          >
            <CourseDetailSkeleton />
          </motion.div>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-24">
        <Container className="max-w-lg text-center">
          <h1 className="font-display text-2xl font-bold text-brand-900">
            {t('CourseDetailPage_69_course_not_found_b16349f879')}
          </h1>
          <Link to="/courses" className="mt-6 inline-flex text-sm font-semibold text-amber-700 hover:text-amber-600">
            {t('ui_course_detail_back_arrow')}
          </Link>
        </Container>
      </div>
    )
  }

  const cat = findCategory(categoryList, course.categoryId)
  const checkoutPath = `/checkout?course=${encodeURIComponent(course.slug)}`
  const loginHref = `/login?redirect=${encodeURIComponent(checkoutPath)}`
  const summary = displayCourseSummary(course)
  const description = displayCourseDescription(course)
  const showDefaultOutcome = !summary && description.length < 40

  const startEnroll = async () => {
    if (!course) return
    if (!user) {
      navigate(loginHref)
      return
    }
    setEnrollErr(null)
    const sale = courseSalePriceCents(course)
    if (course.priceCents > 0 && sale < 1) {
      setEnrollBusy(true)
      try {
        await purchaseDiscountedCourse(course.id)
        navigate('/my-courses')
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Enrollment failed.'
        setEnrollErr(msg)
      } finally {
        setEnrollBusy(false)
      }
      return
    }
    if (course.priceCents > 0) {
      if (!stripeEnabled) {
        setEnrollErr('Card payment is not configured on the server. Set STRIPE_ENABLED and STRIPE_SECRET_KEY.')
        return
      }
      setEnrollBusy(true)
      try {
        const { url, freeEnroll } = await createStripeCheckoutSession(course.id)
        if (freeEnroll) {
          await purchaseDiscountedCourse(course.id)
          navigate('/my-courses')
          return
        }
        if (url) {
          window.location.href = url
          return
        }
        setEnrollErr('Stripe did not return a checkout URL. Check server STRIPE_SECRET_KEY.')
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Payment could not start.'
        setEnrollErr(msg)
      } finally {
        setEnrollBusy(false)
      }
      return
    }
    navigate(checkoutPath)
  }

  const trustPills = [
    { icon: Zap, label: t('ui_course_detail_trust_instant') },
    { icon: BadgeCheck, label: t('ui_course_detail_trust_certificate') },
    { icon: BookOpen, label: t('ui_course_detail_trust_pace') },
  ]

  const whyItems = [
    t('ui_course_detail_why_1'),
    t('ui_course_detail_why_2'),
    t('ui_course_detail_why_3'),
  ]

  return (
    <div className="pb-24 lg:pb-16">
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-sky-50/40 to-white py-10 sm:py-12 lg:py-14">
        <Container>
          <nav className="text-sm text-slate-500">
            <Link to="/courses" className="font-medium transition hover:text-brand-800">
              {t('ui_course_nav_courses')}
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">{displayCourseTitle(course)}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-start gap-4 sm:gap-5">
            <div className="relative shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md ring-1 ring-slate-900/5 w-[min(25vw,9rem)] max-w-[25vw] sm:w-[min(25vw,11rem)]">
              {course.popular ? (
                <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-950 shadow">
                  <Sparkles className="h-3 w-3" />
                  {t('ui_course_detail_popular')}
                </span>
              ) : null}
              <img
                src={displayCourseImageUrl(course) || course.imageUrl}
                alt={displayCourseTitle(course)}
                className="h-auto max-h-[25vh] w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 basis-[min(100%,16rem)]">
              {cat ? (
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                  {displayCategoryName(cat)}
                </p>
              ) : null}
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
                {displayCourseTitle(course)}
              </h1>
              {summary ? (
                <p className="mt-2 text-base font-medium leading-relaxed text-slate-800 sm:text-lg">{summary}</p>
              ) : showDefaultOutcome ? (
                <p className="mt-2 text-base font-medium leading-relaxed text-slate-700 sm:text-lg">
                  {t('ui_course_detail_outcome_default')}
                </p>
              ) : null}
              {description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
              ) : null}

              <div className="mt-4">
                <CoursePriceDisplay course={course} size="md" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {trustPills.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                  >
                    <Icon className="h-3 w-3 shrink-0 text-sky-600" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden w-full max-w-md shrink-0 sm:max-w-[min(25vw,20rem)] md:block">
              <PurchasePanel
                course={course}
                hasAccess={hasAccess}
                user={user}
                enrollBusy={enrollBusy}
                enrollErr={enrollErr}
                loginHref={loginHref}
                onPurchase={startEnroll}
              />
            </div>
          </div>

          <div className="mt-4 max-w-md md:hidden">
            <PurchasePanel
              course={course}
              hasAccess={hasAccess}
              user={user}
              enrollBusy={enrollBusy}
              enrollErr={enrollErr}
              loginHref={loginHref}
              onPurchase={startEnroll}
            />
          </div>
        </Container>
      </div>

      <Container className="mt-4 pt-4 sm:mt-5 sm:pt-5">
        <div className="space-y-10 sm:space-y-12">
            <section>
              <h2 className="font-display text-xl font-bold text-brand-900 sm:text-2xl">
                {t('ui_course_detail_whats_included')}
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {includedItems.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-900/[0.03]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-slate-700">{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-brand-900 sm:text-2xl">
                {t('ui_course_detail_how_it_works')}
              </h2>
              <ol className="mt-6 space-y-4">
                {howItWorks.map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/80 p-5 shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-sm font-bold text-white shadow-md shadow-sky-900/20">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-display font-semibold text-brand-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl border border-sky-100 bg-sky-50/50 p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-sky-700" />
                <h2 className="font-display text-lg font-bold text-brand-900">{t('ui_course_detail_why_title')}</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {whyItems.map((line) => (
                  <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-brand-900 sm:text-2xl">
                {t('ui_course_detail_faq_title')}
              </h2>
              <dl className="mt-5 divide-y divide-slate-200/90 rounded-2xl border border-slate-200/90 bg-white">
                {faq.map((item) => (
                  <div key={item.q} className="px-5 py-4 sm:px-6">
                    <dt className="font-semibold text-brand-900">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
        </div>
      </Container>

      {!hasAccess ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 p-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md lg:hidden">
          <Container className="!px-3">
            <PurchasePanel
              course={course}
              hasAccess={hasAccess}
              user={user}
              enrollBusy={enrollBusy}
              enrollErr={enrollErr}
              loginHref={loginHref}
              onPurchase={startEnroll}
              compact
            />
          </Container>
        </div>
      ) : null}
    </div>
  )
}
