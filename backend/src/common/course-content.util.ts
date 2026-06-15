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

export function normalizeSlidesForMetrics(
  slides: CourseSlide[] | null | undefined,
  slideImageUrls: string[] | null | undefined,
): CourseSlide[] {
  if (slides?.length) return slides
  const legacy = slideImageUrls?.filter(Boolean) ?? []
  if (!legacy.length) return []
  return legacy.map((url, i) => ({
    id: `legacy-${i}`,
    type: 'image' as const,
    url,
  }))
}

function getContentPlaylist(slides: CourseSlide[]): CourseSlide[] {
  return slides.filter((s) => s.type === 'pdf' || s.type === 'video')
}

function computePlaylistMetrics(playlist: CourseSlide[]): CourseContentMetrics {
  const replacedCountByPdf = new Map<string, number>()
  for (const s of playlist) {
    if (s.type === 'video' && s.pageReplace && (s.pageReplace.mode ?? 'replace') === 'replace') {
      const id = s.pageReplace.pdfSlideId
      replacedCountByPdf.set(id, (replacedCountByPdf.get(id) ?? 0) + 1)
    }
  }

  let slideCount = 0
  let durationSeconds = 0

  for (const slide of playlist) {
    if (slide.type === 'pdf') {
      const pages = pdfPages(slide)
      const replaced = Math.min(replacedCountByPdf.get(slide.id) ?? 0, pages)
      const effective = pages - replaced
      slideCount += effective
      durationSeconds += effective * LEARNER_SLIDE_DWELL_SEC
    } else if (slide.type === 'video') {
      slideCount += 1
      durationSeconds += videoSeconds(slide)
    }
  }

  return {
    slideCount: Math.max(slideCount, playlist.length > 0 ? 1 : 0),
    durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  }
}

/** Total learner steps and course duration from ordered content items. */
export function computeCourseContentMetrics(slides: CourseSlide[]): CourseContentMetrics {
  const playlist = getContentPlaylist(slides)
  if (playlist.length > 0) return computePlaylistMetrics(playlist)

  let slideCount = 0
  let durationSeconds = 0
  for (const slide of slides) {
    if (slide.type === 'image') {
      slideCount += 1
      durationSeconds += LEARNER_SLIDE_DWELL_SEC
    }
  }

  return {
    slideCount: Math.max(slideCount, slides.length > 0 ? 1 : 0),
    durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  }
}
