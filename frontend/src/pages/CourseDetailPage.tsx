import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, Layers, CheckCircle2 } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CourseDetailSkeleton } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { easeOut } from '@/lib/motionPresets'
import { fetchCategories, fetchCourseBySlug, fetchMyEnrollments } from '@/api/localData'
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
import { t } from '@/i18n/t'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()

  const { data: course, isLoading } = useQuery({
    queryKey: qk.course(slug),
    queryFn: () => fetchCourseBySlug(slug),
    enabled: Boolean(slug),
  })

  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const { data: enrollments = [] } = useQuery({
    queryKey: qk.enrollments,
    queryFn: fetchMyEnrollments,
    enabled: Boolean(user),
  })

  const purchased = course
    ? enrollments.some((e) => e.courseId === course.id && !e.refunded)
    : false

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
          <h1 className="font-display text-2xl font-bold text-brand-900">{t('CourseDetailPage_69_course_not_found_b16349f879')}</h1>
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

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <nav className="text-sm text-slate-500">
          <Link to="/courses" className="font-medium transition hover:text-brand-800">
            {t('ui_course_nav_courses')}
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{displayCourseTitle(course)}</span>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
              <img
                src={displayCourseImageUrl(course) || course.imageUrl}
                alt={displayCourseTitle(course)}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            {cat ? (
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                {displayCategoryName(cat)}
              </p>
            ) : null}
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
              {displayCourseTitle(course)}
            </h1>
            {displayCourseSummary(course) ? (
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-700">
                {displayCourseSummary(course)}
              </p>
            ) : null}
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {displayCourseDescription(course)}
            </p>

            <ul className="mt-8 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <Clock className="h-5 w-5 shrink-0 text-sky-600" />
                {t('ui_course_estimated_hours', { hours: Math.round(course.durationMinutes / 60) })}
              </li>
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <Layers className="h-5 w-5 shrink-0 text-sky-600" />
                {displaySlidesLabel(course)}
              </li>
              <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
                {t('ui_course_knowledge_cert')}
              </li>
              {course.certificateValidityDays != null && course.certificateValidityDays > 0 ? (
                <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />
                  {t('ui_course_cert_validity_days', {
                    days: course.certificateValidityDays,
                    defaultValue: `Completion certificate expires ${course.certificateValidityDays} days after it is issued.`,
                  })}
                </li>
              ) : null}
            </ul>

            <div className="card-elevated mt-10 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('CourseDetailPage_121_your_investment_10257b1552')}</p>
              <p className="mt-2 font-display text-4xl font-bold text-brand-900">{formatPrice(course.priceCents)}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {purchased ? (
                  <Link to={`/learn/${course.id}`} className="flex-1">
                    <Button className="w-full">{t('CourseDetailPage_134_continue_to_course_6b6b6ed6e8')}</Button>
                  </Link>
                ) : user ? (
                  <Link to={checkoutPath} className="flex-1">
                    <Button className="w-full">{t('ui_course_enroll_now')}</Button>
                  </Link>
                ) : (
                  <Link to={loginHref} className="flex-1">
                    <Button className="w-full">{t('ui_course_signin_enroll')}</Button>
                  </Link>
                )}
                <Link to="/courses" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    {t('ui_course_detail_back')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
