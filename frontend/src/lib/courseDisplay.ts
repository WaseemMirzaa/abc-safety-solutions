import type { Category, Course } from '@/types'
import { isSeedCategoryId, isSeedCourseId } from '@/data/catalog'
import {
  getCourseSlideCount,
  getCourseSlides,
  getPptxDeckSlide,
  isPptxDeckCourse,
  isVideoCourse,
} from '@/lib/courseSlides'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import {
  localizedCategoryName,
  localizedCourseDescription,
  localizedCourseSummary,
  localizedCourseTitle,
} from '@/lib/catalogLocale'
import { t } from '@/i18n/t'

/** Title shown on catalog, detail, learn — DB value for admin-created courses. */
export function displayCourseTitle(course: Course): string {
  if (isSeedCourseId(course.id)) return localizedCourseTitle(course.slug, course.title)
  return course.title.trim() || course.slug
}

export function displayCourseSummary(course: Course): string {
  if (isSeedCourseId(course.id)) return localizedCourseSummary(course.slug, course.summary)
  return course.summary.trim()
}

export function displayCourseDescription(course: Course): string {
  if (isSeedCourseId(course.id)) return localizedCourseDescription(course.slug, course.description)
  const d = course.description.trim()
  return d || course.summary.trim()
}

export function displayCategoryName(cat: Category): string {
  if (isSeedCategoryId(cat.id)) return localizedCategoryName(cat.id, cat.name)
  return cat.name
}

export function displayCourseImageUrl(course: Course): string {
  const url = course.imageUrl?.trim()
  if (!url) return ''
  return resolveMediaUrl(url)
}

/** Slides line for catalog/detail; null if admin has not uploaded content yet. */
export function displaySlideCount(course: Course): number | null {
  const slides = getCourseSlides(course)
  if (!slides.length) return null
  if (isVideoCourse(course)) return 1
  const deck = getPptxDeckSlide(course)
  if (deck?.deckSlideCount && deck.deckSlideCount > 0) return deck.deckSlideCount
  if (isPptxDeckCourse(course)) return getCourseSlideCount(course)
  return slides.length
}

export function displaySlidesLabel(course: Course): string {
  const count = displaySlideCount(course)
  if (count == null) {
    return t('ui_course_slides_pending', {
      defaultValue: 'Slide deck — added by your instructor in Admin',
    })
  }
  if (isVideoCourse(course)) {
    return t('ui_course_format_video', {
      defaultValue: 'Video-based training — complete the video to unlock the test',
    })
  }
  if (isPptxDeckCourse(course)) {
    return t('ui_course_slides_pptx', {
      count,
      defaultValue: '{{count}} PowerPoint slides with voice-over',
    })
  }
  return t('ui_course_slides_voice', { count })
}
