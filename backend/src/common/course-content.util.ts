import type { CourseSlide } from './course-slide.types'

/** Minimum seconds a learner must view each PDF page / image slide. */
export const LEARNER_SLIDE_DWELL_SEC = 15

export type CourseContentMetrics = {
  slideCount: number
  durationMinutes: number
  durationSeconds: number
}

function pdfPages(slide: CourseSlide): number {
  const rendered = slide.renderedSlideUrls?.filter(Boolean).length ?? 0
  if (rendered > 0) return rendered
  const pages = slide.pdfPageCount ?? slide.deckSlideCount ?? 0
  return pages > 0 ? pages : 1
}

function videoSeconds(slide: CourseSlide): number {
  const sec = slide.durationSec ?? 0
  return sec > 0 ? Math.round(sec) : 60
}

/** Total learner steps and course duration from ordered content items. */
export function computeCourseContentMetrics(slides: CourseSlide[]): CourseContentMetrics {
  let slideCount = 0
  let durationSeconds = 0

  for (const slide of slides) {
    if (slide.type === 'pdf') {
      const pages = pdfPages(slide)
      slideCount += pages
      durationSeconds += pages * LEARNER_SLIDE_DWELL_SEC
    } else if (slide.type === 'video') {
      slideCount += 1
      durationSeconds += videoSeconds(slide)
    }
  }

  return {
    slideCount: Math.max(slideCount, slides.length > 0 ? 1 : 0),
    durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  }
}
