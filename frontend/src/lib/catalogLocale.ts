import { t } from '@/i18n/t'

function catKid(categoryId: string): string {
  return categoryId.replace(/^cat-/, '')
}

export function localizedCategoryName(categoryId: string, fallback: string): string {
  return t(`catalog_cat_${catKid(categoryId)}_name`, { defaultValue: fallback })
}

/** Localize category certification line (matches catalog seed + overrides). */
export function localizedCategoryCertLine(categoryId: string, fallback: string): string {
  return t(`catalog_cat_${catKid(categoryId)}_cert`, { defaultValue: fallback })
}

export function localizedCourseTitle(slug: string, fallback: string): string {
  const k = `catalog_course_${slug.replace(/-/g, '_')}_title`
  return t(k, { defaultValue: fallback })
}

export function localizedCourseSummary(slug: string, fallback: string): string {
  const k = `catalog_course_${slug.replace(/-/g, '_')}_summary`
  return t(k, { defaultValue: fallback })
}

export function localizedCourseDescription(slug: string, fallback: string): string {
  const k = `catalog_course_${slug.replace(/-/g, '_')}_description`
  return t(k, { defaultValue: fallback })
}
