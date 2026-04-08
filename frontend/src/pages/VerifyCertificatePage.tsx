import { useState } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Search, ShieldCheck } from 'lucide-react'
import { t } from '@/i18n/t'

/** Public verify stub — backend will expose GET /certificates/verify/:id */
export function VerifyCertificatePage() {
  const [id, setId] = useState('')

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
          />
          <Button className="mt-6 w-full gap-2" disabled>
            <Search className="h-4 w-4" />
            {t('ui_verify_btn')}
          </Button>
        </div>
      </Container>
    </div>
  )
}
