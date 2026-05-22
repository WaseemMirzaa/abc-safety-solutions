import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { CertificateVisual } from '@/components/CertificateVisual'
import { VerifyNotFoundModal } from '@/components/VerifyNotFoundModal'
import { Search, ShieldCheck, BadgeCheck } from 'lucide-react'
import { t } from '@/i18n/t'
import { ApiError } from '@/api/client'
import { fetchCategories, fetchCertificateVerify, type CertificateVerifyResult } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { certificateDisplayId, formatCertDate } from '@/lib/certificateDisplay'
import type { Certificate } from '@/types'

function verifyResultToCertificate(r: CertificateVerifyResult): Certificate {
  const num =
    r.certificateNumber ?? (/^\d+$/.test(r.certificateId) ? parseInt(r.certificateId, 10) : undefined)
  return {
    id: r.certificateId,
    certificateNumber: num,
    courseId: 'verify',
    courseName: r.courseName,
    userName: r.issuedTo,
    issuedAt: r.issuedAt,
    expiresAt: r.expiresAt,
    certificationText: r.certificationText ?? undefined,
    categoryId: r.categoryId,
  }
}

export function VerifyCertificatePage() {
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFoundOpen, setNotFoundOpen] = useState(false)
  const [notFoundId, setNotFoundId] = useState('')
  const [result, setResult] = useState<CertificateVerifyResult | null>(null)

  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    staleTime: 60_000,
  })

  async function verify() {
    const trimmed = id.trim().replace(/^#/, '')
    if (!trimmed) {
      setError(t('ui_verify_err_empty'))
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setNotFoundOpen(false)
    try {
      const r = await fetchCertificateVerify(trimmed)
      if (!r?.valid) {
        setNotFoundId(id.trim())
        setNotFoundOpen(true)
        return
      }
      setResult(r)
    } catch (e) {
      setResult(null)
      if (e instanceof ApiError && e.status === 404) {
        setNotFoundId(id.trim())
        setNotFoundOpen(true)
      } else {
        setError(
          e instanceof ApiError && e.status === 0
            ? t('ui_verify_err_network', {
                defaultValue: 'Could not reach the server. Check your connection and try again.',
              })
            : t('ui_verify_err_generic'),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const verifiedCert = result ? verifyResultToCertificate(result) : null

  return (
    <div className="py-16 sm:py-24">
      <Container className={verifiedCert ? 'max-w-4xl' : 'max-w-lg'}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">
          {t('VerifyCertificatePage_16_verify_certificate_fb6cf45582')}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {t('ui_verify_intro', {
            defaultValue: 'Enter a certificate ID to confirm validity and view the official credential.',
          })}
        </p>
        <div className="card-elevated mt-8 p-6">
          <label htmlFor="cert-id" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('ui_verify_label_id')}
          </label>
          <input
            id="cert-id"
            className="input-pro mt-2 font-mono text-sm"
            placeholder={t('ui_verify_cert_placeholder', { defaultValue: 'e.g. 100001 or #100001' })}
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && void verify()}
          />
          <Button className="mt-6 w-full gap-2" disabled={loading} onClick={() => void verify()}>
            <Search className="h-4 w-4" />
            {loading
              ? t('ui_verify_loading')
              : t('ui_verify_btn', { defaultValue: 'Verify Now' })}
          </Button>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>

        {verifiedCert ? (
          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 to-white px-5 py-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                <BadgeCheck className="h-4 w-4" aria-hidden />
                {t('ui_verify_valid_badge', { defaultValue: 'Valid certificate' })}
              </span>
              <span className="font-mono text-sm font-semibold text-slate-700">
                {certificateDisplayId(verifiedCert)}
              </span>
              <span className="text-sm text-slate-600">
                {t('ui_verify_issued_at')}: {formatCertDate(verifiedCert.issuedAt)}
                {verifiedCert.expiresAt
                  ? ` · ${t('ui_verify_expires')}: ${formatCertDate(verifiedCert.expiresAt)}`
                  : ''}
              </span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 shadow-lg sm:p-6">
              <CertificateVisual cert={verifiedCert} categories={categoryList} />
            </div>
          </div>
        ) : null}
      </Container>

      <VerifyNotFoundModal
        open={notFoundOpen}
        searchedId={notFoundId}
        onClose={() => setNotFoundOpen(false)}
      />
    </div>
  )
}
