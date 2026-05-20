import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CertificateVisual } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import {
  fetchCategories,
  fetchCourseById,
  fetchMyCertificates,
  fetchMyEnrollments,
  fetchMyProgress,
  fetchPublishedTestForCourse,
  issueCertificate,
  patchMyProgress,
  submitNoTestPass,
  submitTestAnswers,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { CourseSlideViewer } from '@/components/CourseSlideViewer'
import { getCourseSlideCount, getCourseSlides } from '@/lib/courseSlides'
import { useAuth } from '@/contexts/AuthContext'
import { easeOut, transition } from '@/lib/motionPresets'
import type { AdminTest, Certificate } from '@/types'
import { t } from '@/i18n/t'
import { localizedCourseTitle } from '@/lib/catalogLocale'

function scoreMeetsPassThreshold(test: AdminTest, answers: Record<string, string>): boolean {
  if (!test.questions.length) return false
  let correct = 0
  for (const q of test.questions) {
    const pick = answers[q.id]
    if (q.options.some((o) => o.id === pick && o.isCorrect)) correct++
  }
  return (100 * correct) / test.questions.length >= test.passPercent
}

export function LearnPage() {
  const reduce = useReducedMotion()
  const { courseId = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: qk.courseById(courseId),
    queryFn: () => fetchCourseById(courseId),
    enabled: Boolean(user && courseId),
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: qk.enrollments,
    queryFn: fetchMyEnrollments,
    enabled: Boolean(user && courseId),
  })

  const purchased = Boolean(
    course && enrollments.some((e) => e.courseId === course.id && !e.refunded),
  )

  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    enabled: Boolean(user && courseId),
  })

  const { data: progressRow, isFetched: progressReady } = useQuery({
    queryKey: qk.progress(courseId),
    queryFn: () => fetchMyProgress(courseId),
    enabled: Boolean(user && courseId && purchased),
  })

  const { data: publishedTest } = useQuery({
    queryKey: qk.publishedTest(courseId),
    queryFn: () => fetchPublishedTestForCourse(courseId),
    enabled: Boolean(user && courseId && purchased),
  })

  const { data: certs = [] } = useQuery({
    queryKey: qk.certificates,
    queryFn: fetchMyCertificates,
    enabled: Boolean(user && courseId && purchased),
  })

  const saveProgress = useMutation({
    mutationFn: (body: { slideIndex: number; audioTimeSec: number; completedSlides: boolean }) =>
      patchMyProgress(courseId, body),
  })

  const [slideIndex, setSlideIndex] = useState(0)
  const [showTest, setShowTest] = useState(false)
  const [fallbackAnswer, setFallbackAnswer] = useState<'a' | 'b' | null>(null)
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [testErr, setTestErr] = useState('')
  const [freshCert, setFreshCert] = useState<Certificate | null>(null)

  const totalSlides = course ? getCourseSlideCount(course) : 1
  const courseSlides = course ? getCourseSlides(course) : []
  const currentSlide = courseSlides[slideIndex]

  useEffect(() => {
    if (!courseId || !course || !progressReady || !progressRow) return
    const max = Math.max(0, getCourseSlideCount(course) - 1)
    setSlideIndex(Math.min(progressRow.slideIndex ?? 0, max))
  }, [course, courseId, progressReady, progressRow])

  useEffect(() => {
    if (!courseId || !course) return
    const tmr = window.setTimeout(() => {
      saveProgress.mutate({
        slideIndex,
        audioTimeSec: 0,
        completedSlides: slideIndex >= totalSlides - 1,
      })
    }, 400)
    return () => window.clearTimeout(tmr)
  }, [course, courseId, slideIndex, totalSlides, saveProgress])

  const submitCustomTest = useCallback(async () => {
    if (!publishedTest?.questions.length || !course) return
    setSubmitted(true)
    setTestErr('')
    try {
      const res = await submitTestAnswers(course.id, mcAnswers)
      if (res.passed) {
        const cert = await issueCertificate(course.id)
        setFreshCert(cert)
        await qc.invalidateQueries({ queryKey: qk.certificates })
      }
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : 'Submit failed')
    }
  }, [course, mcAnswers, publishedTest, qc])

  const submitFallbackTest = useCallback(async () => {
    if (!course) return
    setSubmitted(true)
    setTestErr('')
    if (fallbackAnswer !== 'a') return
    try {
      await submitNoTestPass(course.id, true)
      const cert = await issueCertificate(course.id)
      setFreshCert(cert)
      await qc.invalidateQueries({ queryKey: qk.certificates })
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : 'Submit failed')
    }
  }, [course, fallbackAnswer, qc])

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <p className="text-slate-600">{t('LearnPage_74_sign_in_to_access_the_course_player_36200b14d2')}</p>
          <Link to="/login" className="mt-6 inline-block font-semibold text-amber-700 hover:text-amber-600">
            {t('ui_learn_sign_in_arrow')}
          </Link>
        </Container>
      </div>
    )
  }

  if (courseLoading) {
    return (
      <div className="py-20">
        <Container>
          <p className="text-slate-600">{t('ui_page_loader_course', { defaultValue: 'Loading course…' })}</p>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-20">
        <Container>
          <h1 className="font-display text-xl font-bold text-brand-900">{t('LearnPage_87_course_not_found_2465eb9154')}</h1>
          <Link to="/courses" className="mt-4 inline-block font-semibold text-amber-700">
            {t('ui_learn_catalog_arrow')}
          </Link>
        </Container>
      </div>
    )
  }

  if (!purchased) {
    return (
      <div className="py-20">
        <Container className="max-w-lg">
          <h1 className="font-display text-xl font-bold text-brand-900">{t('LearnPage_100_not_enrolled_597ec4b0de')}</h1>
          <p className="mt-2 text-slate-600">{t('ui_learn_enroll_first')}</p>
          <Link to={`/courses/${course.slug}`}>
            <Button className="mt-6">{t('LearnPage_103_view_course_4787a51af8')}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const openTest = () => {
    setMcAnswers({})
    setFallbackAnswer(null)
    setSubmitted(false)
    setTestErr('')
    setFreshCert(null)
    setShowTest(true)
  }

  const customTestReady = Boolean(publishedTest && publishedTest.questions.length > 0)
  const allMcAnswered =
    customTestReady &&
    publishedTest!.questions.every((q) => Boolean(mcAnswers[q.id]))
  const customPassed =
    customTestReady && submitted && scoreMeetsPassThreshold(publishedTest!, mcAnswers)
  const fallbackPassed = submitted && fallbackAnswer === 'a'

  const slideNum = Math.min(slideIndex + 1, totalSlides)
  const isLastSlide = slideIndex >= totalSlides - 1
  const progressPct = Math.round(((slideIndex + 1) / totalSlides) * 100)

  const passCert =
    freshCert && freshCert.courseId === course.id
      ? freshCert
      : certs.filter((x) => x.courseId === course.id).at(-1)

  if (showTest) {
    const passed = customTestReady ? customPassed : fallbackPassed
    return (
      <motion.div
        className="min-h-[70vh] bg-gradient-to-b from-slate-100 to-slate-50 py-12 sm:py-16"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.page}
      >
        <Container className="w-full min-w-0 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">{t('LearnPage_173_knowledge_check_e4ec131477')}</h1>
          <p className="mt-2 break-words text-sm text-slate-600">
            {localizedCourseTitle(course.slug, course.title)}
          </p>
          {publishedTest?.title ? (
            <p className="mt-1 text-xs font-medium text-sky-800">{publishedTest.title}</p>
          ) : null}
          {testErr ? <p className="mt-2 text-sm text-red-600">{testErr}</p> : null}
          <div className="card-elevated mt-8 min-w-0 overflow-x-hidden p-4 sm:p-8">
            {customTestReady && publishedTest ? (
              <>
                <p className="text-xs text-slate-500">
                  {t('ui_learn_test_intro_before')}
                  <strong className="text-brand-800">{publishedTest.passPercent}%</strong>
                  {t('ui_learn_test_intro_after')}
                </p>
                <div className="mt-8 space-y-10">
                  {publishedTest.questions.map((q, qi) => (
                    <div key={q.id}>
                      <p className="break-words font-medium leading-relaxed text-slate-800">
                        <span className="mr-2 text-sky-700">{qi + 1}.</span>
                        {q.prompt}
                      </p>
                      <div className="mt-4 space-y-2">
                        {q.options.map((o) => (
                          <label
                            key={o.id}
                            className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300/80 hover:bg-sky-50/30"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={mcAnswers[q.id] === o.id}
                              onChange={() => setMcAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                              className="mt-0.5 shrink-0 accent-sky-600"
                            />
                            <span className="min-w-0 flex-1 break-words text-sm">{o.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {!submitted ? (
                  <Button className="mt-10" disabled={!allMcAnswered} onClick={() => void submitCustomTest()}>
                    {t('ui_learn_submit_answers')}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs text-amber-800/90">{t('ui_learn_no_test_warning')}</p>
                <p className="mt-6 font-medium leading-relaxed text-slate-800">{t('ui_learn_sample_question_title')}</p>
                <div className="mt-6 space-y-3">
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300/80 hover:bg-sky-50/30">
                    <input
                      type="radio"
                      name="fallback-q"
                      checked={fallbackAnswer === 'a'}
                      onChange={() => setFallbackAnswer('a')}
                      className="mt-0.5 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm">{t('LearnPage_234_protect_workers_and_prevent_incidents_7bf8112ad7')}</span>
                  </label>
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300/80 hover:bg-sky-50/30">
                    <input
                      type="radio"
                      name="fallback-q"
                      checked={fallbackAnswer === 'b'}
                      onChange={() => setFallbackAnswer('b')}
                      className="mt-0.5 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm">{t('LearnPage_244_reduce_paperwork_only_d19268d9e2')}</span>
                  </label>
                </div>
                {!submitted ? (
                  <Button className="mt-8" disabled={!fallbackAnswer} onClick={() => void submitFallbackTest()}>
                    {t('ui_learn_submit_answers')}
                  </Button>
                ) : null}
              </>
            )}

            {submitted && passed ? (
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-center text-sm text-emerald-950 sm:px-5">
                  <strong>{t('LearnPage_258_congratulations_you_passed_70ea555952')}</strong> {t('ui_learn_pass_saved_blurb')}
                </div>
                {passCert ? (
                  <CertificateVisual
                    cert={passCert}
                    categories={categoryList}
                    variant="compact"
                    className="mx-auto w-full min-w-0 max-w-full shadow-md sm:max-w-xl"
                  />
                ) : null}
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/certificates">
                    <Button>{t('LearnPage_270_view_all_certificates_7adad16f2a')}</Button>
                  </Link>
                  <Link to="/my-courses">
                    <Button variant="secondary">{t('LearnPage_273_my_learning_06b8911395')}</Button>
                  </Link>
                </div>
              </div>
            ) : null}
            {submitted && !passed ? (
              <div className="mt-8 rounded-2xl border border-red-200/80 bg-red-50/90 p-5 text-sm text-red-900">
                {t('ui_learn_fail_message')}
                <Button
                  className="mt-5"
                  variant="secondary"
                  onClick={() => {
                    setSubmitted(false)
                    setFallbackAnswer(null)
                    setMcAnswers({})
                    setTestErr('')
                    setFreshCert(null)
                  }}
                >
                  {t('ui_learn_retry')}
                </Button>
              </div>
            ) : null}
          </div>
        </Container>
      </motion.div>
    )
  }

  return (
    <div className="min-h-[72vh] bg-slate-50 py-8 sm:py-12">
      <Container>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">{t('LearnPage_305_now_learning_08b44848c4')}</p>
            <h1 className="mt-1 break-words font-display text-lg font-semibold text-brand-900 sm:text-xl md:text-2xl">
              {localizedCourseTitle(course.slug, course.title)}
            </h1>
          </div>
          <Link
            to="/my-courses"
            className="shrink-0 text-sm font-medium text-sky-800 transition hover:text-sky-900 sm:pt-1"
          >
            {t('ui_learn_back_my_courses')}
          </Link>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200/90">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: reduce ? 0 : 0.35, ease: easeOut }}
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/60">
          <div className="relative flex aspect-[16/9] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/90 p-2 text-center sm:p-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-40 grid-pattern"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.12), transparent 55%)',
              }}
            />
            <motion.div
              key={slideIndex}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: easeOut }}
              className="relative flex h-full min-h-[min(70vh,520px)] w-full flex-col"
            >
              <CourseSlideViewer slide={currentSlide} slideNum={slideNum} totalSlides={totalSlides} />
            </motion.div>
          </div>
          <div className="flex flex-col gap-4 border-t border-slate-200/90 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-8">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="!rounded-xl"
                disabled={slideIndex <= 0}
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('ui_learn_previous')}
              </Button>
              <Button
                variant="secondary"
                className="!rounded-xl"
                disabled={isLastSlide}
                onClick={() => setSlideIndex((i) => Math.min(totalSlides - 1, i + 1))}
              >
                {t('ui_learn_next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {isLastSlide ? (
              <Button className="!rounded-xl sm:shrink-0" onClick={openTest}>
                {t('ui_learn_take_knowledge_check')}
              </Button>
            ) : (
              <span className="text-center text-sm text-slate-600 sm:text-left">{t('LearnPage_389_complete_all_slides_to_unlock_the_test_0825f886f3')}</span>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
