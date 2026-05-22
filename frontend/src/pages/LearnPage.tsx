import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { KnowledgeCheckView } from '@/components/learn/KnowledgeCheckView'
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
import {
  getCourseSlideCount,
  getCourseSlides,
  getPptxDeckSlide,
  getVideoSlide,
  isVideoCourse,
} from '@/lib/courseSlides'
import { useAuth } from '@/contexts/AuthContext'
import { easeOut } from '@/lib/motionPresets'
import type { Certificate } from '@/types'
import { t } from '@/i18n/t'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { findEnrollment, hasCourseAccess } from '@/lib/courseAccess'

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

  const enrollment = course ? findEnrollment(enrollments, course.id) : undefined
  const hasAccess =
    enrollment?.hasAccess ??
    (enrollment && course ? hasCourseAccess(enrollment, course) : false)

  const { data: categoryList = [] } = useQuery({
    queryKey: qk.categories,
    queryFn: fetchCategories,
    enabled: Boolean(user && courseId),
  })

  const { data: progressRow, isFetched: progressReady } = useQuery({
    queryKey: qk.progress(courseId),
    queryFn: () => fetchMyProgress(courseId),
    enabled: Boolean(user && courseId && hasAccess),
  })

  const { data: publishedTest } = useQuery({
    queryKey: qk.publishedTest(courseId),
    queryFn: () => fetchPublishedTestForCourse(courseId),
    enabled: Boolean(user && courseId && hasAccess),
  })

  const { data: certs = [] } = useQuery({
    queryKey: qk.certificates,
    queryFn: fetchMyCertificates,
    enabled: Boolean(user && courseId && hasAccess),
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
  const [submittingTest, setSubmittingTest] = useState(false)
  const [testSubmitResult, setTestSubmitResult] = useState<{
    passed: boolean
    scorePercent: number
    passPercent: number
  } | null>(null)
  const [testErr, setTestErr] = useState('')
  const [freshCert, setFreshCert] = useState<Certificate | null>(null)
  const [videoDoneLocal, setVideoDoneLocal] = useState(false)

  const videoCourse = course ? isVideoCourse(course) : false
  const totalSlides = course ? getCourseSlideCount(course) : 1
  const courseSlides = course ? getCourseSlides(course) : []
  const pptxDeck = course && !videoCourse ? getPptxDeckSlide(course) : undefined
  const videoSlide = course && videoCourse ? getVideoSlide(course) : undefined
  const currentSlide = videoSlide ?? pptxDeck ?? courseSlides[slideIndex]
  const contentComplete = Boolean(progressRow?.completedSlides) || videoDoneLocal

  useEffect(() => {
    setVideoDoneLocal(false)
  }, [courseId])

  useEffect(() => {
    if (!courseId || !course || !progressReady || !progressRow) return
    const max = Math.max(0, getCourseSlideCount(course) - 1)
    setSlideIndex(Math.min(progressRow.slideIndex ?? 0, max))
  }, [course, courseId, progressReady, progressRow])

  useEffect(() => {
    if (!courseId || !course || videoCourse) return
    const tmr = window.setTimeout(() => {
      saveProgress.mutate({
        slideIndex,
        audioTimeSec: 0,
        completedSlides: slideIndex >= totalSlides - 1,
      })
    }, 400)
    return () => window.clearTimeout(tmr)
  }, [course, courseId, slideIndex, totalSlides, saveProgress, videoCourse])

  const markVideoComplete = useCallback(() => {
    if (!courseId || !videoCourse) return
    setVideoDoneLocal(true)
    saveProgress.mutate(
      {
        slideIndex: 0,
        audioTimeSec: 0,
        completedSlides: true,
      },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: qk.progress(courseId) })
        },
      },
    )
  }, [courseId, saveProgress, videoCourse, qc])

  const submitCustomTest = useCallback(async () => {
    if (!publishedTest?.questions.length || !course) return
    const allAnswered = publishedTest.questions.every((q) => Boolean(mcAnswers[q.id]))
    if (!allAnswered) {
      setTestErr(t('ui_learn_test_answer_all', { defaultValue: 'Please answer every question.' }))
      return
    }
    setSubmittingTest(true)
    setTestErr('')
    setTestSubmitResult(null)
    try {
      const res = await submitTestAnswers(course.id, mcAnswers)
      setTestSubmitResult(res)
      setSubmitted(true)
      if (res.passed) {
        const cert = await issueCertificate(course.id)
        setFreshCert(cert)
        await qc.invalidateQueries({ queryKey: qk.certificates })
      }
    } catch (e) {
      setSubmitted(false)
      setTestSubmitResult(null)
      setTestErr(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmittingTest(false)
    }
  }, [course, mcAnswers, publishedTest, qc])

  const submitFallbackTest = useCallback(async () => {
    if (!course || !fallbackAnswer) return
    setSubmittingTest(true)
    setTestErr('')
    setTestSubmitResult(null)
    const passed = fallbackAnswer === 'a'
    try {
      const res = await submitNoTestPass(course.id, passed)
      setTestSubmitResult({ passed: res.passed, scorePercent: passed ? 100 : 0, passPercent: 100 })
      setSubmitted(true)
      if (res.passed) {
        const cert = await issueCertificate(course.id)
        setFreshCert(cert)
        await qc.invalidateQueries({ queryKey: qk.certificates })
      }
    } catch (e) {
      setSubmitted(false)
      setTestSubmitResult(null)
      setTestErr(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmittingTest(false)
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

  if (!hasAccess) {
    const checkoutHref = `/checkout?course=${encodeURIComponent(course.slug)}`
    return (
      <div className="py-20">
        <Container className="max-w-lg">
          <h1 className="font-display text-xl font-bold text-brand-900">{t('LearnPage_100_not_enrolled_597ec4b0de')}</h1>
          <p className="mt-2 text-slate-600">
            {course.priceCents > 0 ? t('ui_learn_pay_first') : t('ui_learn_enroll_first')}
          </p>
          <Link to={course.priceCents > 0 ? checkoutHref : `/courses/${course.slug}`}>
            <Button className="mt-6">
              {course.priceCents > 0 ? t('ui_checkout_pay_stripe') : t('LearnPage_103_view_course_4787a51af8')}
            </Button>
          </Link>
        </Container>
      </div>
    )
  }

  const openTest = () => {
    setMcAnswers({})
    setFallbackAnswer(null)
    setSubmitted(false)
    setSubmittingTest(false)
    setTestSubmitResult(null)
    setTestErr('')
    setFreshCert(null)
    setShowTest(true)
  }

  const customTestReady = Boolean(publishedTest && publishedTest.questions.length > 0)
  const customPassed = customTestReady && submitted && testSubmitResult?.passed === true
  const fallbackPassed = !customTestReady && submitted && testSubmitResult?.passed === true

  const slideNum = videoCourse ? 1 : Math.min(slideIndex + 1, totalSlides)
  const isLastSlide = videoCourse ? contentComplete : slideIndex >= totalSlides - 1
  const progressPct = videoCourse
    ? contentComplete
      ? 100
      : 0
    : Math.round(((slideIndex + 1) / totalSlides) * 100)

  const passCert =
    freshCert && freshCert.courseId === course.id
      ? freshCert
      : certs.filter((x) => x.courseId === course.id).at(-1)

  if (showTest) {
    const passed = customTestReady ? customPassed : fallbackPassed
    const retryTest = () => {
      setSubmitted(false)
      setSubmittingTest(false)
      setTestSubmitResult(null)
      setFallbackAnswer(null)
      setMcAnswers({})
      setTestErr('')
      setFreshCert(null)
    }
    return (
      <KnowledgeCheckView
        course={course}
        publishedTest={publishedTest}
        categoryList={categoryList}
        mcAnswers={mcAnswers}
        setMcAnswers={setMcAnswers}
        fallbackAnswer={fallbackAnswer}
        setFallbackAnswer={setFallbackAnswer}
        submitted={submitted}
        submitting={submittingTest}
        passed={passed}
        testErr={testErr}
        testSubmitResult={testSubmitResult}
        passCert={passCert}
        onSubmitCustom={() => void submitCustomTest()}
        onSubmitFallback={() => void submitFallbackTest()}
        onRetry={retryTest}
        onBackToCourse={() => {
          setShowTest(false)
          retryTest()
        }}
      />
    )
  }

  return (
    <div className="min-h-[72vh] bg-slate-50 py-8 sm:py-12">
      <Container>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">{t('LearnPage_305_now_learning_08b44848c4')}</p>
            <h1 className="mt-1 break-words font-display text-lg font-semibold text-brand-900 sm:text-xl md:text-2xl">
              {displayCourseTitle(course)}
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
              <CourseSlideViewer
                slide={currentSlide}
                slideNum={slideNum}
                totalSlides={totalSlides}
                pptxSlideIndex={pptxDeck ? slideIndex : 0}
                onVideoEnded={videoCourse ? markVideoComplete : undefined}
              />
            </motion.div>
          </div>
          <div className="flex flex-col gap-4 border-t border-slate-200/90 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-8">
            {videoCourse ? (
              <>
                <span className="text-center text-sm text-slate-600 sm:text-left">
                  {contentComplete
                    ? t('ui_learn_video_complete', {
                        defaultValue: 'Video completed. You can take the knowledge check.',
                      })
                    : t('ui_learn_video_watch_full', {
                        defaultValue: 'Watch the full video to unlock the knowledge check.',
                      })}
                </span>
                {contentComplete ? (
                  <Button className="!rounded-xl sm:shrink-0" onClick={openTest}>
                    {t('ui_learn_take_knowledge_check')}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
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
                  <span className="text-center text-sm text-slate-600 sm:text-left">
                    {t('LearnPage_389_complete_all_slides_to_unlock_the_test_0825f886f3')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
