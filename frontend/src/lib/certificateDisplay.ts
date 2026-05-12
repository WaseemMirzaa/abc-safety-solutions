import type { Category, Certificate } from '@/types'

/** Line shown on the certificate; prefers snapshot at issue, else category list lookup. */
export function resolveCertificateCategoryLine(cert: Certificate, categories: Category[]): string | undefined {
  const snap = cert.certificationText?.trim()
  if (snap) return snap
  const cid = cert.categoryId
  if (!cid) return undefined
  return categories.find((c) => c.id === cid)?.certificationText?.trim() || undefined
}
