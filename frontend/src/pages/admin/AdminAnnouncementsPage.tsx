import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import {
  adminDeleteAnnouncement,
  adminDispatchAnnouncement,
  adminUpsertAnnouncement,
  fetchAnnouncements,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import type { Announcement } from '@/types'
import { t } from '@/i18n/t'

export function AdminAnnouncementsPage() {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({ queryKey: qk.adminAnnouncements, queryFn: fetchAnnouncements })
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentResult, setSentResult] = useState<{ id: string; count: number } | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminAnnouncements })

  const add = async () => {
    if (!title.trim() || !body.trim()) return
    const a: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
      status: 'draft',
      sentAt: null,
    }
    await adminUpsertAnnouncement(a)
    setTitle('')
    setBody('')
    setOpen(false)
    invalidate()
  }

  const markSent = async (a: Announcement) => {
    setSendingId(a.id)
    setSentResult(null)
    try {
      const result = await adminDispatchAnnouncement(a.id)
      setSentResult({ id: a.id, count: result.sent ?? 0 })
      setTimeout(() => setSentResult(null), 4000)
    } finally {
      setSendingId(null)
      invalidate()
    }
  }

  const remove = async (id: string) => {
    if (window.confirm('Delete this announcement?')) {
      await adminDeleteAnnouncement(id)
      invalidate()
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminAnnouncementsPage_61_announcements_598d48da3e')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Draft announcements then send them as real-time notifications to all users. Recipients see the notification instantly in their bell and on the Notifications page.
            </p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New announcement
        </Button>
      </div>

      <div className="mt-10 space-y-4">
        {isLoading ? (
          <p className="text-center text-slate-500">{t('AdminAnnouncementsPage_75_loading_cc0712b7f6')}</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center text-slate-600">
            No announcements yet. Create one to track future learner broadcasts.
          </div>
        ) : (
          items
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((a) => (
              <div key={a.id} className="card-elevated flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-brand-900">{a.title}</h2>
                    <span
                      className={
                        a.status === 'sent'
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800'
                          : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700'
                      }
                    >
                      {a.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.body}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    Created {new Date(a.createdAt).toLocaleString()}
                    {a.sentAt ? ` · Sent ${new Date(a.sentAt).toLocaleString()}` : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  {a.status === 'draft' ? (
                    <Button
                      type="button"
                      className="gap-1.5 !text-sm"
                      disabled={sendingId === a.id}
                      onClick={() => void markSent(a)}
                    >
                      <Send className="h-4 w-4" />
                      {sendingId === a.id ? 'Sending…' : 'Send to all users'}
                    </Button>
                  ) : null}
                  {sentResult?.id === a.id ? (
                    <p className="text-xs font-medium text-emerald-700">
                      ✓ Sent to {sentResult.count} user{sentResult.count !== 1 ? 's' : ''} in real-time
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="!border-red-200 !text-red-800"
                    onClick={() => void remove(a.id)}
                  >
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
        )}
      </div>

      {open ? (
        <AdminModal title="New announcement" wide onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminAnnouncementsPage_131_title_62a72893b7')}</label>
              <input className="input-pro mt-1.5 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminAnnouncementsPage_135_body_4e36c52487')}</label>
              <textarea className="input-pro mt-1.5 min-h-[140px] w-full resize-y" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Button type="button" onClick={() => void add()}>
              Save draft
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}
