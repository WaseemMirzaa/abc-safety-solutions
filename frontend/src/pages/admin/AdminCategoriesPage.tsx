import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import { fetchCategories } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { categories as seedCategories, isSeedCategoryId } from '@/data/catalog'
import { localCache } from '@/lib/localCache'
import type { Category } from '@/types'
import { t } from '@/i18n/t'

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminCategoriesPage() {
  const qc = useQueryClient()
  const { data: allCategories = [], isLoading } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed')
  const [draft, setDraft] = useState<Category | null>(null)
  const [err, setErr] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.categories })
    qc.invalidateQueries({ queryKey: qk.courses })
    qc.invalidateQueries({ queryKey: qk.adminCourses })
  }

  const openCreate = () => {
    setDraft({
      id: `cat-${Date.now()}`,
      name: '',
      slug: '',
      parentId: null,
      certificationText: '',
    })
    setErr('')
    setModal('create')
  }

  const openEdit = (c: Category) => {
    setDraft({ ...c })
    setErr('')
    setModal('edit')
  }

  const close = () => {
    setModal('closed')
    setDraft(null)
    setErr('')
  }

  const save = () => {
    if (!draft) return
    const name = draft.name.trim()
    let slug = draft.slug.trim()
    if (!name) {
      setErr('Name is required.')
      return
    }
    if (!slug) slug = slugify(name)
    else slug = slugify(slug)
    if (!slug) {
      setErr('Enter a valid slug.')
      return
    }
    const taken = allCategories.some((c) => c.slug === slug && c.id !== draft.id)
    if (taken) {
      setErr('Slug already used.')
      return
    }
    const certText = (draft.certificationText ?? '').trim()
    if (modal === 'edit' && isSeedCategoryId(draft.id)) {
      localCache.patchCategoryFieldOverride(draft.id, { certificationText: certText })
      invalidate()
      close()
      return
    }
    const next: Category = { ...draft, name, slug, parentId: null, certificationText: certText }
    if (modal === 'create') {
      localCache.addCustomCategory(next)
    } else if (!isSeedCategoryId(next.id)) {
      localCache.updateCustomCategory(next)
    }
    invalidate()
    close()
  }

  const remove = (c: Category) => {
    if (isSeedCategoryId(c.id)) return
    if (window.confirm(`Delete category “${c.name}”? Courses still pointing at it keep their categoryId until edited.`)) {
      localCache.removeCustomCategory(c.id)
      invalidate()
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminCategoriesPage_110_categories_3412a11c25')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Seed categories ship with the app; add custom ones for new disciplines (stored locally until the API ships).
            </p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">{t('AdminCategoriesPage_126_name_19761578a2')}</th>
              <th className="px-4 py-3">{t('AdminCategoriesPage_127_slug_2f307c1ff1')}</th>
              <th className="min-w-[12rem] px-4 py-3">{t('AdminCategoriesPage_128_certificate_text_138327c36a')}</th>
              <th className="px-4 py-3">{t('AdminCategoriesPage_129_source_95d4e5b16d')}</th>
              <th className="px-4 py-3 text-right">{t('AdminCategoriesPage_130_actions_ccd950f74d')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              allCategories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-brand-900">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.slug}</td>
                  <td
                    className="max-w-xs px-4 py-3 text-xs text-slate-600"
                    title={c.certificationText || undefined}
                  >
                    {c.certificationText ? (
                      <span className="line-clamp-2">{c.certificationText}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{isSeedCategoryId(c.id) ? 'Seed' : 'Custom'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!rounded-lg !py-1.5 !text-xs"
                        onClick={() => openEdit(c)}
                        title="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!rounded-lg !border-red-200 !py-1.5 !text-xs !text-red-800"
                        disabled={isSeedCategoryId(c.id)}
                        onClick={() => remove(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading ? (
        <p className="mt-6 text-xs text-slate-500">
          {seedCategories.length} built-in categories · {Math.max(0, allCategories.length - seedCategories.length)} custom in this browser.
        </p>
      ) : null}

      {modal !== 'closed' && draft ? (
        <AdminModal title={modal === 'create' ? 'Add category' : 'Edit category'} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCategoriesPage_195_display_name_523033cfc2')}</label>
              <input
                className="input-pro mt-1.5 w-full"
                value={draft.name}
                disabled={modal === 'edit' && isSeedCategoryId(draft.id)}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              {modal === 'edit' && isSeedCategoryId(draft.id) ? (
                <p className="mt-1 text-[11px] text-slate-500">{t('AdminCategoriesPage_203_seed_category_name_is_defined_in_code_edit_certi_45b959c4cf')}</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCategoriesPage_207_url_slug_aefe2a6105')}</label>
              <input
                className="input-pro mt-1.5 w-full font-mono text-sm"
                value={draft.slug}
                disabled={modal === 'edit' && isSeedCategoryId(draft.id)}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="auto from name if empty"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCategoriesPage_217_certificate_text_5c75771159')}</label>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('AdminCategoriesPage_218_shown_on_completion_certificates_for_courses_in_f035dae8dd')}</p>
              <textarea
                className="input-pro mt-1.5 min-h-[88px] w-full resize-y"
                value={draft.certificationText ?? ''}
                onChange={(e) => setDraft({ ...draft, certificationText: e.target.value })}
                placeholder="e.g. Program completed in accordance with…"
              />
            </div>
            {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          </div>
          <div className="mt-8 flex gap-3">
            <Button type="button" onClick={save}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}
