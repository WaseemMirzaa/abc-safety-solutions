import type { CourseSlide } from '@/types'

/** Minimum seconds a learner must view each PDF page / image step. */
export const LEARNER_SLIDE_DWELL_SEC = 30

export type CourseContentMetrics = {
  slideCount: number
  durationMinutes: number
  durationSeconds: number
}

export type LearnerUnit = {
  unitId: string
  sourceSlideId: string
  kind: 'image' | 'video'
  url: string
  title?: string
  minDwellSec: number
  durationSec?: number
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

/** Ordered playlist items (pdf + video only). */
export function getContentPlaylist(slides: CourseSlide[]): CourseSlide[] {
  return slides.filter((s) => s.type === 'pdf' || s.type === 'video')
}

export function computeCourseContentMetrics(slides: CourseSlide[]): CourseContentMetrics {
  const playlist = getContentPlaylist(slides)
  let slideCount = 0
  let durationSeconds = 0

  for (const slide of playlist) {
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
    slideCount: Math.max(slideCount, playlist.length > 0 ? 1 : 0),
    durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  }
}

/** Flatten playlist into learner steps in saved order. */
export function buildLearnerUnits(slides: CourseSlide[]): LearnerUnit[] {
  const units: LearnerUnit[] = []
  for (const slide of getContentPlaylist(slides)) {
    if (slide.type === 'pdf') {
      const urls = slide.renderedSlideUrls?.filter(Boolean) ?? []
      if (urls.length > 0) {
        urls.forEach((url, i) => {
          units.push({
            unitId: `${slide.id}-p${i}`,
            sourceSlideId: slide.id,
            kind: 'image',
            url,
            title: slide.title ?? slide.fileName,
            minDwellSec: LEARNER_SLIDE_DWELL_SEC,
          })
        })
      } else {
        const n = pdfPages(slide)
        for (let i = 0; i < n; i++) {
          units.push({
            unitId: `${slide.id}-p${i}`,
            sourceSlideId: slide.id,
            kind: 'image',
            url: slide.url,
            title: slide.title ?? slide.fileName,
            minDwellSec: LEARNER_SLIDE_DWELL_SEC,
          })
        }
      }
    } else if (slide.type === 'video') {
      const dur = videoSeconds(slide)
      units.push({
        unitId: `${slide.id}-v`,
        sourceSlideId: slide.id,
        kind: 'video',
        url: slide.url,
        title: slide.title ?? slide.fileName,
        minDwellSec: 0,
        durationSec: dur,
      })
    }
  }
  return units
}

export function learnerUnitToSlide(unit: LearnerUnit): CourseSlide {
  if (unit.kind === 'video') {
    return {
      id: unit.sourceSlideId,
      type: 'video',
      url: unit.url,
      title: unit.title,
      durationSec: unit.durationSec,
    }
  }
  return {
    id: unit.unitId,
    type: 'image',
    url: unit.url,
    title: unit.title,
    renderedSlideUrls: [unit.url],
  }
}

export function formatCourseDuration(minutes: number): string {
  const m = Math.max(1, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (rem === 0) return h === 1 ? '1 hour' : `${h} hours`
  return h === 1 ? `1 hr ${rem} min` : `${h} hr ${rem} min`
}

export function probeVideoDurationSec(file: File): Promise<number> {
  return new Promise((resolve) => {
    const blob = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const done = (sec: number) => {
      URL.revokeObjectURL(blob)
      resolve(sec > 0 ? Math.round(sec) : 60)
    }
    video.onloadedmetadata = () => done(video.duration)
    video.onerror = () => done(60)
    video.src = blob
  })
}
