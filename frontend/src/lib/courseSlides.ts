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

export function getPptxDeckSlide(course: Course): CourseSlide | undefined {
  return getCourseSlides(course).find((s) => s.type === 'pptx' || s.type === 'ppt')
}

export function getVideoSlide(course: Course): CourseSlide | undefined {
  return getCourseSlides(course).find((s) => s.type === 'video')
}

/** Primary delivery format: one .pptx deck or one training video. */
export function getCourseContentMode(course: Course): CourseContentMode {
  const slides = getCourseSlides(course)
  const hasPptx = slides.some((s) => s.type === 'pptx' || s.type === 'ppt')
  const hasVideo = slides.some((s) => s.type === 'video')
  if (hasVideo && !hasPptx) return 'video'
  return 'pptx'
}

export function isVideoCourse(course: Course): boolean {
  return getCourseContentMode(course) === 'video'
}

export function isPptxDeckCourse(course: Course): boolean {
  const deck = getPptxDeckSlide(course)
  return Boolean(deck && deck.type === 'pptx')
}

export function isLegacyPptDeck(course: Course): boolean {
  return getPptxDeckSlide(course)?.type === 'ppt'
}

export function getCourseSlideCount(course: Course): number {
  if (isVideoCourse(course)) return 1
  const slides = getCourseSlides(course)
  const deck = slides.find((s) => s.type === 'pptx' || s.type === 'ppt')
  if (deck?.deckSlideCount && deck.deckSlideCount > 0) return deck.deckSlideCount
  if (deck && course.slideCount >= 1) return course.slideCount
  if (slides.length > 0) {
    if (slides.every((s) => s.type === 'pptx' || s.type === 'ppt')) return Math.max(1, course.slideCount)
    return slides.length
  }
  return Math.max(1, course.slideCount)
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
  return null
}
