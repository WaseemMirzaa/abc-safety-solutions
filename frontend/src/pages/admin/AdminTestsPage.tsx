import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Pencil, Trash2, ListPlus, X, Download, Upload } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import {
  adminDeleteTest,
  adminSaveTest,
  fetchAdminTests,
  fetchPublishedCourses,
  previewBulkTest,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import type { AdminTest, TestAnswerOption, TestQuestion } from '@/types'
import { t } from '@/i18n/t'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function newOption(questionId: string, isCorrect: boolean): TestAnswerOption {
  return { id: `opt-${questionId}-${uid()}`, label: '', isCorrect }
}

function newQuestion(): TestQuestion {
  const id = `q-${uid()}`
  return {
    id,
    prompt: '',
    options: [newOption(id, true), newOption(id, false)],
  }
}

function emptyTest(courseId: string): AdminTest {
  return {
    id: `test-${uid()}`,
    courseId,
    title: '',
    passPercent: 80,
    timeLimitMinutes: 0,
    published: false,
    updatedAt: new Date().toISOString(),
    questions: [newQuestion()],
  }
}

function validateTest(test: AdminTest): string | null {
  if (!test.title.trim()) return 'Enter a test title.'
  if (!test.courseId) return 'Select a course.'
  if (Number.isNaN(test.passPercent) || test.passPercent < 0 || test.passPercent > 100) {
    return 'Pass threshold must be between 0 and 100.'
  }
  const limit = test.timeLimitMinutes ?? 0
  if (Number.isNaN(limit) || limit < 0 || limit > 480) {
    return 'Time limit must be 0 (no limit) or between 1 and 480 minutes.'
  }
  if (test.questions.length < 1) return 'Add at least one question.'
  for (let i = 0; i < test.questions.length; i++) {
    const q = test.questions[i]
    if (!q.prompt.trim()) return `Question ${i + 1}: enter the prompt.`
    if (q.options.length < 2) return `Question ${i + 1}: add at least two answer choices.`
    const correct = q.options.filter((o) => o.isCorrect)
    if (correct.length !== 1) return `Question ${i + 1}: mark exactly one correct answer.`
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j].label.trim()) return `Question ${i + 1}, choice ${j + 1}: enter label text.`
    }
  }
  return null
}

export function AdminTestsPage() {
  const qc = useQueryClient()
  const { data: tests = [], isLoading } = useQuery({ queryKey: qk.adminTests, queryFn: fetchAdminTests })
  const { data: courseList = [] } = useQuery({ queryKey: qk.courses, queryFn: fetchPublishedCourses })

  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed')
  const [draft, setDraft] = useState<AdminTest | null>(null)
  const [err, setErr] = useState('')
  const [bulkContent, setBulkContent] = useState('')
  const [bulkPreview, setBulkPreview] = useState<{
    questions: TestQuestion[]
    errors: { row: number; message: string }[]
  } | null>(null)
  const [bulkCourseId, setBulkCourseId] = useState('')
  const [bulkTitle, setBulkTitle] = useState('')
  const [bulkPass, setBulkPass] = useState(80)

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminTests })

  const openCreate = () => {
    setDraft(emptyTest(courseList[0]?.id ?? ''))
    setErr('')
    setModal('create')
  }

  const openEdit = (row: AdminTest) => {
    setDraft({
      ...(JSON.parse(JSON.stringify(row)) as AdminTest),
      timeLimitMinutes: row.timeLimitMinutes ?? 0,
    })
    setErr('')
    setModal('edit')
  }

  const close = () => {
    setModal('closed')
    setDraft(null)
    setErr('')
  }

  const save = async () => {
    if (!draft) return
    const next: AdminTest = {
      ...draft,
      title: draft.title.trim(),
      passPercent: Math.min(100, Math.max(0, Math.round(draft.passPercent))),
      timeLimitMinutes: Math.min(480, Math.max(0, Math.round(draft.timeLimitMinutes ?? 0))),
      updatedAt: new Date().toISOString(),
    }
    const v = validateTest(next)
    if (v) {
      setErr(v)
      return
    }
    await adminSaveTest(next, modal === 'create' ? 'create' : 'edit')
    invalidate()
    close()
  }

  const remove = async (id: string) => {
    if (window.confirm('Delete this test and all its questions?')) {
      await adminDeleteTest(id)
      invalidate()
    }
  }

  const courseTitle = (id: string) => courseList.find((c) => c.id === id)?.title ?? id

  const addQuestion = () => {
    if (!draft) return
    setDraft({ ...draft, questions: [...draft.questions, newQuestion()] })
  }

  const removeQuestion = (qid: string) => {
    if (!draft || draft.questions.length <= 1) return
    setDraft({ ...draft, questions: draft.questions.filter((q) => q.id !== qid) })
  }

  const updatePrompt = (qid: string, prompt: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      questions: draft.questions.map((q) => (q.id === qid ? { ...q, prompt } : q)),
    })
  }

  const addOption = (qid: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      questions: draft.questions.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, newOption(qid, false)] } : q,
      ),
    })
  }

  const removeOption = (qid: string, oid: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      questions: draft.questions.map((q) => {
        if (q.id !== qid) return q
        if (q.options.length <= 2) return q
        const nextOpts = q.options.filter((o) => o.id !== oid)
        if (!nextOpts.some((o) => o.isCorrect)) nextOpts[0] = { ...nextOpts[0], isCorrect: true }
        return { ...q, options: nextOpts }
      }),
    })
  }

  const updateOptionLabel = (qid: string, oid: string, label: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      questions: draft.questions.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, label } : o)) }
          : q,
      ),
    })
  }

  const setCorrectOption = (qid: string, oid: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      questions: draft.questions.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o) => ({ ...o, isCorrect: o.id === oid })) }
          : q,
      ),
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminTestsPage_187_tests_questions_9e54625be0')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Each test belongs to one course. Add separate questions; each question has its own multiple-choice answers and one correct option. Pass % is the share of questions the learner must answer correctly.
            </p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={openCreate} disabled={!courseList.length}>
          <Plus className="h-4 w-4" />
          Add test
        </Button>
      </div>

      <div className="mt-8 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4">
        <h2 className="font-display text-lg font-semibold text-brand-900">Bulk import questions</h2>
        <p className="mt-1 text-xs text-slate-600">
          CSV only — questions only. Pick course and test title below, then preview and confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!text-xs gap-1.5"
            onClick={() => {
              const csv = [
                'question,optionA,optionB,optionC,optionD,correctOption',
                'What does PPE stand for?,Personal Protective Equipment,Protective Procedure Equipment,Personal Prevention Equipment,Public Protection Equipment,A',
                'What should you do after a chemical spill?,Report it and follow spill response,Ignore it and continue working,B',
                'Which extinguisher class is for electrical fires?,Class A,Class B,Class C,C',
                'When must a near-miss be reported?,Only if injured,Within 24 hours,Immediately after it occurs,At week end,C',
                'Correct lifting technique?,Bend at waist,Keep back straight and lift with legs,B',
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'sample-test-questions.csv'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download sample CSV
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              Upload CSV file
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  setBulkContent((ev.target?.result as string) ?? '')
                  setBulkPreview(null)
                }
                reader.readAsText(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <textarea
          className="input-pro mt-3 min-h-[100px] w-full font-mono text-xs"
          value={bulkContent}
          onChange={(e) => setBulkContent(e.target.value)}
          placeholder="Paste CSV or upload a file above…"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            className="input-pro w-full"
            value={bulkCourseId}
            onChange={(e) => setBulkCourseId(e.target.value)}
          >
            <option value="">Select course</option>
            {courseList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            className="input-pro w-full"
            placeholder="Test title"
            value={bulkTitle}
            onChange={(e) => setBulkTitle(e.target.value)}
          />
          <input
            type="number"
            className="input-pro w-full"
            placeholder="Pass %"
            value={bulkPass}
            onChange={(e) => setBulkPass(Number(e.target.value))}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!text-xs"
            onClick={() => {
              void previewBulkTest(bulkContent).then(setBulkPreview)
            }}
          >
            Preview
          </Button>
          <Button
            type="button"
            className="!text-xs"
            disabled={!bulkPreview?.questions.length || !bulkCourseId || !bulkTitle.trim()}
            onClick={() => {
              if (!bulkPreview) return
              const test: AdminTest = {
                id: `test-${uid()}`,
                courseId: bulkCourseId,
                title: bulkTitle.trim(),
                passPercent: bulkPass,
                timeLimitMinutes: 0,
                published: false,
                updatedAt: new Date().toISOString(),
                questions: bulkPreview.questions,
              }
              void adminSaveTest(test, 'create').then(() => {
                invalidate()
                setBulkContent('')
                setBulkPreview(null)
                setBulkTitle('')
              })
            }}
          >
            Confirm save
          </Button>
        </div>
        {bulkPreview ? (
          <div className="mt-3 text-xs">
            <p className="font-medium text-brand-900">{bulkPreview.questions.length} question(s) ready</p>
            {bulkPreview.errors.map((e) => (
              <p key={e.row} className="text-amber-800">
                Row {e.row}: {e.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">{t('AdminTestsPage_203_test_3dea4b6c14')}</th>
              <th className="px-4 py-3">{t('AdminTestsPage_204_course_72d8afd16e')}</th>
              <th className="px-4 py-3">{t('AdminTestsPage_205_pass_ac67fa1740')}</th>
              <th className="px-4 py-3">{t('AdminTestsPage_206_questions_3619dca933')}</th>
              <th className="px-4 py-3">{t('ui_admin_test_time_limit', { defaultValue: 'Time limit' })}</th>
              <th className="px-4 py-3">{t('AdminTestsPage_207_status_fef601f192')}</th>
              <th className="px-4 py-3 text-right">{t('AdminTestsPage_208_actions_0d1e9ef6f2')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No tests yet. Create one with real questions and choices; learners see it when the test is published for that course.
                </td>
              </tr>
            ) : (
              tests.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-brand-900">{row.title || t('ui_em_dash')}</td>
                  <td className="px-4 py-3 text-slate-600">{courseTitle(row.courseId)}</td>
                  <td className="px-4 py-3">{row.passPercent}%</td>
                  <td className="px-4 py-3">{row.questions?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {(row.timeLimitMinutes ?? 0) > 0
                      ? t('ui_admin_test_time_minutes', {
                          defaultValue: '{{n}} min',
                          n: row.timeLimitMinutes,
                        })
                      : t('ui_admin_test_time_none', { defaultValue: 'No limit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.published
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800'
                          : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700'
                      }
                    >
                      {row.published ? t('ui_tests_status_live') : t('ui_tests_status_draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" className="!rounded-lg !py-1.5 !text-xs" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!rounded-lg !border-red-200 !py-1.5 !text-xs !text-red-800"
                        onClick={() => remove(row.id)}
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

      {modal !== 'closed' && draft ? (
        <AdminModal title={modal === 'create' ? t('ui_tests_modal_build') : t('ui_tests_modal_edit')} wide onClose={close}>
          {err ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p> : null}
          <div className="max-h-[min(70vh,560px)] space-y-6 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminTestsPage_269_test_title_58d6c63e4e')}</label>
                <input
                  className="input-pro mt-1.5 w-full"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. OSHA 10 — final knowledge check"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminTestsPage_278_course_2b2d4a1e7e')}</label>
                <select
                  className="input-pro mt-1.5 w-full"
                  value={draft.courseId}
                  onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}
                >
                  {courseList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminTestsPage_292_pass_threshold_correct_2a30dfd467')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input-pro mt-1.5 w-full"
                  value={draft.passPercent}
                  onChange={(e) => setDraft({ ...draft, passPercent: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('AdminTestsPage_301_e_g_80_means_at_least_80_of_questions_must_be_an_367de2b246')}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('ui_admin_test_time_limit', { defaultValue: 'Time limit (minutes)' })}
                </label>
                <input
                  type="number"
                  min={0}
                  max={480}
                  className="input-pro mt-1.5 w-full"
                  value={draft.timeLimitMinutes ?? 0}
                  onChange={(e) => setDraft({ ...draft, timeLimitMinutes: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('ui_admin_test_time_help', {
                    defaultValue: '0 = no limit. When time runs out, unanswered questions count as wrong and selections are scored automatically.',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="font-display text-sm font-semibold text-brand-900">{t('AdminTestsPage_306_questions_cba711c1bc')}</p>
              <Button type="button" variant="secondary" className="!gap-1.5 !py-2 !text-xs" onClick={addQuestion}>
                <ListPlus className="h-4 w-4" />
                {t('ui_tests_add_question')}
              </Button>
            </div>

            <div className="space-y-6">
              {draft.questions.map((q, qi) => (
                <div key={q.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                      {t('ui_tests_question_label', { n: qi + 1 })}
                    </span>
                    {draft.questions.length > 1 ? (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        aria-label="Remove question"
                        onClick={() => removeQuestion(q.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminTestsPage_329_prompt_747a61bfd4')}</label>
                  <textarea
                    className="input-pro mt-1.5 min-h-[72px] w-full resize-y text-sm"
                    value={q.prompt}
                    onChange={(e) => updatePrompt(q.id, e.target.value)}
                    placeholder="What should workers do before entering a confined space?"
                  />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminTestsPage_336_answer_choices_select_the_correct_one_37e76a90e0')}</p>
                  <ul className="mt-2 space-y-2">
                    {q.options.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white bg-white p-2 shadow-sm sm:flex-nowrap">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={o.isCorrect}
                          onChange={() => setCorrectOption(q.id, o.id)}
                          className="accent-sky-600"
                          title="Correct answer"
                        />
                        <input
                          className="input-pro min-w-0 flex-1 !py-2 text-sm"
                          value={o.label}
                          onChange={(e) => updateOptionLabel(q.id, o.id, e.target.value)}
                          placeholder="Answer text"
                        />
                        {q.options.length > 2 ? (
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            aria-label="Remove choice"
                            onClick={() => removeOption(q.id, o.id)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="w-9 shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="secondary" className="mt-3 !text-xs" onClick={() => addOption(q.id)}>
                    Add choice
                  </Button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-sky-600"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Published (learners who finish slides will take this test)
            </label>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            <Button type="button" onClick={() => void save()}>
              Save test
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
