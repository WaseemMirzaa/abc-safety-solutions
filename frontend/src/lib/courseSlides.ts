import type { Course } from '@/types'

/** When `slideImageUrls` is non-empty, slide count follows uploads; otherwise `slideCount`. */
export function getCourseSlideCount(course: Course): number {
  const n = course.slideImageUrls?.length ?? 0
  if (n > 0) return n
  return Math.max(1, course.slideCount)
}
