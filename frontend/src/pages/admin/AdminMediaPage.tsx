import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import { adminCreateMedia, adminDeleteMedia, adminUploadImage, fetchMediaAssets } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { inferMediaKind } from '@/lib/readFileAsDataUrl'
import type { MediaAsset } from '@/types'
import { t } from '@/i18n/t'

const kinds: MediaAsset['kind'][] = ['image', 'audio', 'document', 'other']

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function AdminMediaPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: assets = [], isLoading } = useQuery({ queryKey: qk.adminMedia, queryFn: fetchMediaAssets })
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<MediaAsset['kind']>('image')
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadErr, setUploadErr] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminMedia })

  const resetForm = () => {
    setLabel('')
    setUrl('')
    setKind('image')
    setFileName(null)
    setUploadErr('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const closeModal = () => {
    resetForm()
    setOpen(false)
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr('')
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadErr('File too large (max 5 MB).')
      return
    }
    try {
      const r = await adminUploadImage(file)
      setUrl(r.url)
      setKind(inferMediaKind(file.type || 'application/octet-stream'))
      setFileName(file.name)
      if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Could not read file.')
    }
  }

  const add = async () => {
    if (!label.trim() || !url.trim()) return
    const a: MediaAsset = {
      id: `media-${Date.now()}`,
      label: label.trim(),
      url: url.trim(),
      kind,
      createdAt: new Date().toISOString(),
      source: 'upload',
      fileName: fileName ?? null,
    }
    await adminCreateMedia(a)
    closeModal()
    invalidate()
  }

  const remove = async (id: string) => {
    if (window.confirm('Remove this asset from the library?')) {
      await adminDeleteMedia(id)
      invalidate()
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminMediaPage_90_media_library_bb9853ccd1')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('ui_media_intro')}</p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('ui_media_add_asset')}
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3 w-14"> </th>
              <th className="px-4 py-3">{t('AdminMediaPage_107_label_f86046f746')}</th>
              <th className="px-4 py-3">{t('AdminMediaPage_108_type_f2c290ddff')}</th>
              <th className="px-4 py-3">{t('AdminMediaPage_109_source_5697c8134a')}</th>
              <th className="px-4 py-3">{t('AdminMediaPage_110_preview_url_f84e5fe94e')}</th>
              <th className="px-4 py-3">{t('AdminMediaPage_111_added_54c108b6a7')}</th>
              <th className="px-4 py-3 text-right">{t('AdminMediaPage_112_action_870260a977')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  {t('ui_media_empty')}
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    {a.url.startsWith('data:image') ? (
                      <img src={a.url} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-500">
                        {a.kind.slice(0, 2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-900">{a.label}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{a.kind}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.source === 'upload' || a.url.startsWith('data:') ? t('ui_media_upload') : t('ui_media_url')}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[10px] text-slate-500" title={a.fileName ?? a.url}>
                    {a.fileName ?? (a.url.startsWith('data:') ? t('ui_media_inline_data') : a.url)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!rounded-lg !border-red-200 !py-1.5 !text-xs !text-red-800"
                      onClick={() => void remove(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <AdminModal title="Add media asset" wide onClose={closeModal}>
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminMediaPage_168_upload_file_cd5a443e57')}</p>
              <input ref={fileRef} type="file" accept="image/*,audio/*,.pdf,.mp3,.wav,.m4a" className="sr-only" onChange={onPickFile} />
              <p className="mt-2 text-xs text-slate-500">
                Images, audio, or PDF — max {(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.
              </p>
              {uploadErr ? <p className="mt-2 text-sm font-medium text-red-600">{uploadErr}</p> : null}
              <Button type="button" variant="secondary" className="mt-3 gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Choose file
              </Button>
            </div>

            <div className="relative text-center text-xs font-medium text-slate-400">
              <span className="relative z-10 bg-white px-2">{t('AdminMediaPage_181_or_link_externally_ffc16b91f5')}</span>
              <div className="absolute left-0 right-0 top-1/2 z-0 h-px bg-slate-200" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminMediaPage_187_label_ca62a379ec')}</label>
                <input className="input-pro mt-1.5 w-full" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Hero image — OSHA module" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminMediaPage_191_asset_type_a556034dcf')}</label>
                <select className="input-pro mt-1.5 w-full" value={kind} onChange={(e) => setKind(e.target.value as MediaAsset['kind'])}>
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminMediaPage_201_url_https_or_data_from_upload_above_6226707a13')}</label>
                <textarea
                  className="input-pro mt-1.5 min-h-[72px] w-full resize-y font-mono text-xs"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (!e.target.value.startsWith('data:')) setFileName(null)
                  }}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Button type="button" onClick={() => void add()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}
