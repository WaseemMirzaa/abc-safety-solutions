import { certificateBrandName } from '@/config/brandAssets'
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

export function formatCertExpiration(expiresAt: string | null | undefined): string {
  if (!certificateHasExpiry(expiresAt)) return 'Lifetime'
  return formatCertDate(expiresAt!)
}

function isInvalidCertificationLine(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  const brand = certificateBrandName.toLowerCase()
  return normalized === brand || normalized === `${brand}, inc.` || normalized.length < 15
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

/** Line shown on the certificate (category regulation text or category name). */
export function resolveCertificateCategoryLine(cert: Certificate, categories: Category[]): string | undefined {
  const category = cert.categoryId ? categories.find((c) => c.id === cert.categoryId) : undefined
  const candidates = [
    cert.certificationText?.trim(),
    category?.certificationText?.trim(),
    category?.name?.trim(),
  ].filter(Boolean) as string[]

  for (const line of candidates) {
    if (!isInvalidCertificationLine(line)) return line
  }

  return category?.name?.trim() || undefined
}
