import type { CourseSlide } from '@/types'

/** Minimum seconds a learner must view each PDF page / image step. */
export const LEARNER_SLIDE_DWELL_SEC = 15

/** Hint for admin UI: how auto course duration is calculated. */
export function learnerDurationRuleHint(): string {
  return `${LEARNER_SLIDE_DWELL_SEC} sec per PDF page + video length`
}

export type CourseContentMetrics = {
  slideCount: number
  pdfFileCount: number
  videoCount: number
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

  // 'replace' mode swaps a PDF page → net slide count unchanged
  // 'after' mode inserts after a page → net slide count +0 for PDF, video counted normally
  const replacedCountByPdf = new Map<string, number>()
  for (const s of playlist) {
    if (s.type === 'video' && s.pageReplace && (s.pageReplace.mode ?? 'replace') === 'replace') {
      const id = s.pageReplace.pdfSlideId
      replacedCountByPdf.set(id, (replacedCountByPdf.get(id) ?? 0) + 1)
    }
  }

  let slideCount = 0
  let pdfFileCount = 0
  let videoCount = 0
  let durationSeconds = 0

  for (const slide of playlist) {
    if (slide.type === 'pdf') {
      const pages = pdfPages(slide)
      const replaced = Math.min(replacedCountByPdf.get(slide.id) ?? 0, pages)
      const effective = pages - replaced
      slideCount += effective
      pdfFileCount += 1
      durationSeconds += effective * LEARNER_SLIDE_DWELL_SEC
    } else if (slide.type === 'video') {
      slideCount += 1
      videoCount += 1
      durationSeconds += videoSeconds(slide)
    }
  }

  return {
    slideCount: Math.max(slideCount, playlist.length > 0 ? 1 : 0),
    pdfFileCount,
    videoCount,
    durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
  }
}

/** Flatten playlist into learner steps in saved order.
 *  Videos with `pageReplace` are injected at the specified PDF page position
 *  and do NOT appear again as standalone slides. */
export function buildLearnerUnits(slides: CourseSlide[]): LearnerUnit[] {
  const playlist = getContentPlaylist(slides)

  // Build two maps per PDF:
  //   replaceMap: pageNumber → video that replaces that page
  //   afterMap:   pageNumber → video inserted after that page
  const replaceMap = new Map<string, Map<number, CourseSlide>>()
  const afterMap = new Map<string, Map<number, CourseSlide>>()
  for (const s of playlist) {
    if (s.type === 'video' && s.pageReplace) {
      const { pdfSlideId, pageNumber, mode } = s.pageReplace
      const map = mode === 'after' ? afterMap : replaceMap
      if (!map.has(pdfSlideId)) map.set(pdfSlideId, new Map())
      map.get(pdfSlideId)!.set(pageNumber, s)
    }
  }

  const emittedInline = new Set<string>()
  const units: LearnerUnit[] = []

  const makeVideoUnit = (s: CourseSlide): LearnerUnit => ({
    unitId: `${s.id}-v`,
    sourceSlideId: s.id,
    kind: 'video',
    url: s.url,
    title: s.title ?? s.fileName,
    minDwellSec: 0,
    durationSec: videoSeconds(s),
  })

  for (const slide of playlist) {
    if (slide.type === 'pdf') {
      const urls = slide.renderedSlideUrls?.filter(Boolean) ?? []
      const n = urls.length > 0 ? urls.length : pdfPages(slide)
      const pdfReplace = replaceMap.get(slide.id)
      const pdfAfter = afterMap.get(slide.id)

      for (let i = 0; i < n; i++) {
        const pageNumber = i + 1
        const repVideo = pdfReplace?.get(pageNumber)
        if (repVideo) {
          // Swap page with video
          emittedInline.add(repVideo.id)
          units.push(makeVideoUnit(repVideo))
        } else {
          // Normal page
          units.push({
            unitId: `${slide.id}-p${i}`,
            sourceSlideId: slide.id,
            kind: 'image',
            url: urls.length > 0 ? urls[i] : slide.url,
            title: slide.title ?? slide.fileName,
            minDwellSec: LEARNER_SLIDE_DWELL_SEC,
          })
          // Insert-after video immediately following this page
          const afterVideo = pdfAfter?.get(pageNumber)
          if (afterVideo) {
            emittedInline.add(afterVideo.id)
            units.push(makeVideoUnit(afterVideo))
          }
        }
      }
    } else if (slide.type === 'video' && !emittedInline.has(slide.id)) {
      units.push(makeVideoUnit(slide))
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

/** Human-readable breakdown from total seconds (e.g. 3900 → "1 hr 5 min"). */
export function formatDurationBreakdown(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0 && m > 0) return h === 1 ? `1 hr ${m} min` : `${h} hr ${m} min`
  if (h > 0) return h === 1 ? '1 hour' : `${h} hours`
  if (m > 0) return `${m} min`
  return `${sec} sec`
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
