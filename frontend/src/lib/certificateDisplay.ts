import type { Category, Certificate } from '@/types'

export function formatCertDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(d)
}

export type CertExpiryState = 'none' | 'active' | 'expired'

export function certificateHasExpiry(expiresAt: string | null | undefined): boolean {
  return Boolean(expiresAt?.trim())
}

export function certExpiryState(expiresAt: string | null | undefined): CertExpiryState {
  if (!certificateHasExpiry(expiresAt)) return 'none'
  return new Date(expiresAt!) < new Date() ? 'expired' : 'active'
}

export function findCertificateById(certs: Certificate[], id: string): Certificate | undefined {
  return certs.find((c) => c.id === id)
}

/** Line shown on the certificate; prefers snapshot at issue, else category list lookup. */
export function resolveCertificateCategoryLine(cert: Certificate, categories: Category[]): string | undefined {
  const snap = cert.certificationText?.trim()
  if (snap) return snap
  const cid = cert.categoryId
  if (!cid) return undefined
  return categories.find((c) => c.id === cid)?.certificationText?.trim() || undefined
}
