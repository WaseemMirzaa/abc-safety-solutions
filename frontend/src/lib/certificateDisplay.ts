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

export function formatCertificateNumber(n: number): string {
  return `#${n}`
}

export function certificateDisplayId(cert: Certificate): string {
  if (cert.certificateNumber != null) return formatCertificateNumber(cert.certificateNumber)
  return cert.id
}

export function certificateCopyText(cert: Certificate): string {
  if (cert.certificateNumber != null) return formatCertificateNumber(cert.certificateNumber)
  return cert.id
}

export function certificateRouteParam(cert: Certificate): string {
  if (cert.certificateNumber != null) return String(cert.certificateNumber)
  return cert.id
}

export function findCertificateById(certs: Certificate[], param: string): Certificate | undefined {
  const raw = param.trim().replace(/^#/, '')
  return certs.find(
    (c) =>
      c.id === param ||
      c.id === raw ||
      (c.certificateNumber != null &&
        (String(c.certificateNumber) === raw || String(c.certificateNumber) === param)),
  )
}

/** Line shown on the certificate; prefers snapshot at issue, else category list lookup. */
export function resolveCertificateCategoryLine(cert: Certificate, categories: Category[]): string | undefined {
  const snap = cert.certificationText?.trim()
  if (snap) return snap
  const cid = cert.categoryId
  if (!cid) return undefined
  return categories.find((c) => c.id === cid)?.certificationText?.trim() || undefined
}
