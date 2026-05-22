import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, ChevronRight, Eye } from 'lucide-react'
import { CertificateVisual, SAMPLE_CERTIFICATE } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCategories, fetchMyCertificates } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import {
  certExpiryState,
  certificateCopyText,
  certificateDisplayId,
  certificateHasExpiry,
  certificateRouteParam,
  formatCertDate,
} from '@/lib/certificateDisplay'
import { CopyCertificateIdButton } from '@/components/CopyCertificateIdButton'
import { listContainer, listItem } from '@/lib/motionPresets'
import { clsx } from 'clsx'
import { t } from '@/i18n/t'

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const state = certExpiryState(expiresAt)
  const label =
    state === 'none'
      ? t('ui_cert_list_no_expiry')
      : state === 'expired'
        ? t('ui_cert_list_expired')
        : t('ui_cert_list_active')
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        state === 'expired' && 'bg-red-100 text-red-800',
        state === 'active' && 'bg-emerald-100 text-emerald-800',
        state === 'none' && 'bg-slate-100 text-slate-600',
      )}
    >
      {label}
    </span>
  )
}

export function CertificatesPage() {
  const { user } = useAuth()
  const { data: certs = [] } = useQuery({
    queryKey: qk.certificates,
    queryFn: fetchMyCertificates,
    enabled: Boolean(user),
  })
  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    enabled: Boolean(user),
  })

  const listShowsExpiry = certs.some((c) => certificateHasExpiry(c.expiresAt))

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">{t('CertificatesPage_22_certificates_fc4642ee51')}</h1>
          <p className="mt-3 text-slate-600">{t('CertificatesPage_23_sign_in_to_view_credentials_earned_on_this_devic_5f1914b3c9')}</p>
          <Link to="/login" className="mt-10 inline-block">
            <Button>{t('CertificatesPage_25_sign_in_00d939efe1')}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-900/20">
            <Award className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">{t('CertificatesPage_40_certificates_583170f8cf')}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">{t('ui_certificates_list_blurb')}</p>
          </div>
        </div>

        {certs.length === 0 ? (
          <div className="mt-14 space-y-10">
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-8 py-12 text-center text-slate-600">
              <p className="font-medium text-brand-900">{t('CertificatesPage_59_no_certificates_on_this_device_yet_15d006e7f7')}</p>
              <Link to="/my-courses" className="mt-6 inline-block">
                <Button>{t('CertificatesPage_61_go_to_my_learning_4701894b0e')}</Button>
              </Link>
            </div>
            <div className="min-w-0 rounded-3xl border border-slate-200/90 bg-white/80 p-4 shadow-sm sm:p-8">
              <p className="text-center font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:text-xs">
                {t('ui_certificates_design_preview')}
              </p>
              <CertificateVisual
                cert={SAMPLE_CERTIFICATE}
                categories={categoryList}
                variant="compact"
                sampleWatermark
                className="mx-auto mt-4 max-w-md"
              />
              <p className="mt-4 text-center text-sm text-slate-500">{t('ui_certificates_sample_hint')}</p>
            </div>
          </div>
        ) : (
          <motion.div className="mt-10" variants={listContainer} initial="hidden" animate="show">
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">{t('ui_cert_list_col_course')}</th>
                    <th className="px-5 py-3">{t('ui_cert_list_col_id', { defaultValue: 'Certificate ID' })}</th>
                    <th className="px-5 py-3">{t('ui_cert_list_col_issued')}</th>
                    {listShowsExpiry ? (
                      <>
                        <th className="px-5 py-3">{t('ui_cert_list_col_expires')}</th>
                        <th className="px-5 py-3">{t('ui_cert_list_col_status')}</th>
                      </>
                    ) : null}
                    <th className="px-5 py-3 text-right">{t('ui_cert_list_col_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c) => {
                    const rowHasExpiry = certificateHasExpiry(c.expiresAt)
                    return (
                    <motion.tr
                      key={c.id}
                      variants={listItem}
                      className="border-b border-slate-100 last:border-0 transition hover:bg-sky-50/40"
                    >
                      <td className="px-5 py-4 font-medium text-brand-900">{c.courseName}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {certificateDisplayId(c)}
                          </span>
                          <CopyCertificateIdButton text={certificateCopyText(c)} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatCertDate(c.issuedAt)}</td>
                      {listShowsExpiry ? (
                        <>
                          <td className="px-5 py-4 text-slate-600">
                            {rowHasExpiry ? formatCertDate(c.expiresAt!) : null}
                          </td>
                          <td className="px-5 py-4">
                            <ExpiryBadge expiresAt={c.expiresAt} />
                          </td>
                        </>
                      ) : null}
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/certificates/${encodeURIComponent(certificateRouteParam(c))}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('ui_cert_list_view')}
                        </Link>
                      </td>
                    </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-4 md:hidden">
              {certs.map((c) => {
                const rowHasExpiry = certificateHasExpiry(c.expiresAt)
                return (
                <motion.li
                  key={c.id}
                  variants={listItem}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-brand-900">{c.courseName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {certificateDisplayId(c)}
                    </span>
                    <CopyCertificateIdButton text={certificateCopyText(c)} />
                  </div>
                  <dl
                    className={clsx(
                      'mt-3 gap-2 text-xs text-slate-600',
                      rowHasExpiry ? 'grid grid-cols-2' : 'grid grid-cols-1',
                    )}
                  >
                    <div>
                      <dt className="font-medium text-slate-500">{t('ui_cert_list_col_issued')}</dt>
                      <dd>{formatCertDate(c.issuedAt)}</dd>
                    </div>
                    {rowHasExpiry ? (
                      <div>
                        <dt className="font-medium text-slate-500">{t('ui_cert_list_col_expires')}</dt>
                        <dd>{formatCertDate(c.expiresAt!)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div
                    className={clsx(
                      'mt-3 flex items-center gap-3',
                      rowHasExpiry ? 'justify-between' : 'justify-end',
                    )}
                  >
                    <ExpiryBadge expiresAt={c.expiresAt} />
                    <Link
                      to={`/certificates/${encodeURIComponent(certificateRouteParam(c))}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700"
                    >
                      {t('ui_cert_list_view')}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </Container>
    </div>
  )
}
