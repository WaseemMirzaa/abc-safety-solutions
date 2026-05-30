import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { brandLogoCustomer, certificateBrandName } from '@/config/brandAssets'
import { companyContact } from '@/config/companyContact'
import { certificateDisplayId, formatCertDate, resolveCertificateCategoryLine } from '@/lib/certificateDisplay'
import { localizedCategoryCertLine } from '@/lib/catalogLocale'
import type { Category, Certificate } from '@/types'

const FRAME_SRC = '/certificate-frame.png'
const COMPANY_ADDRESS = companyContact.addressLine
const COMPANY_PHONE = companyContact.phone
const COMPANY_EMAIL = companyContact.email
const OPERATIONS_DIRECTOR = companyContact.operationsDirector

type Props = {
  cert: Certificate
  categories?: Category[]
  variant?: 'full' | 'compact'
  sampleWatermark?: boolean
  className?: string
}

export function CertificateVisual({ cert, categories = [], variant = 'full', sampleWatermark, className }: Props) {
  const { t } = useTranslation()
  const compact = variant === 'compact'
  const rawLine = resolveCertificateCategoryLine(cert, categories)
  // Only apply i18n localisation when the category ID is known; never fall
  // back to 'cat-ohs' or the wrong category's text will show on every cert.
  const regulationLine = rawLine
    ? (cert.categoryId ? localizedCategoryCertLine(cert.categoryId, rawLine) : rawLine)
    : undefined
  const displayCourseName =
    cert.id === 'SAMPLE-CERT-PREVIEW' ? t('ui_cert_sample_course') : (cert.courseName || '—')
  const displayUserName =
    cert.id === 'SAMPLE-CERT-PREVIEW' ? t('ui_cert_sample_user') : (cert.userName || '—')
  const courseDate = formatCertDate(cert.issuedAt)
  const expirationDate = cert.expiresAt ? formatCertDate(cert.expiresAt) : null
  const dateIssued = courseDate

  return (
    <div
      className={clsx(
        'certificate-document relative mx-auto w-full max-w-4xl select-none bg-white',
        compact ? 'max-w-xl' : 'max-w-4xl',
        className,
      )}
      style={{ aspectRatio: '900 / 686' }}
    >
      <img
        src={FRAME_SRC}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        aria-hidden
      />

      {sampleWatermark ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <span className="rotate-[-18deg] text-[clamp(2.5rem,12vw,5rem)] font-bold uppercase tracking-[0.25em] text-black/10">
            {t('ui_cert_sample_ribbon')}
          </span>
        </div>
      ) : null}

      <div
        className={clsx(
          'absolute flex flex-col items-center text-center text-black',
          compact ? 'inset-[10%_12%_11%]' : 'inset-[9%_11%_10%]',
        )}
      >
        <img
          src={brandLogoCustomer}
          alt={t('ui_cert_logo_alt')}
          className={clsx(
            'object-contain',
            compact ? 'mb-2 h-12 w-auto max-w-[140px]' : 'mb-3 h-14 w-auto max-w-[180px] sm:h-16',
          )}
        />

        <h2
          className={clsx(
            'font-cert-serif font-bold uppercase leading-tight tracking-wide text-black',
            compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm md:text-base',
          )}
        >
          {t('ui_cert_title_attendance', {
            defaultValue: 'Certificate of Attendance and Successful Completion',
          })}
        </h2>

        <p
          className={clsx(
            'mt-3 font-sans font-bold uppercase tracking-[0.2em] text-black/80',
            compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]',
          )}
        >
          {t('ui_cert_label_course_name', { defaultValue: 'Course name' })}
        </p>
        <p
          className={clsx(
            'mt-1 font-cert-serif font-semibold uppercase leading-snug text-black',
            compact ? 'text-sm' : 'text-base sm:text-lg md:text-xl',
          )}
        >
          {displayCourseName}
        </p>

        {regulationLine ? (
          <>
            <p
              className={clsx(
                'mt-3 font-sans font-bold uppercase tracking-[0.18em] text-black/75',
                compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]',
              )}
            >
              {t('ui_cert_label_regulation', { defaultValue: 'Regulation quoted' })}
            </p>
            <p
              className={clsx(
                'mt-1 max-w-prose px-2 font-cert-serif italic leading-snug text-black/90',
                compact ? 'text-[10px] line-clamp-3' : 'text-xs sm:text-sm',
              )}
            >
              {regulationLine}
            </p>
          </>
        ) : null}

        <p
          className={clsx(
            'font-cert-script mt-4 leading-none text-black',
            compact ? 'text-3xl' : 'text-4xl sm:text-5xl md:text-[3.25rem]',
          )}
        >
          {certificateBrandName}
        </p>
        <p
          className={clsx(
            'mt-3 font-sans font-bold uppercase tracking-[0.2em] text-black/80',
            compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]',
          )}
        >
          {t('ui_cert_label_attendee', { defaultValue: 'Attendee name' })}
        </p>
        <p
          className={clsx(
            'mt-1 font-cert-serif font-semibold uppercase leading-snug text-black',
            compact ? 'text-sm' : 'text-base sm:text-lg md:text-xl',
          )}
        >
          {displayUserName}
        </p>

        <div
          className={clsx(
            'mt-4 flex w-full max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-1 font-sans text-black',
            compact ? 'text-[10px]' : 'text-xs sm:text-sm',
          )}
        >
          <p>
            <span className="font-semibold">{t('ui_cert_course_date', { defaultValue: 'Course date' })}:</span>{' '}
            {courseDate}
          </p>
          {expirationDate ? (
            <p>
              <span className="font-semibold">
                {t('ui_cert_expiration_date', { defaultValue: 'Expiration date' })}:
              </span>{' '}
              {expirationDate}
            </p>
          ) : null}
        </div>

        <div
          className={clsx(
            'mt-auto flex w-full items-end justify-between gap-4 pt-4 font-sans text-black',
            compact ? 'text-[9px]' : 'text-[10px] sm:text-xs',
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            <p className="font-cert-script text-2xl leading-none sm:text-3xl">{OPERATIONS_DIRECTOR}</p>
            <div className="mt-1 border-t border-black/40 pt-1">
              <p className="font-semibold uppercase tracking-wide">
                {t('ui_cert_operations_director', { defaultValue: 'Operations Director' })}
              </p>
            </div>
            <p className="mt-2">
              <span className="font-semibold">{t('ui_cert_date_issued', { defaultValue: 'Date issued' })}:</span>{' '}
              {dateIssued}
            </p>
          </div>
        </div>

        <div
          className={clsx(
            'mt-3 w-full border-t border-black/15 pt-2 font-sans text-black/80',
            compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]',
          )}
        >
          <p className="font-semibold">{certificateBrandName}, Inc.</p>
          <p>{COMPANY_ADDRESS}</p>
          <p>
            {t('ui_cert_footer_phone', { defaultValue: 'Phone' })}: {COMPANY_PHONE} |{' '}
            {t('ui_cert_footer_email', { defaultValue: 'Email' })}: {COMPANY_EMAIL}
          </p>
          <p className="mt-1 font-mono text-[8px] text-black/50">
            {t('ui_cert_id_prefix')} {certificateDisplayId(cert)}
          </p>
        </div>
      </div>
    </div>
  )
}

export const SAMPLE_CERTIFICATE: Certificate = {
  id: 'SAMPLE-CERT-PREVIEW',
  certificateNumber: 100001,
  courseId: 'sample',
  courseName: 'Occupational Safety & Health Awareness',
  userName: 'Jordan Sample',
  issuedAt: '2023-06-23T12:00:00.000Z',
  expiresAt: '2028-06-23T12:00:00.000Z',
  certificationText:
    'Training completed in accordance with applicable OSHA and industry safety standards for workplace hazard recognition.',
  categoryId: 'cat-ohs',
}
