import { clsx } from 'clsx'
import { Award, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resolveCertificateCategoryLine } from '@/lib/certificateDisplay'
import { localizedCategoryCertLine } from '@/lib/catalogLocale'
import type { Category, Certificate } from '@/types'
import { brandLogoLight } from '@/config/brandAssets'

type Props = {
  cert: Certificate
  /** Used when certification text was not snapshotted at issue. */
  categories?: Category[]
  variant?: 'full' | 'compact'
  /** When true, shows a faint “SAMPLE” ribbon (preview layout). */
  sampleWatermark?: boolean
  className?: string
}

function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg
      className={clsx(
        'pointer-events-none h-8 w-8 text-sky-700/[0.28] sm:h-11 sm:w-11 md:h-14 md:w-14',
        className,
      )}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 4v14h4V8h10V4H4zm34 0v4h10v10h4V4H38zM4 38v14h14v-4H8V38H4zm38 0v10H38v4h14V38h-4z"
        fill="currentColor"
      />
      <path
        d="M28 12c-2.5 3.5-6 6.5-6 12 0 5 3.5 8.5 6 12 2.5-3.5 6-7 6-12 0-5.5-3.5-8.5-6-12z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity="0.5"
      />
    </svg>
  )
}

export function CertificateVisual({ cert, categories = [], variant = 'full', sampleWatermark, className }: Props) {
  const { t } = useTranslation()
  const issued = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(cert.issuedAt))
  const expires =
    cert.expiresAt != null && cert.expiresAt !== ''
      ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(cert.expiresAt))
      : null
  const compact = variant === 'compact'
  const rawLine = resolveCertificateCategoryLine(cert, categories)
  const cid = cert.categoryId ?? 'cat-ohs'
  const categoryLine = rawLine ? localizedCategoryCertLine(cid, rawLine) : undefined
  const displayCourseName =
    cert.id === 'SAMPLE-CERT-PREVIEW' ? t('ui_cert_sample_course') : cert.courseName
  const displayUserName = cert.id === 'SAMPLE-CERT-PREVIEW' ? t('ui_cert_sample_user') : cert.userName

  return (
    <div
      className={clsx(
        'certificate-paper relative w-full min-w-0 max-w-full shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(10,15,28,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]',
        compact ? 'rounded-lg px-3 py-5 sm:px-7 sm:py-8' : 'rounded-xl px-3 py-6 sm:px-10 sm:py-10 md:px-14 md:py-12',
        'print:shadow-none print:ring-1 print:ring-sky-200/80',
        className,
      )}
    >
      {sampleWatermark ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <span
            className="font-cert-serif text-[clamp(3rem,18vw,7rem)] font-bold uppercase tracking-[0.2em] text-sky-600/[0.1] rotate-[-18deg] select-none"
            style={{ fontFeatureSettings: '"smcp"' }}
          >
            {t('ui_cert_sample_ribbon')}
          </span>
        </div>
      ) : null}

      <CornerFlourish className="absolute left-1 top-1 sm:left-3 sm:top-3 md:left-5 md:top-5" />
      <CornerFlourish className="absolute right-1 top-1 rotate-90 sm:right-3 sm:top-3 md:right-5 md:top-5" />
      <CornerFlourish className="absolute bottom-1 left-1 rotate-[270deg] sm:bottom-3 sm:left-3 md:bottom-5 md:left-5" />
      <CornerFlourish className="absolute bottom-1 right-1 rotate-180 sm:bottom-3 sm:right-3 md:bottom-5 md:right-5" />

      <div
        className={clsx(
          'relative mx-auto min-w-0 max-w-full border-[3px] border-double border-brand-900/[0.22] bg-white/50 px-3 py-5 backdrop-blur-[0.5px] sm:px-6 sm:py-7 md:px-8 md:py-8',
          compact ? 'max-w-xl' : 'max-w-3xl',
        )}
      >
        <div className="pointer-events-none absolute inset-1.5 border border-sky-600/[0.18] sm:inset-2" aria-hidden />

        <div className="relative min-w-0 text-center">
          <div className="mx-auto flex flex-col items-center gap-3 px-1 sm:gap-4">
            <div
              className={clsx(
                'relative shrink-0 rounded-2xl border-2 border-sky-500/50 bg-gradient-to-b from-white to-sky-50/90 shadow-[0_8px_30px_-8px_rgba(2,132,199,0.35),0_2px_8px_-2px_rgba(15,23,42,0.12)] ring-2 ring-sky-300/60',
                compact ? 'p-2.5' : 'p-3 sm:p-4',
              )}
            >
              <img
                src={brandLogoLight}
                alt={t('ui_cert_logo_alt')}
                className={clsx(
                  'mx-auto block rounded-xl object-contain object-center p-1',
                  compact
                    ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]'
                    : 'h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 md:h-28 md:w-28',
                )}
              />
            </div>
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-sky-300/60 bg-gradient-to-r from-sky-50/95 to-sky-100/50 px-3 py-1.5 shadow-sm ring-1 ring-sky-700/10 sm:gap-2.5 sm:px-4 sm:py-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 sm:h-5 sm:w-5" aria-hidden />
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-900 sm:text-[11px] sm:tracking-[0.22em] md:text-xs md:tracking-[0.28em]">
                {t('ui_cert_badge_brand')}
              </span>
            </div>
          </div>

          <p
            className={clsx(
              'font-cert-serif mt-4 bg-gradient-to-r from-sky-800 to-brand-900 bg-clip-text font-semibold uppercase text-transparent sm:mt-5 print:bg-none print:text-sky-900',
              compact
                ? 'text-[10px] tracking-[0.2em] sm:text-[11px] sm:tracking-[0.32em]'
                : 'text-[10px] tracking-[0.22em] sm:text-xs sm:tracking-[0.32em] md:text-sm md:tracking-[0.42em]',
            )}
          >
            {t('ui_cert_heading_completion')}
          </p>

          <p
            className={clsx(
              'font-cert-serif mt-3 text-slate-600',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {t('ui_cert_certifies_that')}
          </p>

          <p
            className={clsx(
              'font-cert-script break-words px-1 leading-tight text-brand-950 [overflow-wrap:anywhere]',
              compact ? 'mt-2 text-[clamp(1.75rem,9vw,2.5rem)] sm:text-4xl' : 'mt-3 text-[clamp(2rem,10vw,3.75rem)] sm:text-5xl md:text-6xl',
            )}
          >
            {displayUserName}
          </p>

          <div
            className={clsx(
              'mx-auto mt-4 h-px max-w-md bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.55),rgba(245,158,11,0.35),transparent)]',
              compact ? 'w-40' : 'w-48',
            )}
          />

          <p
            className={clsx(
              'font-cert-serif mt-4 text-slate-600',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {t('ui_cert_has_completed')}
          </p>

          <p
            className={clsx(
              'font-cert-serif mt-2 break-words px-1 font-semibold leading-snug text-brand-900 [overflow-wrap:anywhere]',
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-xl md:text-2xl',
            )}
          >
            {displayCourseName}
          </p>

          {categoryLine ? (
            <p
              className={clsx(
                'font-cert-serif mx-auto mt-3 max-w-xl px-px italic leading-snug text-slate-700 [overflow-wrap:anywhere]',
                compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm',
              )}
            >
              {categoryLine}
            </p>
          ) : null}

          <p
            className={clsx(
              'font-cert-serif mt-4 px-1 text-slate-600 sm:mt-5',
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm',
            )}
          >
            {t('ui_cert_issued_on')}{' '}
            <span className="font-medium text-brand-800">{issued}</span>
            {expires ? (
              <>
                {' · '}
                {t('ui_cert_expires_on', { defaultValue: 'Expires' })}{' '}
                <span className="font-medium text-brand-800">{expires}</span>
              </>
            ) : null}
          </p>

          <div
            className={clsx(
              'flex flex-col items-stretch justify-between gap-6 sm:flex-row sm:items-end sm:gap-8',
              compact ? 'mt-6' : 'mt-8 sm:mt-10',
            )}
          >
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div
                className={clsx(
                  'mx-auto border-t border-brand-900/20 sm:mx-0',
                  compact ? 'max-w-[9rem]' : 'max-w-[11rem]',
                )}
              />
              <p className="font-cert-serif mt-2 text-[10px] uppercase tracking-wider text-brand-700/70 sm:text-[11px]">
                {t('ui_cert_training_director')}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
              <div
                className={clsx(
                  'relative flex flex-col items-center justify-center rounded-full border-[3px] border-sky-700/35 bg-gradient-to-b from-amber-400 to-amber-600 text-brand-950 shadow-md shadow-amber-900/15 ring-2 ring-white/80',
                  compact ? 'h-[4.5rem] w-[4.5rem]' : 'h-20 w-20 sm:h-28 sm:w-28',
                )}
              >
                <Award className={clsx('text-brand-950', compact ? 'h-7 w-7' : 'h-8 w-8 sm:h-10 sm:w-10')} />
                <span className="font-display mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-brand-950/85 sm:text-[8px] sm:tracking-[0.15em]">
                  {t('ui_cert_official')}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-right">
              <div
                className={clsx(
                  'mx-auto border-t border-brand-900/20 sm:ml-auto sm:mr-0',
                  compact ? 'max-w-[9rem]' : 'max-w-[11rem]',
                )}
              />
              <p className="font-cert-serif mt-2 text-[10px] uppercase tracking-wider text-brand-700/70 sm:text-[11px]">
                {t('ui_cert_credential_record')}
              </p>
            </div>
          </div>

          <p className="mt-6 break-all px-1 font-mono text-[9px] text-sky-800/45 sm:mt-8 sm:text-[10px] md:text-[11px]">
            {t('ui_cert_id_prefix')} {cert.id}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Layout preview; display copy comes from locales (ui_cert_sample_*). */
export const SAMPLE_CERTIFICATE: Certificate = {
  id: 'SAMPLE-CERT-PREVIEW',
  courseId: 'sample',
  courseName: '',
  userName: '',
  issuedAt: new Date().toISOString(),
  certificationText: '',
  categoryId: 'cat-ohs',
}
