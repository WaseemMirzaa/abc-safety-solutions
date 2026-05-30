import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Printer } from 'lucide-react'
import { CertificateVisual } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/ui/Spinner'
import { AdminModal } from '@/components/admin/AdminModal'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCategories, fetchMyCertificates, updateManualCertificate } from '@/api/localData'
import { xhrUploadForm } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { certificateCopyText, certificateDisplayId, findCertificateById, formatCertDate } from '@/lib/certificateDisplay'
import { CopyCertificateIdButton } from '@/components/CopyCertificateIdButton'
import { t } from '@/i18n/t'
import type { Certificate } from '@/types'

const TODAY = new Date().toISOString().slice(0, 10)

function printCertificate() {
  document.documentElement.classList.add('print-certificate-active')
  document.body.classList.add('print-certificate-active')
  const cleanup = () => {
    document.documentElement.classList.remove('print-certificate-active')
    document.body.classList.remove('print-certificate-active')
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}

function formFromCert(c: Certificate) {
  return {
    title: c.courseName,
    issuedAt: c.issuedAt ? c.issuedAt.slice(0, 10) : TODAY,
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    notes: c.notes ?? '',
    fileUrl: c.fileUrl ?? '',
  }
}

export function CertificateViewPage() {
  const { certificateId = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const isManual = cert?.source === 'manual'

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ title: '', issuedAt: TODAY, expiresAt: '', notes: '', fileUrl: '' })
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const openEdit = () => {
    if (!cert) return
    setForm(formFromCert(cert))
    setFormErr('')
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setFormErr('')
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    try {
      const { url } = await xhrUploadForm('/api/admin/upload/file', file, (p) => setUploadPct(p.percent))
      setForm((f) => ({ ...f, fileUrl: url }))
    } catch {
      setFormErr('File upload failed. Try again.')
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const saveEdit = async () => {
    if (!cert) return
    setFormErr('')
    if (!form.title.trim()) { setFormErr('Program name is required.'); return }
    setSaving(true)
    try {
      await updateManualCertificate(cert.id, {
        courseName: form.title.trim(),
        issuedAt: form.issuedAt || TODAY,
        expiresAt: form.expiresAt || null,
        notes: form.notes.trim() || undefined,
        fileUrl: form.fileUrl.trim() || null,
      })
      void qc.invalidateQueries({ queryKey: qk.certificates })
      closeEdit()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

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
    <div className="py-10 sm:py-14 print:py-0">
      <Container className="print:max-w-none print:px-0">
        {/* Header bar */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/certificates"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-800 transition hover:text-sky-950"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('ui_cert_view_back_list')}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-semibold text-slate-700">
              {certificateDisplayId(cert)}
            </span>
            <CopyCertificateIdButton text={certificateCopyText(cert)} />
          </div>
          <div className="flex items-center gap-2">
            {isManual && (
              <Button type="button" variant="secondary" className="gap-2" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button type="button" className="gap-2" onClick={printCertificate}>
              <Printer className="h-4 w-4" />
              {t('ui_certificates_print_pdf')}
            </Button>
          </div>
        </div>

        {/* Certificate display */}
        <div className="certificate-print-surface mx-auto mt-8 max-w-4xl rounded-lg bg-white p-2 shadow-sm sm:p-4 print:mt-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
          {isManual ? (
            cert.fileUrl ? (
              /* Manual cert with uploaded file — show ONLY the uploaded file */
              cert.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={cert.fileUrl}
                  title="Certificate"
                  className="w-full rounded-lg"
                  style={{ minHeight: '70vh' }}
                />
              ) : (
                <img
                  src={cert.fileUrl}
                  alt="Certificate"
                  className="mx-auto max-w-full rounded-lg shadow-sm"
                />
              )
            ) : (
              /* Manual cert without file — show a simple info card, NOT our generated template */
              <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Certificate of Completion</p>
                <p className="mt-4 font-display text-2xl font-bold text-brand-900">{cert.courseName}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Issued on {formatCertDate(cert.issuedAt)}
                  {cert.expiresAt ? ` · Expires ${formatCertDate(cert.expiresAt)}` : ''}
                </p>
                {cert.notes && (
                  <p className="mt-3 text-sm text-slate-500 italic">"{cert.notes}"</p>
                )}
                <p className="mt-6 text-xs text-slate-400">No certificate file attached. Click Edit to upload one.</p>
              </div>
            )
          ) : (
            /* Platform-generated certificate — show our full template */
            <CertificateVisual cert={cert} categories={categoryList} />
          )}
        </div>
      </Container>

      {/* Edit modal for manual certs */}
      {editOpen && (
        <AdminModal title="Edit certificate" onClose={closeEdit}>
          <p className="mb-4 text-xs text-slate-600">Update details for this manually added certificate.</p>

          {/* Current file */}
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Certificate file <span className="font-normal text-slate-400">(image or PDF, optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,application/pdf"
            onChange={(e) => void onPickFile(e)}
          />

          {/* File preview */}
          {form.fileUrl && !uploading ? (
            <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {form.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-emerald-700">PDF attached ✓</span>
                  <a href={form.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline shrink-0">Open</a>
                </div>
              ) : (
                <img src={form.fileUrl} alt="Current certificate" className="mx-auto max-h-32 rounded object-contain" />
              )}
            </div>
          ) : null}

          <div className="mt-1.5 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!rounded-lg !py-1.5 !text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : form.fileUrl ? 'Replace file' : 'Choose file'}
            </Button>
            {form.fileUrl && !uploading ? (
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => setForm((f) => ({ ...f, fileUrl: '' }))}
              >
                Remove file
              </button>
            ) : null}
          </div>
          {uploading ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <Spinner size="sm" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
              <span>{uploadPct}%</span>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Course / program name <span className="text-red-600">*</span>
              </label>
              <input
                className="input-pro mt-1.5 w-full"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. First Aid Level 2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Issued date</label>
                <input
                  type="date"
                  className="input-pro mt-1.5 w-full"
                  value={form.issuedAt}
                  onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Expiry date <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  className="input-pro mt-1.5 w-full"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                className="input-pro mt-1.5 w-full"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Completed at City Training Centre"
              />
            </div>
          </div>

          {formErr ? <p className="mt-3 text-xs font-medium text-red-600">{formErr}</p> : null}

          <div className="mt-6 flex gap-2">
            <Button type="button" disabled={saving || uploading} onClick={() => void saveEdit()}>
              {saving ? 'Saving…' : 'Update'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
