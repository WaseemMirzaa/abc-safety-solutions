import type { Course, CourseSlide, CourseSlideType } from '@/types'

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

export function isPptxDeckCourse(course: Course): boolean {
  const deck = getPptxDeckSlide(course)
  return Boolean(deck && deck.type === 'pptx')
}

export function isLegacyPptDeck(course: Course): boolean {
  return getPptxDeckSlide(course)?.type === 'ppt'
}

export function getCourseSlideCount(course: Course): number {
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

export function slideTypeFromFile(file: File): CourseSlideType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/')) return 'video'
  const name = file.name.toLowerCase()
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx')
  ) {
    return 'pptx'
  }
  if (file.type === 'application/vnd.ms-powerpoint' || name.endsWith('.ppt')) {
    return 'ppt'
  }
  return null
}
