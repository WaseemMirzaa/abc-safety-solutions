import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Clock, Layers, ArrowUpRight } from 'lucide-react'
import type { Course } from '@/types'
import { getCategoryById } from '@/data/catalog'
import { getCourseSlideCount } from '@/lib/courseSlides'
import { easeOut, transition } from '@/lib/motionPresets'
import { t } from '@/i18n/t'
import { localizedCategoryName, localizedCourseSummary, localizedCourseTitle } from '@/lib/catalogLocale'

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

type Props = {
  course: Course
  /** When false, parent handles list stagger (e.g. catalog grid). */
  entrance?: boolean
}

export function CourseCard({ course, entrance = true }: Props) {
  const reduce = useReducedMotion()
  const cat = getCategoryById(course.categoryId)
  const catDisplay = cat ? localizedCategoryName(cat.id, cat.name) : ''
  const shortCat = cat
    ? `${catDisplay.split('(')[0].trim().slice(0, 26)}${catDisplay.length > 26 ? '…' : ''}`
    : ''

  const shellClass =
    'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04),0_20px_40px_-28px_rgba(15,23,42,0.2)] transition-[box-shadow,border-color,transform] duration-300 hover:border-amber-200/60 hover:shadow-[0_12px_40px_-20px_rgba(245,158,11,0.25)] motion-safe:hover:-translate-y-1'

  const inner = (
    <>
      <Link to={`/courses/${course.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-slate-200">
        <motion.img
          src={course.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          initial={reduce || !entrance ? false : { scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={reduce ? undefined : { scale: 1.04 }}
          transition={{ duration: 0.45, ease: easeOut }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-80" />
        {cat ? (
          <span className="absolute left-4 top-4 max-w-[85%] rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            {shortCat}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <Link
          to={`/courses/${course.slug}`}
          className="font-display text-lg font-semibold leading-snug text-brand-900 transition group-hover:text-amber-800"
        >
          {localizedCourseTitle(course.slug, course.title)}
        </Link>
        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
          {localizedCourseSummary(course.slug, course.summary)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            <Clock className="h-3.5 w-3.5 text-sky-600" />
            {t('ui_course_card_hours_est', { hours: Math.round(course.durationMinutes / 60) })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            <Layers className="h-3.5 w-3.5 text-sky-600" />
            {t('ui_course_card_slide_count', { count: getCourseSlideCount(course) })}
          </span>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t('CourseCard_69_from_e291070e50')}</p>
            <p className="font-display text-2xl font-bold tracking-tight text-brand-900">{formatPrice(course.priceCents)}</p>
          </div>
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-brand-950 shadow-md shadow-amber-900/20 ring-1 ring-amber-400/40 transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] motion-reduce:active:scale-100"
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
