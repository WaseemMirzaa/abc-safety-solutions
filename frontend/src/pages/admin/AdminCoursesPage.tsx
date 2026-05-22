import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminCourseContentPlaylist } from '@/components/admin/AdminCourseContentPlaylist'
import { computeCourseContentMetrics } from '@/lib/courseContent'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/api/client'
import {
  adminCreateCourse,
  adminCreateCourseLanguage,
  adminDeleteCourse,
  adminUpdateCourse,
  fetchAdminCourseById,
  fetchAllCoursesAdmin,
  fetchCategories,
  fetchCourseLanguages,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { findCategory, isSeedCourseId } from '@/data/catalog'
import { getCourseSlides } from '@/lib/courseSlides'
import { startAdminFileUpload } from '@/lib/adminUploadJobs'
import { useAdminUploadJob } from '@/hooks/useAdminUploadJob'
import { fieldClass } from '@/lib/adminForm'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import type { Course, CourseLanguage, CourseSlide } from '@/types'
import { DEFAULT_COURSE_LANGUAGE_ID } from '@/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { t } from '@/i18n/t'

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
    languageId: DEFAULT_COURSE_LANGUAGE_ID,
    priceCents: 2999,
    discountPercent: 0,
    durationMinutes: 60,
    slideCount: 1,
    certificateValidityDays: null,
    imageUrl: 'https://abcsafetysolutions.com/wp-content/uploads/2021/10/Occupational-Health-Safety-Training-min.jpg',
    published: true,
    popular: false,
  }
}

export function AdminCoursesPage() {
  const qc = useQueryClient()
  const { data: courses = [], isLoading } = useQuery({ queryKey: qk.adminCourses, queryFn: fetchAllCoursesAdmin })
  const { data: categoryList = [] } = useQuery({ queryKey: qk.categories, queryFn: fetchCategories })
  const { data: languageList = [] } = useQuery({
    queryKey: qk.courseLanguages,
    queryFn: fetchCourseLanguages,
  })
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed')
  const [draft, setDraft] = useState<Course | null>(null)
  const [slugErr, setSlugErr] = useState('')
  const [slideUploadErr, setSlideUploadErr] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [heroUploadJobId, setHeroUploadJobId] = useState<string | null>(null)
  const heroUploadJob = useAdminUploadJob(heroUploadJobId)
  const heroUploading = heroUploadJob?.status === 'uploading'
  const uploading = heroUploading
  const [heroPreviewBroken, setHeroPreviewBroken] = useState(false)
  const heroImageRef = useRef<HTMLInputElement>(null)
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [newLangName, setNewLangName] = useState('')
  const [newLangCode, setNewLangCode] = useState('')
  const [langBusy, setLangBusy] = useState(false)
  const [langErr, setLangErr] = useState('')

  useEffect(() => {
    if (!heroUploadJob || !draft) return
    if (heroUploadJob.status === 'done' && heroUploadJob.result?.url) {
      setDraft((prev) => (prev ? { ...prev, imageUrl: heroUploadJob.result!.url } : prev))
      setHeroUploadJobId(null)
    }
    if (heroUploadJob.status === 'error') {
      setSlideUploadErr(heroUploadJob.error ?? 'Image upload failed.')
      setHeroUploadJobId(null)
    }
  }, [heroUploadJob?.status, draft?.id])

  const openCreate = () => {
    setDraft(emptyCustomCourse(categoryList[0]?.id ?? 'cat-ohs'))
    setSlugErr('')
    setSlideUploadErr('')
    setFieldErrors({})
    setHeroPreviewBroken(false)
    setShowAddLanguage(false)
    setNewLangName('')
    setNewLangCode('')
    setLangErr('')
    setModal('create')
  }

  const openEdit = async (c: Course) => {
    let row = c
    try {
      const fresh = await fetchAdminCourseById(c.id)
      if (fresh) row = fresh
    } catch {
      /* use list row */
    }
    const slides = row.slides?.length ? row.slides : getCourseSlides(row)
    const merged: Course = {
      ...row,
      languageId: row.languageId || DEFAULT_COURSE_LANGUAGE_ID,
      slides: slides.length ? slides : undefined,
      slideImageUrls: undefined,
    }
    setDraft(merged)
    setSlugErr('')
    setSlideUploadErr('')
    setFieldErrors({})
    setHeroPreviewBroken(false)
    setShowAddLanguage(false)
    setNewLangName('')
    setNewLangCode('')
    setLangErr('')
    setModal('edit')
  }

  const closeModal = () => {
    if (uploading && !window.confirm('Upload still running — it will finish in the background. Close this dialog?')) {
      return
    }
    setModal('closed')
    setDraft(null)
    setSlugErr('')
    setSlideUploadErr('')
    setFieldErrors({})
    setHeroUploadJobId(null)
    setHeroPreviewBroken(false)
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.adminCourses })
    qc.invalidateQueries({ queryKey: qk.courses })
  }

  const addLanguage = async () => {
    const name = newLangName.trim()
    if (!name) {
      setLangErr('Enter a language name.')
      return
    }
    setLangBusy(true)
    setLangErr('')
    try {
      const row = await adminCreateCourseLanguage({
        name,
        code: newLangCode.trim() || undefined,
      })
      qc.setQueryData<CourseLanguage[]>(qk.courseLanguages, (old = []) => {
        if (old.some((l) => l.id === row.id)) return old
        return [...old, row].sort((a, b) => a.name.localeCompare(b.name))
      })
      await qc.invalidateQueries({ queryKey: qk.courseLanguages })
      if (draft) setDraft({ ...draft, languageId: row.id })
      setShowAddLanguage(false)
      setNewLangName('')
      setNewLangCode('')
    } catch (err) {
      setLangErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not add language.')
    } finally {
      setLangBusy(false)
    }
  }

  const toggle = async (row: Course, published: boolean) => {
    await adminUpdateCourse({ ...row, published: !published })
    invalidate()
  }

  const slugTaken = (slug: string, exceptId: string) =>
    courses.some((c) => c.slug === slug && c.id !== exceptId)

  const save = async () => {
    if (!draft) return
    const slides = (draft.slides ?? []).filter((s) => s.url)
    const errors: Record<string, string> = {}
    if (!draft.title.trim()) errors.title = 'Title is required.'
    if (!draft.slug.trim()) errors.slug = 'Slug is required.'
    if (!draft.summary.trim()) errors.summary = 'Summary is required.'
    if (!draft.description.trim()) errors.description = 'Description is required.'
    if (!draft.categoryId) errors.categoryId = 'Select a category.'
    if (!draft.languageId?.trim()) errors.languageId = 'Select a course language.'
    if (!draft.imageUrl.trim()) errors.imageUrl = 'Hero image URL is required.'
    if (Number.isNaN(draft.priceCents) || draft.priceCents < 0) errors.priceCents = 'Enter a valid price (USD cents).'
    const playlist = slides.filter((s) => s.type === 'pdf' || s.type === 'video')
    if (!playlist.length) {
      errors.slides = 'Add at least one PDF or video.'
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setSlugErr('Fix the highlighted fields before saving.')
      return
    }
    if (slugTaken(draft.slug.trim(), draft.id)) {
      setSlugErr('Slug must be unique.')
      setFieldErrors({ slug: 'Slug already used.' })
      return
    }
    setSlugErr('')
    setFieldErrors({})
    const metrics = computeCourseContentMetrics(playlist)
    const slideCount = metrics.slideCount
    const durationMinutes = metrics.durationMinutes
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
      discountPercent: Math.min(100, Math.max(0, Math.round(Number(draft.discountPercent)) || 0)),
      durationMinutes,
      slideCount,
      slides: playlist.map(({ previewDataUrl: _preview, ...s }) => s),
      slideImageUrls: undefined,
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

  const slideList: CourseSlide[] = draft?.slides ?? (draft ? getCourseSlides(draft) : [])
  const playlistSlides = slideList.filter((s) => s.type === 'pdf' || s.type === 'video')
  const contentMetrics = computeCourseContentMetrics(playlistSlides)

  const setPlaylistSlides = (slides: CourseSlide[]) => {
    if (!draft) return
    const m = computeCourseContentMetrics(slides)
    setDraft({
      ...draft,
      slides,
      slideCount: m.slideCount,
      durationMinutes: m.durationMinutes,
      slideImageUrls: undefined,
    })
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
                <th className="px-4 py-3">{t('ui_admin_course_language', { defaultValue: 'Language' })}</th>
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
                    <td className="px-4 py-4 text-slate-600">
                      {languageList.find((l) => l.id === (c.languageId || DEFAULT_COURSE_LANGUAGE_ID))?.name ??
                        t('ui_admin_language_english', { defaultValue: 'English' })}
                    </td>
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
                          onClick={() => void openEdit(c)}
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
          blockDismiss={uploading}
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
                className={fieldClass(Boolean(fieldErrors.title))}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              {fieldErrors.title ? <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p> : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_299_slug_url_c745b6cc61')}</label>
              <input
                className={fieldClass(Boolean(fieldErrors.slug))}
                value={draft.slug}
                disabled={seed}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
              {fieldErrors.slug ? <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p> : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_308_category_75270fc1ad')}</label>
              <select
                className={fieldClass(Boolean(fieldErrors.categoryId))}
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('ui_admin_course_language', { defaultValue: 'Course language' })}{' '}
                <span className="text-red-600">*</span>
              </label>
              <select
                className={fieldClass(Boolean(fieldErrors.languageId))}
                value={draft.languageId || DEFAULT_COURSE_LANGUAGE_ID}
                onChange={(e) => setDraft({ ...draft, languageId: e.target.value })}
              >
                {languageList.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name} ({lang.code})
                  </option>
                ))}
              </select>
              {fieldErrors.languageId ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.languageId}</p>
              ) : null}
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-sky-700 hover:text-sky-900"
                onClick={() => {
                  setShowAddLanguage((v) => !v)
                  setLangErr('')
                }}
              >
                {showAddLanguage
                  ? t('ui_admin_language_cancel_add', { defaultValue: 'Cancel' })
                  : t('ui_admin_language_add_new', { defaultValue: '+ Add a new language' })}
              </button>
              {showAddLanguage ? (
                <div className="mt-3 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t('ui_admin_language_name', { defaultValue: 'Language name' })}
                      </label>
                      <input
                        className={fieldClass(false)}
                        value={newLangName}
                        placeholder="e.g. Spanish"
                        onChange={(e) => setNewLangName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t('ui_admin_language_code', { defaultValue: 'Code (optional)' })}
                      </label>
                      <input
                        className={fieldClass(false)}
                        value={newLangCode}
                        placeholder="e.g. es"
                        onChange={(e) => setNewLangCode(e.target.value)}
                      />
                    </div>
                  </div>
                  {langErr ? <p className="mt-2 text-xs text-red-600">{langErr}</p> : null}
                  <Button
                    type="button"
                    className="mt-3 !rounded-lg !py-2 !text-xs"
                    disabled={langBusy}
                    onClick={() => void addLanguage()}
                  >
                    {langBusy ? t('ui_admin_language_saving', { defaultValue: 'Saving…' }) : t('ui_admin_language_save', { defaultValue: 'Add language' })}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_322_summary_3f66b35883')}</label>
              <input
                className={fieldClass(Boolean(fieldErrors.summary))}
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
              {fieldErrors.summary ? <p className="mt-1 text-xs text-red-600">{fieldErrors.summary}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_330_description_49dc831b7d')}</label>
              <textarea
                className={fieldClass(Boolean(fieldErrors.description), 'input-pro mt-1.5 min-h-[88px] w-full resize-y')}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
              {fieldErrors.description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <AdminCourseContentPlaylist
                slides={playlistSlides}
                onChange={setPlaylistSlides}
                disabled={uploading}
                error={fieldErrors.slides}
              />
              {slideUploadErr ? <p className="mt-2 text-xs font-medium text-amber-800">{slideUploadErr}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_338_price_usd_cents_16bc7ab177')}</label>
                <input
                  type="number"
                  className={fieldClass(Boolean(fieldErrors.priceCents))}
                  value={draft.priceCents}
                  onChange={(e) => setDraft({ ...draft, priceCents: Number(e.target.value) })}
                />
                {fieldErrors.priceCents ? <p className="mt-1 text-xs text-red-600">{fieldErrors.priceCents}</p> : null}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('ui_admin_course_discount_percent', { defaultValue: 'Sale discount %' })}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-pro mt-1.5 w-full"
                  value={draft.discountPercent ?? 0}
                  onChange={(e) => setDraft({ ...draft, discountPercent: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('ui_admin_course_discount_hint', {
                    defaultValue: 'Shown on catalog and applied at checkout (0 = no sale).',
                  })}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_347_duration_minutes_8e1195fdec')}</label>
              <p className="input-pro mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {playlistSlides.length > 0
                  ? `${contentMetrics.durationMinutes} min (${Math.floor(contentMetrics.durationSeconds / 60)}h ${contentMetrics.durationSeconds % 60}m) — auto`
                  : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">30 sec per PDF page + video length. Not editable.</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminCoursesPage_356_slide_count_491e07694f')}</label>
              <p className="input-pro mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {playlistSlides.length > 0 ? contentMetrics.slideCount : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Total learner steps (pages + videos).</p>
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
            <div className="space-y-4">
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
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('ui_courses_popular_label')}</label>
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-amber-600"
                    checked={Boolean(draft.popular)}
                    onChange={(e) => setDraft({ ...draft, popular: e.target.checked })}
                  />
                  {t('ui_courses_popular_hint')}
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Course hero image (catalog + detail page)
              </label>
              <p className="mt-1 text-[11px] text-slate-500">Shown on the course card and detail page.</p>
              {draft.imageUrl ? (
                heroPreviewBroken ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Could not load preview. Check the URL or upload again.
                  </p>
                ) : (
                  <img
                    key={resolveMediaUrl(draft.imageUrl)}
                    src={resolveMediaUrl(draft.imageUrl)}
                    alt="Course thumbnail preview"
                    className="mt-3 max-h-48 w-full rounded-xl object-cover ring-1 ring-slate-200"
                    onLoad={() => setHeroPreviewBroken(false)}
                    onError={() => setHeroPreviewBroken(true)}
                  />
                )
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                  No thumbnail yet — upload an image above
                </p>
              )}
              <input
                ref={heroImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file || !draft) return
                  setHeroPreviewBroken(false)
                  setSlideUploadErr('')
                  setHeroUploadJobId(startAdminFileUpload('/api/admin/upload/image', file))
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!rounded-lg !py-2 !text-xs"
                  disabled={uploading}
                  onClick={() => heroImageRef.current?.click()}
                >
                  {draft.imageUrl && !heroPreviewBroken ? 'Replace hero image' : 'Upload hero image'}
                </Button>
                {draft.imageUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!rounded-lg !border-red-200 !py-2 !text-xs !text-red-800"
                    disabled={uploading}
                    onClick={() => {
                      setHeroPreviewBroken(false)
                      setDraft({ ...draft, imageUrl: '' })
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {fieldErrors.imageUrl ? <p className="mt-1 text-xs text-red-600">{fieldErrors.imageUrl}</p> : null}
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
