import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Tag } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  deleteAdminPromoCode,
  fetchAdminPromoCodes,
  saveAdminPromoCode,
  type PromoCodeRow,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { t } from '@/i18n/t'
import { randomId } from '@/lib/randomId'

function emptyPromo(): PromoCodeRow {
  return {
    id: randomId(),
    code: '',
    description: '',
    discountPercent: 10,
    active: true,
    expiresAt: null,
    maxUses: null,
    useCount: 0,
    createdAt: new Date().toISOString(),
  }
}

export function AdminPromoCodesPage() {
  const qc = useQueryClient()
  const { data: rows = [], isLoading } = useQuery({ queryKey: qk.adminPromoCodes, queryFn: fetchAdminPromoCodes })
  const [modal, setModal] = useState<'closed' | 'edit'>('closed')
  const [draft, setDraft] = useState<PromoCodeRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [rows],
  )

  const openCreate = () => {
    setDraft(emptyPromo())
    setModal('edit')
    setErr(null)
  }

  const openEdit = (row: PromoCodeRow) => {
    setDraft({ ...row })
    setModal('edit')
    setErr(null)
  }

  const save = async () => {
    if (!draft) return
    const code = draft.code.trim().toUpperCase()
    if (code.length < 2) {
      setErr('Code must be at least 2 characters.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await saveAdminPromoCode({
        ...draft,
        code,
        description: draft.description.trim(),
        discountPercent: Math.min(100, Math.max(1, Math.round(draft.discountPercent))),
        expiresAt: draft.expiresAt?.trim() ? new Date(draft.expiresAt).toISOString() : null,
        maxUses: draft.maxUses != null && draft.maxUses > 0 ? Math.round(draft.maxUses) : null,
      })
      await qc.invalidateQueries({ queryKey: qk.adminPromoCodes })
      setModal('closed')
      setDraft(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this promo code?')) return
    await deleteAdminPromoCode(id)
    await qc.invalidateQueries({ queryKey: qk.adminPromoCodes })
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">
              {t('ui_admin_promo_title', { defaultValue: 'Promo codes' })}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {t('ui_admin_promo_blurb', {
                defaultValue: 'Create codes to share with learners. They stack on top of any course sale discount at checkout.',
              })}
            </p>
          </div>
        </div>
        <Button type="button" onClick={openCreate}>
          {t('ui_admin_promo_create', { defaultValue: 'New promo code' })}
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No promo codes yet.
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-900">{r.code}</td>
                  <td className="px-4 py-3">{r.discountPercent}%</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.useCount}
                    {r.maxUses != null ? ` / ${r.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {r.active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="secondary" className="!py-1.5 !text-xs" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!py-1.5 !text-xs text-red-700"
                      onClick={() => void remove(r.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal === 'edit' && draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl font-bold text-brand-900">
              {draft.useCount > 0 ? 'Edit promo code' : 'New promo code'}
            </h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Code</label>
                <input
                  className="input-pro mt-1.5 w-full font-mono uppercase"
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description (internal)</label>
                <input
                  className="input-pro mt-1.5 w-full"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="input-pro mt-1.5 w-full"
                  value={draft.discountPercent}
                  onChange={(e) => setDraft({ ...draft, discountPercent: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expires (optional)</label>
                <input
                  type="datetime-local"
                  className="input-pro mt-1.5 w-full"
                  value={draft.expiresAt ? draft.expiresAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max uses (optional)</label>
                <input
                  type="number"
                  min={1}
                  className="input-pro mt-1.5 w-full"
                  value={draft.maxUses ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxUses: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Active
              </label>
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
            </div>
            <div className="mt-8 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModal('closed')}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
