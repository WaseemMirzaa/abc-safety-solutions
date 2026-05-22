import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Film,
  Layers,
  PlayCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/Button'
import { displayCourseImageUrl, displayCourseTitle } from '@/lib/courseDisplay'
import {
  buildMyCourseProgressSummary,
  formatDurationSec,
  publishedTestMeta,
} from '@/lib/myCourseProgress'
import { isPdfDeckCourse, isPptxDeckCourse, isVideoCourse } from '@/lib/courseSlides'
import { fetchMyProgress, fetchPublishedTestForCourse } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { listItem } from '@/lib/motionPresets'
import { t } from '@/i18n/t'
import type { Course } from '@/types'

type Props = {
  course: Course
  /** No learn access — show repurchase CTA (avoids progress API 403). */
  attemptsExhausted?: boolean
}

function MetaChip({
  icon: Icon,
  children,
  tone = 'neutral',
}: {
  icon: typeof Film
  children: ReactNode
  tone?: 'neutral' | 'sky' | 'emerald' | 'amber'
}) {
  const tones = {
    neutral: 'bg-slate-100/90 text-slate-700',
    sky: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none',
        tones[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      {children}
    </span>
  )
}

export function MyCourseRow({ course, attemptsExhausted = false }: Props) {
  const video = isVideoCourse(course)
  const pptx = isPptxDeckCourse(course)
  const pdf = isPdfDeckCourse(course)
  const checkoutHref = `/checkout?course=${encodeURIComponent(course.slug)}`

  const { data: prog } = useQuery({
    queryKey: qk.progress(course.id),
    queryFn: () => fetchMyProgress(course.id),
    staleTime: 15_000,
    enabled: !attemptsExhausted,
  })

  const { data: publishedTest } = useQuery({
    queryKey: qk.publishedTest(course.id),
    queryFn: () => fetchPublishedTestForCourse(course.id),
    staleTime: 60_000,
    enabled: !attemptsExhausted,
  })

  const summary = buildMyCourseProgressSummary(course, prog)
  const test = publishedTestMeta(publishedTest)
  const thumb = displayCourseImageUrl(course) || course.imageUrl

  const contentLabel = video
    ? t('ui_mycourses_format_video', { defaultValue: 'Video training' })
    : pdf
      ? t('ui_mycourses_format_pdf', { defaultValue: 'PDF slides' })
      : pptx
        ? t('ui_mycourses_format_pptx', { defaultValue: 'PowerPoint slides' })
        : t('ui_mycourses_format_slides', {
          count: summary.totalUnits,
          defaultValue: '{{count}} slides',
        })

  const contentProgressLine = (() => {
    if (!summary.started) {
      return t('ui_mycourses_content_not_started', { defaultValue: 'Content not started' })
    }
    if (video) {
      if (summary.contentComplete) {
        return t('ui_mycourses_video_complete', { defaultValue: 'Video completed' })
      }
      if (summary.watchedSec > 0) {
        return t('ui_mycourses_video_watched', {
          time: formatDurationSec(summary.watchedSec),
          pct: summary.pct,
          defaultValue: 'Watched {{time}} · {{pct}}% complete',
        })
      }
      return t('ui_mycourses_video_begin', { defaultValue: 'Start watching the training video' })
    }
    if (summary.contentComplete) {
      return t('ui_mycourses_slides_complete', {
        total: summary.totalUnits,
        defaultValue: 'All {{total}} slides reviewed',
      })
    }
    return t('ui_mycourses_slides_progress', {
      done: summary.completedUnits,
      total: summary.totalUnits,
      remaining: summary.remainingUnits,
      slide: summary.resumeAt,
      defaultValue: '{{done}} of {{total}} slides · {{remaining}} left · resume at slide {{slide}}',
    })
  })()

  const remainingLine =
    summary.contentComplete && !video
      ? t('ui_mycourses_remaining_none', { defaultValue: 'No slides remaining' })
      : summary.contentComplete && video
        ? t('ui_mycourses_remaining_video_done', { defaultValue: 'No video remaining' })
        : video
          ? t('ui_mycourses_remaining_video_pct', {
              pct: summary.remainingPct,
              defaultValue: '~{{pct}}% of video remaining (estimated)',
            })
          : t('ui_mycourses_remaining_slides', {
              count: summary.remainingUnits,
              defaultValue: '{{count}} slides remaining',
            })

  const testLine = !test.hasTest
    ? t('ui_mycourses_no_test', { defaultValue: 'Knowledge check not configured yet' })
    : test.timeLimitMinutes > 0
      ? t('ui_mycourses_test_meta_timed', {
          count: test.questionCount,
          minutes: test.timeLimitMinutes,
          pass: test.passPercent,
          defaultValue: '{{count}} questions · {{minutes}} min · {{pass}}% to pass',
        })
      : t('ui_mycourses_test_meta', {
          count: test.questionCount,
          pass: test.passPercent,
          defaultValue: '{{count}} questions · no time limit · {{pass}}% to pass',
        })

  const testStatusLine = summary.testPassed
    ? t('ui_mycourses_test_passed', { defaultValue: 'Knowledge check passed' })
    : summary.contentComplete
      ? t('ui_mycourses_test_ready', { defaultValue: 'Ready to take the knowledge check' })
      : t('ui_mycourses_test_locked', { defaultValue: 'Complete the content to unlock the test' })

  if (attemptsExhausted) {
    const thumb = displayCourseImageUrl(course) || course.imageUrl
    return (
      <motion.li
        variants={listItem}
        layout
        className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/80 to-white shadow-sm"
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
          <div className="flex min-w-0 flex-1 gap-4">
            <img
              src={thumb}
              alt=""
              className="h-20 w-28 shrink-0 rounded-xl object-cover opacity-90 ring-1 ring-rose-200/80 sm:h-[5.25rem] sm:w-32"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold leading-snug text-brand-900 sm:text-lg">
                {displayCourseTitle(course)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <MetaChip icon={AlertCircle} tone="amber">
                  {t('ui_mycourses_attempts_used', { defaultValue: 'All 3 test attempts used' })}
                </MetaChip>
              </div>
              <p className="mt-3 text-sm text-rose-900/90">
                {t('ui_mycourses_exhausted_row_body', {
                  defaultValue:
                    'Repurchase this course to reset your attempts and start the training again from the beginning.',
                })}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center sm:flex-col sm:justify-center">
            <Link to={checkoutHref} className="w-full sm:w-auto">
              <Button className="w-full gap-2 sm:min-w-[7.5rem]">
                {t('ui_learn_repurchase', { defaultValue: 'Repurchase course' })}
              </Button>
            </Link>
          </div>
        </div>
      </motion.li>
    )
  }

  return (
    <motion.li
      variants={listItem}
      layout
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-amber-200/60 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
        <div className="flex min-w-0 flex-1 gap-4">
          <Link to={`/learn/${course.id}`} className="shrink-0">
            <img
              src={thumb}
              alt=""
              className="h-20 w-28 rounded-xl object-cover ring-1 ring-slate-200/80 sm:h-[5.25rem] sm:w-32"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/learn/${course.id}`}
              className="font-display text-base font-semibold leading-snug tracking-tight text-brand-900 transition hover:text-amber-800 sm:text-lg"
            >
              {displayCourseTitle(course)}
            </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MetaChip icon={video ? Film : Layers} tone="sky">
                {contentLabel}
              </MetaChip>
              {test.hasTest ? (
                <MetaChip icon={test.timeLimitMinutes > 0 ? Clock : ClipboardList} tone="neutral">
                  {test.timeLimitMinutes > 0
                    ? t('ui_mycourses_test_chip_timed', {
                        count: test.questionCount,
                        minutes: test.timeLimitMinutes,
                        defaultValue: '{{count}} Q · {{minutes}} min',
                      })
                    : t('ui_mycourses_test_chip', {
                        count: test.questionCount,
                        defaultValue: '{{count}} questions',
                      })}
                </MetaChip>
              ) : null}
              {summary.testPassed ? (
                <MetaChip icon={CheckCircle2} tone="emerald">
                  {t('ui_mycourses_passed_short', { defaultValue: 'Test passed' })}
                </MetaChip>
              ) : null}
            </div>

            <div className="mt-3 max-w-xl">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>
                  {t('ui_learn_course_progress_pct', {
                    pct: summary.pct,
                    defaultValue: '{{pct}}% complete',
                  })}
                </span>
                <span className="font-normal text-slate-500">{remainingLine}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${summary.pct}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[11px] leading-snug text-slate-600 sm:grid-cols-2">
              <div className="flex gap-2">
                {summary.contentComplete ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                )}
                <div>
                  <p className="font-semibold text-slate-700">
                    {t('ui_mycourses_section_content', { defaultValue: 'Training content' })}
                  </p>
                  <p className="mt-0.5">{contentProgressLine}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {summary.testPassed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : summary.contentComplete ? (
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                )}
                <div>
                  <p className="font-semibold text-slate-700">
                    {t('ui_mycourses_section_test', { defaultValue: 'Knowledge check' })}
                  </p>
                  <p className="mt-0.5">{testLine}</p>
                  <p className={clsx('mt-0.5', summary.testPassed ? 'text-emerald-700' : 'text-slate-500')}>
                    {testStatusLine}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center sm:flex-col sm:justify-center">
          <Link to={`/learn/${course.id}`} className="w-full sm:w-auto">
            <Button className="w-full gap-2 sm:min-w-[7.5rem]">
              {summary.started ? t('ui_continue') : t('ui_start')}
            </Button>
          </Link>
        </div>
      </div>
    </motion.li>
  )
}
