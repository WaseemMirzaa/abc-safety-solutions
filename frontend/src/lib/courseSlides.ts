import type { Course, CourseSlide, CourseSlideType } from '@/types'

export type CourseContentMode = 'pptx' | 'video'

/** Effective slide list (new `slides` field or legacy `slideImageUrls`). */
export function getCourseSlides(course: Course): CourseSlide[] {
  if (course.slides?.length) return course.slides
  const legacy = course.slideImageUrls?.filter(Boolean) ?? []
  return legacy.map((url, i) => ({
    id: `legacy-${i}`,
    type: 'image' as const,
    url,
  }))
}

const PRESENTATION_TYPES = new Set<CourseSlideType>(['pptx', 'ppt', 'pdf'])

export function isPresentationDeckType(type: CourseSlideType | undefined): boolean {
  return type != null && PRESENTATION_TYPES.has(type)
}

/** Primary slide deck: PowerPoint or PDF (image-based playback). */
export function getPresentationDeckSlide(course: Course): CourseSlide | undefined {
  return getCourseSlides(course).find((s) => isPresentationDeckType(s.type))
}

/** @deprecated Use getPresentationDeckSlide */
export function getPptxDeckSlide(course: Course): CourseSlide | undefined {
  return getPresentationDeckSlide(course)
}

/** Learner-facing slide total for a deck (prefer server-rendered PNG count). */
export function getDeckLearnerSlideCount(course: Course): number {
  if (isVideoCourse(course)) return 1
  const slides = getCourseSlides(course)
  const deck = slides.find((s) => isPresentationDeckType(s.type))
  if (deck) {
    const rendered = deck.renderedSlideUrls?.filter(Boolean).length ?? 0
    if (rendered > 0) return rendered
    if (deck.deckSlideCount && deck.deckSlideCount > 0) return deck.deckSlideCount
    return Math.max(1, course.slideCount || 1)
  }
  if (slides.length > 0) {
    if (slides.every((s) => isPresentationDeckType(s.type))) return Math.max(1, course.slideCount)
    return slides.length
  }
  return Math.max(1, course.slideCount)
}

export function getDeckRenderedSlideUrls(course: Course): string[] {
  const deck = getPresentationDeckSlide(course)
  return deck?.renderedSlideUrls?.filter(Boolean) ?? []
}

export function getVideoSlide(course: Course): CourseSlide | undefined {
  return getCourseSlides(course).find((s) => s.type === 'video')
}

/** Primary delivery format: one .pptx deck or one training video. */
export function getCourseContentMode(course: Course): CourseContentMode {
  const slides = getCourseSlides(course)
  const hasPresentation = slides.some((s) => isPresentationDeckType(s.type))
  const hasVideo = slides.some((s) => s.type === 'video')
  if (hasVideo && !hasPresentation) return 'video'
  return 'pptx'
}

export function isVideoCourse(course: Course): boolean {
  return getCourseContentMode(course) === 'video'
}

export function isPresentationDeckCourse(course: Course): boolean {
  const deck = getPresentationDeckSlide(course)
  return Boolean(deck && (deck.type === 'pptx' || deck.type === 'pdf'))
}

export function isPptxDeckCourse(course: Course): boolean {
  return getPresentationDeckSlide(course)?.type === 'pptx'
}

export function isPdfDeckCourse(course: Course): boolean {
  return getPresentationDeckSlide(course)?.type === 'pdf'
}

export function isLegacyPptDeck(course: Course): boolean {
  return getPresentationDeckSlide(course)?.type === 'ppt'
}

export function getCourseSlideCount(course: Course): number {
  return getDeckLearnerSlideCount(course)
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogg', '.m4v', '.avi', '.mkv'] as const

export function slideTypeFromFile(file: File): CourseSlideType | null {
  const name = file.name.toLowerCase()
  const mime = (file.type ?? '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'video'
  if (name.endsWith('.pptx') || mime.includes('presentationml.presentation')) return 'pptx'
  if (name.endsWith('.ppt') || mime === 'application/vnd.ms-powerpoint') return 'ppt'
  if (
    (mime === 'application/zip' ||
      mime === 'application/x-zip-compressed' ||
      mime === 'application/octet-stream' ||
      !mime) &&
    name.endsWith('.pptx')
  ) {
    return 'pptx'
  }
  if ((mime === 'application/octet-stream' || !mime) && name.endsWith('.ppt')) {
    return 'ppt'
  }
  if ((mime === 'application/octet-stream' || !mime) && name.endsWith('.pdf')) {
    return 'pdf'
  }
  return null
}
