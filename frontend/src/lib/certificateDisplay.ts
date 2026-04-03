import { mergeCourses } from '@/api/localData'
import { getCategoryById } from '@/data/catalog'
import type { Certificate } from '@/types'

/** Line shown on the certificate; prefers snapshot at issue, else current category text. */
export function resolveCertificateCategoryLine(cert: Certificate): string | undefined {
  const snap = cert.certificationText?.trim()
  if (snap) return snap
  const course = mergeCourses().find((c) => c.id === cert.courseId)
  if (!course) return undefined
  const line = getCategoryById(course.categoryId)?.certificationText?.trim()
  return line || undefined
}
