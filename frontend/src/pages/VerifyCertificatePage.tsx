import { useState } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Search, ShieldCheck } from 'lucide-react'
import { t } from '@/i18n/t'
import { ApiError } from '@/api/client'
import { fetchCertificateVerify, type CertificateVerifyResult } from '@/api/localData'

export function VerifyCertificatePage() {
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CertificateVerifyResult | null>(null)

  async function verify() {
    const trimmed = id.trim()
    if (!trimmed) {
      setError(t('ui_verify_err_empty'))
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetchCertificateVerify(trimmed)
      setResult(r)
    } catch (e) {
      setResult(null)
      if (e instanceof ApiError && e.status === 404) {
        setError(t('ui_verify_err_generic'))
      } else {
        setError(t('ui_verify_err_generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">{t('VerifyCertificatePage_16_verify_certificate_fb6cf45582')}</h1>
        <p className="mt-3 text-sm text-slate-600">{t('ui_verify_intro')}</p>
        <div className="card-elevated mt-8 p-6">
          <label htmlFor="cert-id" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('ui_verify_label_id')}
          </label>
          <input
            id="cert-id"
            className="input-pro mt-2 font-mono text-sm"
            placeholder={t('ui_verify_cert_placeholder')}
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
          />
          <Button className="mt-6 w-full gap-2" disabled={loading} onClick={() => void verify()}>
            <Search className="h-4 w-4" />
            {loading ? t('ui_verify_loading') : t('ui_verify_btn')}
          </Button>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {result ? (
            <dl className="mt-6 space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">{t('ui_verify_course')}</dt>
                <dd className="font-medium text-slate-900">{result.courseName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">{t('ui_verify_issued_to')}</dt>
                <dd className="font-medium text-slate-900">{result.issuedTo}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600">{t('ui_verify_issued_at')}</dt>
                <dd className="text-slate-800">{new Date(result.issuedAt).toLocaleString()}</dd>
              </div>
              {result.expiresAt ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-600">{t('ui_verify_expires')}</dt>
                  <dd className="text-slate-800">{new Date(result.expiresAt).toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </Container>
    </div>
  )
}
