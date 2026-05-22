import { Link, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { t } from '@/i18n/t'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { PageHeaderSkeleton, MyCourseRowSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { getCourseSlideCount } from '@/lib/courseSlides'
import { completeStripeCheckout, fetchMyEnrollments, fetchMyProgress, fetchPublishedCourses } from '@/api/localData'
import { ApiError } from '@/api/client'
import { hasCourseAccess } from '@/lib/courseAccess'
import { qk } from '@/api/queryKeys'
import { listContainer, listItem } from '@/lib/motionPresets'
import { BookOpen } from 'lucide-react'
import type { Course } from '@/types'
import type { EnrollmentRow } from '@/api/localData'

function EnrolledCourseRow({ course }: { course: Course }) {
  const { data: prog } = useQuery({
    queryKey: qk.progress(course.id),
    queryFn: () => fetchMyProgress(course.id),
    staleTime: 15_000,
  })
  return (
    <motion.li
      variants={listItem}
      layout
      className="card-elevated flex flex-col gap-6 p-6 transition hover:border-amber-200/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-5">
        <img src={course.imageUrl} alt="" className="h-24 w-36 rounded-2xl object-cover ring-1 ring-slate-200/80" />
        <div>
          <h2 className="font-display text-lg font-semibold text-brand-900">
            {displayCourseTitle(course)}
          </h2>
          <p
            className={clsx(
              'mt-2 text-sm',
              prog && (prog.slideIndex > 0 || prog.completedSlides) ? 'font-semibold text-sky-700' : 'text-slate-500',
            )}
          >
            {prog && (prog.slideIndex > 0 || prog.completedSlides)
              ? t('ui_mycourses_resume', {
                  slide: prog.slideIndex + 1,
                  total: getCourseSlideCount(course),
                })
              : t('ui_not_started')}
          </p>
        </div>
      </div>
      <Link to={`/learn/${course.id}`}>
        <Button className="w-full sm:w-auto">
          {prog && (prog.slideIndex > 0 || prog.completedSlides) ? t('ui_continue') : t('ui_start')}
        </Button>
      </Link>
    </motion.li>
  )
}

function enrollmentHasAccess(e: EnrollmentRow, coursesById: Map<string, Course>): boolean {
  if (e.refunded) return false
  if (e.hasAccess === true) return true
  const c = e.course ?? coursesById.get(e.courseId)
  return hasCourseAccess(e, c ?? null)
}

export function MyCoursesPage() {
  const { user, logout } = useAuth()
  const [sp, setSp] = useSearchParams()
  const qc = useQueryClient()
  const sessionId = sp.get('session_id')?.trim() ?? ''

  const { data: courses = [], isPending } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })
  const {
    data: enrollments = [],
    isPending: enPending,
    isError: enError,
    error: enErr,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: qk.enrollments,
    queryFn: fetchMyEnrollments,
    enabled: Boolean(user),
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (!user || !sessionId) return
    let cancelled = false
    ;(async () => {
      try {
        await completeStripeCheckout(sessionId)
        if (cancelled) return
        sp.delete('session_id')
        setSp(sp, { replace: true })
        await qc.invalidateQueries({ queryKey: qk.enrollments })
        await qc.invalidateQueries({ queryKey: qk.myOrders })
      } catch {
        /* success page may have already fulfilled; ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, sessionId, sp, setSp, qc])

  useEffect(() => {
    if (enError && enErr instanceof ApiError && enErr.status === 401) logout()
  }, [enError, enErr, logout])

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">{t('MyCoursesPage_26_my_learning_4f0acae2e9')}</h1>
          <p className="mt-3 text-slate-600">{t('MyCoursesPage_27_sign_in_to_see_purchased_courses_and_resume_prog_85eda6f249')}</p>
          <Link to="/login" className="mt-10 inline-block">
            <Button>{t('MyCoursesPage_29_sign_in_9c1c364391')}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const byId = new Map(courses.map((c) => [c.id, c]))
  const mine = enrollments
    .filter((e) => enrollmentHasAccess(e, byId))
    .map((e) => e.course ?? byId.get(e.courseId))
    .filter((c): c is Course => Boolean(c))

  const loading = isPending || enPending

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        {loading ? (
          <PageHeaderSkeleton />
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold tracking-tight text-brand-900">{t('MyCoursesPage_47_my_learning_c07f056316')}</h1>
            <p className="mt-3 max-w-xl text-slate-600">
              Progress syncs on this device. NestJS will unify across web and app.
            </p>
          </>
        )}

        {loading ? (
          <motion.ul
            className="mt-8 space-y-5"
            variants={listContainer}
            initial="hidden"
            animate="show"
            aria-busy
          >
            {[0, 1, 2].map((k) => (
              <motion.li key={k} variants={listItem} layout>
                <MyCourseRowSkeleton />
              </motion.li>
            ))}
          </motion.ul>
        ) : enError ? (
          <div className="mt-14 rounded-3xl border border-red-200 bg-red-50/80 px-8 py-12 text-center">
            <p className="font-medium text-red-900">
              {enErr instanceof ApiError ? enErr.message : t('ui_checkout_err')}
            </p>
            <Button className="mt-6" variant="secondary" onClick={() => void refetchEnrollments()}>
              {t('ui_retry', { defaultValue: 'Try again' })}
            </Button>
          </div>
        ) : mine.length === 0 ? (
          <div className="mt-14 rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 px-8 py-16 text-center">
            <p className="font-medium text-slate-600">{t('MyCoursesPage_70_you_have_not_enrolled_in_any_courses_yet_67a34b35c6')}</p>
            <p className="mt-2 text-sm text-slate-500">
              {t('ui_mycourses_paid_hint', {
                defaultValue: 'Paid with Stripe? Open the order confirmation link or contact support if your course is missing.',
              })}
            </p>
            <Link to="/courses" className="mt-8 inline-block">
              <Button>{t('MyCoursesPage_72_browse_catalog_fc72ee08cb')}</Button>
            </Link>
          </div>
        ) : (
          <motion.ul
            className="mt-12 space-y-5"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {mine.map((c) => (
              <EnrolledCourseRow key={c.id} course={c} />
            ))}
          </motion.ul>
        )}

        <p className="mt-10 text-xs text-slate-400">
          {t('ui_mycourses_catalog_cache', { count: courses.length })}
        </p>
      </Container>
    </div>
  )
}
