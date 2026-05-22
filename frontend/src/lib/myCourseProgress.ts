import type { AdminTest, Course, Progress } from '@/types'
import { courseProgressPercent } from '@/lib/courseProgress'
import { getCourseSlideCount, isPlaylistCourse, isVideoCourse } from '@/lib/courseSlides'

export type MyCourseProgressSummary = {
  pct: number
  started: boolean
  contentComplete: boolean
  testPassed: boolean
  mode: 'video' | 'slides' | 'playlist'
  totalUnits: number
  completedUnits: number
  remainingUnits: number
  remainingPct: number
  resumeAt: number
  watchedSec: number
}

export function formatDurationSec(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function buildMyCourseProgressSummary(
  course: Course,
  prog: Progress | null | undefined,
): MyCourseProgressSummary {
  const video = isVideoCourse(course)
  const playlist = isPlaylistCourse(course)
  const total = Math.max(1, getCourseSlideCount(course))
  const slideIndex = prog?.slideIndex ?? 0
  const maxSlide = prog?.maxSlideIndex ?? slideIndex
  const completedSlides = Boolean(prog?.completedSlides)
  const watchedSec = prog?.audioTimeSec ?? 0
  const testPassed = Boolean(prog?.testPassed)

  if (video) {
    const estDurationSec = Math.max(60, course.durationMinutes * 60)
    const watchedPct = completedSlides
      ? 100
      : watchedSec > 0
        ? Math.min(99, Math.round((watchedSec / estDurationSec) * 100))
        : 0
    const pct = courseProgressPercent({
      totalSlides: total,
      slideIndex: 0,
      completedSlides,
      videoCourse: true,
      videoWatchPct: watchedPct,
    })
    const remainingPct = Math.max(0, 100 - pct)
    return {
      pct,
      started: watchedSec > 0 || completedSlides,
      contentComplete: completedSlides,
      testPassed,
      mode: 'video',
      totalUnits: 1,
      completedUnits: completedSlides ? 1 : 0,
      remainingUnits: completedSlides ? 0 : 1,
      remainingPct,
      resumeAt: 1,
      watchedSec,
    }
  }

  const furthest = completedSlides ? total - 1 : Math.max(slideIndex, maxSlide)
  const completedUnits = completedSlides ? total : furthest + 1
  const remainingUnits = Math.max(0, total - completedUnits)
  const pct = courseProgressPercent({
    totalSlides: total,
    slideIndex,
    maxSlideIndex: maxSlide,
    completedSlides,
  })
  return {
    pct,
    started: slideIndex > 0 || maxSlide > 0 || completedSlides,
    contentComplete: completedSlides,
    testPassed,
    mode: playlist ? 'playlist' : 'slides',
    totalUnits: total,
    completedUnits,
    remainingUnits,
    remainingPct: Math.max(0, 100 - pct),
    resumeAt: Math.min(total, furthest + 1),
    watchedSec: 0,
  }
}

export function publishedTestMeta(test: AdminTest | null | undefined) {
  const questions = test?.questions?.filter((q) => q.options?.length) ?? []
  const questionCount = questions.length
  const timeLimitMinutes = test?.timeLimitMinutes ?? 0
  const passPercent = test?.passPercent ?? 0
  return {
    hasTest: questionCount > 0,
    questionCount,
    timeLimitMinutes,
    passPercent,
  }
}
