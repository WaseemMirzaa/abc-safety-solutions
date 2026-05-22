import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Clock, Layers, ArrowUpRight } from 'lucide-react'
import type { Category, Course } from '@/types'
import { findCategory } from '@/data/catalog'
import { easeOut, transition } from '@/lib/motionPresets'
import { t } from '@/i18n/t'
import {
  displayCategoryName,
  displayCourseImageUrl,
  displayCourseSummary,
  displayCourseTitle,
  displaySlideCount,
} from '@/lib/courseDisplay'
import { CoursePriceDisplay } from '@/components/CoursePriceDisplay'
import { displayDiscountPercent, hasCourseSale } from '@/lib/pricing'
import { formatCourseDuration } from '@/lib/courseContent'

type Props = {
  course: Course
  categories?: Category[]
  /** When false, parent handles list stagger (e.g. catalog grid). */
  entrance?: boolean
}

export function CourseCard({ course, categories = [], entrance = true }: Props) {
  const reduce = useReducedMotion()
  const cat = findCategory(categories, course.categoryId)
  const catDisplay = cat ? displayCategoryName(cat) : ''
  const slideCount = displaySlideCount(course)
  const shortCat = cat
    ? `${catDisplay.split('(')[0].trim().slice(0, 26)}${catDisplay.length > 26 ? '…' : ''}`
    : ''

  const shellClass =
    'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04),0_20px_40px_-28px_rgba(15,23,42,0.2)] transition-[box-shadow,border-color,transform] duration-300 hover:border-amber-200/60 hover:shadow-[0_12px_40px_-20px_rgba(245,158,11,0.25)] motion-safe:hover:-translate-y-1'

  const inner = (
    <>
      <Link to={`/courses/${course.slug}`} className="relative block aspect-[5/3] overflow-hidden bg-slate-200">
        <motion.img
          src={displayCourseImageUrl(course) || course.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          initial={reduce || !entrance ? false : { scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={reduce ? undefined : { scale: 1.04 }}
          transition={{ duration: 0.45, ease: easeOut }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-80" />
        {hasCourseSale(course) ? (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
            {t('ui_price_save_percent', {
              percent: displayDiscountPercent(course),
              defaultValue: 'Save {{percent}}%',
            })}
          </span>
        ) : null}
        {cat ? (
          <span className="absolute left-3 top-3 max-w-[85%] rounded-full border border-white/25 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-md">
            {shortCat}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-col gap-0 p-4 sm:p-[1.125rem]">
        <Link
          to={`/courses/${course.slug}`}
          className="font-display text-base font-semibold leading-snug tracking-tight text-brand-900 transition group-hover:text-amber-800"
        >
          {displayCourseTitle(course)}
        </Link>
        {displayCourseSummary(course) ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-600">
            {displayCourseSummary(course)}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2 py-0.5 text-slate-600">
            <Clock className="h-3 w-3 text-sky-600" />
            {formatCourseDuration(course.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2 py-0.5 text-slate-600">
            <Layers className="h-3 w-3 text-sky-600" />
            {slideCount != null
              ? t('ui_course_card_slide_count', { count: slideCount })
              : t('ui_course_card_self_paced', { defaultValue: 'Self-paced' })}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100/90 pt-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('CourseCard_69_from_e291070e50')}</p>
            <CoursePriceDisplay course={course} size="sm" />
          </div>
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 px-3.5 py-2 text-sm font-semibold text-brand-950 shadow-md shadow-amber-900/15 ring-1 ring-amber-400/40 transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] motion-reduce:active:scale-100"
          >
            {t('ui_course_card_details')}
            <ArrowUpRight className="h-4 w-4 opacity-80" />
          </Link>
        </div>
      </div>
    </>
  )

  if (!entrance) {
    return <article className={shellClass}>{inner}</article>
  }

  return (
    <motion.article
      layout
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: transition.card.duration, ease: easeOut }}
      whileHover={reduce ? undefined : { y: -5, transition: transition.springSnappy }}
      className={shellClass.replace(' motion-safe:hover:-translate-y-1', '')}
    >
      {inner}
    </motion.article>
  )
}
