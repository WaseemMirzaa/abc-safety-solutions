import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { CertificateVisual } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCategories, fetchMyCertificates } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { findCertificateById } from '@/lib/certificateDisplay'
import { t } from '@/i18n/t'

function printCertificate() {
  document.body.classList.add('print-certificate-active')
  const cleanup = () => {
    document.body.classList.remove('print-certificate-active')
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}

export function CertificateViewPage() {
  const { certificateId = '' } = useParams()
  const { user } = useAuth()
  const { data: certs = [], isLoading } = useQuery({
    queryKey: qk.certificates,
    queryFn: fetchMyCertificates,
    enabled: Boolean(user),
  })
  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    enabled: Boolean(user),
  })

  const cert = findCertificateById(certs, certificateId)

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <p className="text-slate-600">{t('CertificatesPage_23_sign_in_to_view_credentials_earned_on_this_devic_5f1914b3c9')}</p>
          <Link to="/login" className="mt-8 inline-block">
            <Button>{t('CertificatesPage_25_sign_in_00d939efe1')}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Container className="py-16">
        <p className="text-center text-slate-500">{t('ui_cert_view_loading')}</p>
      </Container>
    )
  }

  if (!cert) {
    return (
      <Container className="py-16 text-center">
        <p className="font-medium text-brand-900">{t('ui_cert_view_not_found')}</p>
        <Link to="/certificates" className="mt-6 inline-block">
          <Button variant="secondary">{t('ui_cert_view_back_list')}</Button>
        </Link>
      </Container>
    )
  }

  return (
    <div className="py-10 sm:py-14">
      <Container>
        <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/certificates"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-800 transition hover:text-sky-950"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('ui_cert_view_back_list')}
          </Link>
          <Button type="button" className="gap-2" onClick={printCertificate}>
            <Printer className="h-4 w-4" />
            {t('ui_certificates_print_pdf')}
          </Button>
        </div>

        <div className="certificate-print-surface mx-auto mt-8 max-w-4xl rounded-lg bg-white p-2 sm:p-4">
          <CertificateVisual cert={cert} categories={categoryList} />
        </div>
      </Container>
    </div>
  )
}
