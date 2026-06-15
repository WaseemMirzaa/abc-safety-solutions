import type { DataSource } from 'typeorm'
import { CourseEntity } from '../entities/course.entity'
import {
  computeCourseContentMetrics,
  LEARNER_SLIDE_DWELL_SEC,
  normalizeSlidesForMetrics,
} from './course-content.util'

export type RecalculateCourseDurationsResult = {
  scanned: number
  updated: number
  dwellSecPerPage: number
}

/** Recompute courses.durationMinutes / slideCount using current dwell rule (15s per page/image). */
export async function recalculateAllCourseDurations(
  dataSource: DataSource,
  logEach = false,
): Promise<RecalculateCourseDurationsResult> {
  const repo = dataSource.getRepository(CourseEntity)
  const courses = await repo.find()
  let updated = 0

  for (const c of courses) {
    const slides = normalizeSlidesForMetrics(c.slides, c.slideImageUrls)
    if (!slides.length) continue
    const metrics = computeCourseContentMetrics(slides)
    if (metrics.durationMinutes !== c.durationMinutes || metrics.slideCount !== c.slideCount) {
      await repo.update(
        { id: c.id },
        {
          durationMinutes: metrics.durationMinutes,
          slideCount: metrics.slideCount,
        },
      )
      updated++
      if (logEach) {
        const label = c.slug || c.title || c.id
        console.log(
          `  ${label}: ${c.durationMinutes} min → ${metrics.durationMinutes} min (${metrics.slideCount} slides)`,
        )
      }
    }
  }

  return {
    scanned: courses.length,
    updated,
    dwellSecPerPage: LEARNER_SLIDE_DWELL_SEC,
  }
}
