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

export function getCourseSlideCount(course: Course): number {
  const n = getCourseSlides(course).length
  if (n > 0) return n
  return Math.max(1, course.slideCount)
}

export function slideTypeFromFile(file: File): CourseSlideType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/')) return 'video'
  return null
}
