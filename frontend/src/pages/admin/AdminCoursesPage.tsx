import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import {
  adminCreateCourse,
  adminDeleteCourse,
  adminUpdateCourse,
  adminUploadImage,
  fetchAllCoursesAdmin,
  fetchCategories,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { findCategory, isSeedCourseId } from '@/data/catalog'
import type { Course } from '@/types'
import { ChevronDown, ChevronUp, ImagePlus, Plus, Pencil, Trash2 } from 'lucide-react'
import { t } from '@/i18n/t'

const MAX_SLIDE_BYTES = 5 * 1024 * 1024
const MAX_SLIDES = 30

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function emptyCustomCourse(categoryId: string): Course {
  return {
    id: `custom-${Date.now()}`,
    slug: `new-course-${Date.now()}`,
    title: '',
    summary: '',
    description: '',
    categoryId,
    priceCents: 2999,
    durationMinutes: 60,
    slideCount: 20,
    certificateValidityDays: null,
    imageUrl: 'https://abcsafetysolutions.com/wp-content/uploads/2021/10/Occupational-Health-Safety-Training-min.jpg',
    published: false,
  }
}

export function AdminCoursesPage() {
  const qc = useQueryClient()
  const { data: courses = [], isLoading } = useQuery({ queryKey: qk.adminCourses, queryFn: fetchAllCoursesAdmin })
  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed')
  const [draft, setDraft] = useState<Course | null>(null)
  const [slugErr, setSlugErr] = useState('')
  const [slideUploadErr, setSlideUploadErr] = useState('')
  const slidesInputRef = useRef<HTMLInputElement>(null)

  const openCreate = () => {
    setDraft(emptyCustomCourse(categoryList[0]?.id ?? 'cat-ohs'))
    setSlugErr('')
    setSlideUploadErr('')
    setModal('create')
  }

  const openEdit = (c: Course) => {
    setDraft({ ...c })
    setSlugErr('')
    setSlideUploadErr('')
    setModal('edit')
  }

  const closeModal = () => {
    setModal('closed')
    setDraft(null)
    setSlugErr('')
    setSlideUploadErr('')
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.adminCourses })
    qc.invalidateQueries({ queryKey: qk.courses })
  }

  const toggle = async (row: Course, published: boolean) => {
    await adminUpdateCourse({ ...row, published: !published })
    invalidate()
  }

  const slugTaken = (slug: string, exceptId: string) =>
    courses.some((c) => c.slug === slug && c.id !== exceptId)

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim() || !draft.slug.trim()) {
      setSlugErr('Title and slug are required.')
      return
    }
    if (slugTaken(draft.slug.trim(), draft.id)) {
      setSlugErr('Slug must be unique.')
      return
    }
    setSlugErr('')
    const urls = (draft.slideImageUrls ?? []).filter(Boolean)
    const slideCount =
      urls.length > 0 ? urls.length : Math.max(1, Math.round(Number(draft.slideCount)) || 1)
    const cv = draft.certificateValidityDays
    const certificateValidityDays =
      cv === null || cv === undefined || Number.isNaN(Number(cv)) || Number(cv) <= 0
        ? null
        : Math.max(1, Math.round(Number(cv)))
    const next: Course = {
      ...draft,
      slug: draft.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim() || draft.summary.trim(),
      priceCents: Math.max(0, Math.round(Number(draft.priceCents)) || 0),
      durationMinutes: Math.max(1, Math.round(Number(draft.durationMinutes)) || 1),
      slideCount,
      slideImageUrls: urls.length > 0 ? urls : undefined,
      certificateValidityDays,
    }

    try {
      if (modal === 'create') {
        await adminCreateCourse(next)
      } else {
        await adminUpdateCourse(next)
      }
      invalidate()
      closeModal()
    } catch (e) {
      setSlugErr(e instanceof Error ? e.message : 'Save failed.')
    }
  }

  const removeCustom = async (c: Course) => {
    if (!isSeedCourseId(c.id) && window.confirm(`Delete “${c.title}”?`)) {
      await adminDeleteCourse(c.id)
      invalidate()
    }
  }

  const seed = useMemo(() => (draft ? isSeedCourseId(draft.id) : false), [draft])

  const slideList = draft?.slideImageUrls ?? []

  const moveSlide = (from: number, dir: -1 | 1) => {
    if (!draft) return
    const to = from + dir
    if (to < 0 || to >= slideList.length) return
    const next = [...slideList]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setDraft({ ...draft, slideImageUrls: next })
  }

  const removeSlide = (index: number) => {
    if (!draft) return
    const next = slideList.filter((_, i) => i !== index)
    setDraft({ ...draft, slideImageUrls: next.length > 0 ? next : undefined })
  }

  const clearSlides = () => {
    if (!draft) return
    setDraft({ ...draft, slideImageUrls: undefined })
    setSlideUploadErr('')
  }

  const onPickSlides = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!draft) return
    setSlideUploadErr('')
    const files = e.target.files
    e.target.value = ''
    if (!files?.length) return
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!images.length) {
      setSlideUploadErr('Choose image files only.')
      return
    }
    let list = [...(draft.slideImageUrls ?? [])]
    try {
      for (const file of images) {
        if (list.length >= MAX_SLIDES) {
          setSlideUploadErr(`Stopped at ${MAX_SLIDES} slides (max).`)
          break
        }
        if (file.size > MAX_SLIDE_BYTES) {
          setSlideUploadErr('Each slide image must be 5 MB or smaller.')
          break
        }
        const { url } = await adminUploadImage(file)
        list.push(url)
      }
      setDraft({ ...draft, slideImageUrls: list })
    } catch (err) {
      setSlideUploadErr(err instanceof Error ? err.message : 'Upload failed.')
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">{t('AdminCoursesPage_184_courses_03efa4826a')}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Publish catalog entries, edit seed metadata via overrides, or add custom courses (stored in this browser).
          </p>
        </div>
        <Button type="button" className="gap-2 self-start sm:self-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add course
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-10">
          <div className="mb-6 flex justify-center">
            <Spinner size="sm" label="Loading courses" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Loading…
            </div>
            <TableSkeletonRows rows={8} />
          </div>
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04),0_20px_48px_-28px_rgba(15,23,42,0.12)]">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">{t('AdminCoursesPage_212_course_643487d5fc')}</th>
                <th className="px-4 py-3">{t('AdminCoursesPage_213_source_c12d345808')}</th>
                <th className="px-4 py-3">{t('AdminCoursesPage_214_category_2b504ab8de')}</th>
                <th className="px-4 py-3">{t('AdminCoursesPage_215_price_cfe1c6373b')}</th>
                <th className="px-4 py-3">{t('AdminCoursesPage_216_status_7f2ee9e47f')}</th>
                <th className="px-4 py-3 text-right">{t('AdminCoursesPage_217_actions_4ea6e66f10')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const cat = findCategory(categoryList, c.categoryId)
                const fromSeed = isSeedCourseId(c.id)
                return (
                  <tr key={c.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80">
                    <td className="px-4 py-4 font-medium text-brand-900">{c.title}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {fromSeed ? t('ui_courses_source_seed') : t('ui_courses_source_custom')}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{cat?.name ?? t('ui_em_dash')}</td>
                    <td className="px-4 py-4 font-medium">{formatPrice(c.priceCents)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          c.published
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800'
                            : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700'
                        }
                      >
                        {c.published ? t('ui_courses_status_published') : t('ui_courses_status_draft')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="secondary"
                          className="!rounded-lg !py-2 !text-xs"
                          onClick={() => void toggle(c, c.published)}
                        >
                          {c.published ? t('ui_courses_unpublish') : t('ui_courses_publish')}
                        </Button>
                        <Button
                          variant="secondary"
                          className="!rounded-lg !py-2 !text-xs"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="mr-1 inline h-3.5 w-3.5" />
                          {t('ui_courses_edit')}
                        </Button>
                        {!fromSeed ? (
                          <Button
                            variant="secondary"
                            className="!rounded-lg !border-red-200 !py-2 !text-xs !text-red-800 hover:!bg-red-50"
                            onClick={() => void removeCustom(c)}
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                            {t('ui_courses_delete')}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== 'closed' && draft ? (
        <AdminModal
          title={modal === 'create' ? t('ui_courses_modal_add') : t('ui_courses_modal_edit')}
          wide
          onClose={closeModal}
        >
          {seed ? (
            <p className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
              {t('ui_courses_seed_banner')}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_291_title_0bea3ec844')}</label>
              <input
                className="input-pro mt-1.5 w-full"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_299_slug_url_c745b6cc61')}</label>
              <input
                className="input-pro mt-1.5 w-full"
                value={draft.slug}
                disabled={seed}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_308_category_75270fc1ad')}</label>
              <select
                className="input-pro mt-1.5 w-full"
                value={draft.categoryId}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
              >
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_322_summary_3f66b35883')}</label>
              <input
                className="input-pro mt-1.5 w-full"
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_330_description_49dc831b7d')}</label>
              <textarea
                className="input-pro mt-1.5 min-h-[88px] w-full resize-y"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_338_price_usd_cents_16bc7ab177')}</label>
              <input
                type="number"
                className="input-pro mt-1.5 w-full"
                value={draft.priceCents}
                onChange={(e) => setDraft({ ...draft, priceCents: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_347_duration_minutes_8e1195fdec')}</label>
              <input
                type="number"
                className="input-pro mt-1.5 w-full"
                value={draft.durationMinutes}
                onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_356_slide_count_491e07694f')}</label>
              <input
                type="number"
                className="input-pro mt-1.5 w-full"
                disabled={slideList.length > 0}
                value={slideList.length > 0 ? slideList.length : draft.slideCount}
                onChange={(e) => setDraft({ ...draft, slideCount: Number(e.target.value) })}
              />
              {slideList.length > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">{t('AdminCoursesPage_365_matches_uploaded_slides_clear_deck_below_to_edit_7f83c6e815')}</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Certificate expires (days after issue)
              </label>
              <input
                type="number"
                min={1}
                className="input-pro mt-1.5 w-full"
                placeholder="Leave empty for no expiry"
                value={draft.certificateValidityDays ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft({
                    ...draft,
                    certificateValidityDays: v === '' ? null : Math.max(1, Math.round(Number(v)) || 1),
                  })
                }}
              />
              <p className="mt-1 text-[11px] text-slate-500">Learners see this on the course page and on issued certificates.</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_369_published_9748b31e49')}</label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="accent-sky-600"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
                Visible in catalog
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_381_image_url_7a3e5b90a0')}</label>
              <input
                className="input-pro mt-1.5 w-full font-mono text-xs"
                value={draft.imageUrl}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_391_slide_images_7ff457e52d')}</label>
                  <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500">
                    Optional. Up to {MAX_SLIDES} images (5 MB each), shown in order in the learner player. Files upload to the API server.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={slidesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickSlides}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="!rounded-lg !py-2 !text-xs"
                    onClick={() => slidesInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-1 inline h-3.5 w-3.5" />
                    Add slides
                  </Button>
                  {slideList.length > 0 ? (
                    <Button type="button" variant="secondary" className="!rounded-lg !py-2 !text-xs" onClick={clearSlides}>
                      Clear all
                    </Button>
                  ) : null}
                </div>
              </div>
              {slideUploadErr ? <p className="mt-3 text-xs font-medium text-red-600">{slideUploadErr}</p> : null}
              {slideList.length > 0 ? (
                <ul className="mt-4 flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {slideList.map((src, i) => (
                    <li
                      key={`${i}-${src.slice(0, 24)}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-3"
                    >
                      <img src={src} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                      <span className="min-w-0 flex-1 text-xs font-medium text-slate-600">
                        {t('ui_courses_slide_label', { n: i + 1 })}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!h-8 !min-w-0 !px-2 !py-0"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => moveSlide(i, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!h-8 !min-w-0 !px-2 !py-0"
                          aria-label="Move down"
                          disabled={i === slideList.length - 1}
                          onClick={() => moveSlide(i, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!h-8 !border-red-200 !px-2 !text-red-800 hover:!bg-red-50"
                          aria-label="Remove slide"
                          onClick={() => removeSlide(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          {slugErr ? <p className="mt-4 text-sm font-medium text-red-600">{slugErr}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void save()}>
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
