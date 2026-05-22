import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Container } from '@/components/Container'
import { PageLoader } from '@/components/ui/PageLoader'
import { Button } from '@/components/Button'
import { KnowledgeCheckView } from '@/components/learn/KnowledgeCheckView'
import { LearnSlideFooter } from '@/components/learn/LearnSlideFooter'
import { LearnSlideDeckControls } from '@/components/learn/LearnSlideDeckControls'
import { LearnSlideChrome } from '@/components/learn/LearnSlideChrome'
import {
  fetchCategories,
  fetchCourseById,
  fetchMyCertificates,
  fetchMyEnrollments,
  fetchMyProgress,
  fetchPublishedTestForCourse,
  issueCertificate,
  patchMyProgress,
  submitTestAnswers,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { CourseSlideViewer } from '@/components/CourseSlideViewer'
import {
  getCourseSlideCount,
  getCourseSlides,
  getDeckLearnerSlideCount,
  getDeckRenderedSlideUrls,
  getPresentationDeckSlide,
  getVideoSlide,
  isVideoCourse,
} from '@/lib/courseSlides'
import { useAuth } from '@/contexts/AuthContext'
import { easeOut } from '@/lib/motionPresets'
import type { Certificate } from '@/types'
import { t } from '@/i18n/t'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { findEnrollment, hasCourseAccess } from '@/lib/courseAccess'
import { useTestTimer } from '@/hooks/useTestTimer'
import { courseProgressPercent } from '@/lib/courseProgress'

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
    onSuccess: (_, vars) => {
      qc.setQueryData<typeof progressRow>(qk.progress(courseId), (old) =>
        old
          ? {
              ...old,
              slideIndex: vars.slideIndex,
              maxSlideIndex: Math.max(old.maxSlideIndex ?? 0, vars.slideIndex),
              completedSlides: vars.completedSlides,
              audioTimeSec: vars.audioTimeSec,
              updatedAt: new Date().toISOString(),
            }
          : old,
      )
    },
  })

  const [slideIndex, setSlideIndex] = useState(0)
  const [progressHydrated, setProgressHydrated] = useState(false)
  const hydratedForCourse = useRef<string | null>(null)
  const [showTest, setShowTest] = useState(false)
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submittingTest, setSubmittingTest] = useState(false)
  const [testSubmitResult, setTestSubmitResult] = useState<{
    passed: boolean
    scorePercent: number
    passPercent: number
    timedOut?: boolean
  } | null>(null)
  const autoSubmitOnTimeout = useRef(false)
  const [testErr, setTestErr] = useState('')
  const [freshCert, setFreshCert] = useState<Certificate | null>(null)
  const [videoDoneLocal, setVideoDoneLocal] = useState(false)
  const [videoWatchPct, setVideoWatchPct] = useState(0)
  const [videoDurationSec, setVideoDurationSec] = useState(0)
  const staleVideoCompleteFixed = useRef(false)
  const [pptxReady, setPptxReady] = useState(false)
  const [pptxSlideCount, setPptxSlideCount] = useState<number | null>(null)
  const [deckAspect, setDeckAspect] = useState(16 / 9)
  const [contentReviewRequired, setContentReviewRequired] = useState(false)
  const [slideFullscreen, setSlideFullscreen] = useState(false)

  const videoCourse = course ? isVideoCourse(course) : false
  const courseSlides = course ? getCourseSlides(course) : []
  const pptxDeck = course && !videoCourse ? getPresentationDeckSlide(course) : undefined
  const deckRenderedUrls = course ? getDeckRenderedSlideUrls(course) : []
  const catalogSlideCount = course ? getDeckLearnerSlideCount(course) : 1
  const totalSlides = useMemo(() => {
    if (videoCourse) return 1
    if (deckRenderedUrls.length > 0) return deckRenderedUrls.length
    if (pptxSlideCount && pptxSlideCount > 0) return pptxSlideCount
    return Math.max(1, catalogSlideCount)
  }, [videoCourse, deckRenderedUrls.length, pptxSlideCount, catalogSlideCount])
  const videoSlide = course && videoCourse ? getVideoSlide(course) : undefined
  const currentSlide = videoSlide ?? pptxDeck ?? courseSlides[slideIndex]
  const savedVideoSec = progressRow?.audioTimeSec ?? 0
  const videoProgressValid =
    videoDurationSec > 0 && savedVideoSec >= videoDurationSec - 2
  const contentComplete = videoCourse
    ? videoDoneLocal || (Boolean(progressRow?.completedSlides) && videoProgressValid)
    : Boolean(progressRow?.completedSlides)

  useEffect(() => {
    if (contentComplete) setContentReviewRequired(false)
  }, [contentComplete])

  useEffect(() => {
    if (deckRenderedUrls.length > 0) {
      setPptxSlideCount(deckRenderedUrls.length)
    }
  }, [deckRenderedUrls.length])

  useEffect(() => {
    if (totalSlides < 1) return
    setSlideIndex((i) => Math.min(i, totalSlides - 1))
  }, [totalSlides])

  useEffect(() => {
    setVideoDoneLocal(false)
    setVideoWatchPct(0)
    setVideoDurationSec(0)
    staleVideoCompleteFixed.current = false
    setPptxReady(false)
    setPptxSlideCount(null)
    setDeckAspect(16 / 9)
    setContentReviewRequired(false)
    setProgressHydrated(false)
    hydratedForCourse.current = null
    setSlideIndex(0)
  }, [courseId])

  useEffect(() => {
    if (!videoCourse) setVideoWatchPct(0)
  }, [videoCourse, courseId])

  useEffect(() => {
    if (!courseId || !course || !progressReady || !progressRow) return
    if (hydratedForCourse.current === courseId) return
    const max = Math.max(0, getCourseSlideCount(course) - 1)
    const idx = Math.min(Math.max(0, progressRow.slideIndex ?? 0), max)
    setSlideIndex(idx)
    hydratedForCourse.current = courseId
    setProgressHydrated(true)
  }, [course, courseId, progressReady, progressRow])

  useEffect(() => {
    if (!videoCourse || !progressRow || !progressHydrated) return
    if (progressRow.completedSlides) {
      setVideoDoneLocal(true)
      setVideoWatchPct(100)
    }
  }, [videoCourse, progressRow, progressHydrated])

  useEffect(() => {
    if (!courseId || !course || videoCourse || !progressHydrated) return
    const tmr = window.setTimeout(() => {
      const atLast = slideIndex >= totalSlides - 1
      saveProgress.mutate({
        slideIndex,
        audioTimeSec: 0,
        completedSlides: Boolean(progressRow?.completedSlides) || atLast,
      })
    }, 400)
    return () => window.clearTimeout(tmr)
  }, [
    course,
    courseId,
    slideIndex,
    totalSlides,
    saveProgress,
    videoCourse,
    progressHydrated,
    progressRow?.completedSlides,
  ])

  const markVideoComplete = useCallback(
    (watchedSec: number, durationSec: number) => {
      if (!courseId || !videoCourse || !Number.isFinite(durationSec) || durationSec <= 0) return
      if (watchedSec < durationSec - 2) return
      setVideoDoneLocal(true)
      setVideoWatchPct(100)
      setVideoDurationSec(durationSec)
      if (progressRow?.completedSlides && videoProgressValid) return
      saveProgress.mutate(
        {
          slideIndex: 0,
          audioTimeSec: Math.floor(Math.min(watchedSec, durationSec)),
          completedSlides: true,
        },
        {
          onSuccess: () => {
            void qc.invalidateQueries({ queryKey: qk.progress(courseId) })
          },
        },
      )
    },
    [courseId, saveProgress, videoCourse, qc, progressRow?.completedSlides, videoProgressValid],
  )

  const saveVideoProgress = useCallback(
    (maxTimeSec: number, durationSec: number) => {
      if (!courseId || !videoCourse || progressRow?.completedSlides) return
      if (!Number.isFinite(durationSec) || durationSec <= 0) return
      saveProgress.mutate({
        slideIndex: 0,
        audioTimeSec: Math.floor(Math.min(maxTimeSec, durationSec)),
        completedSlides: false,
      })
    },
    [courseId, saveProgress, videoCourse, progressRow?.completedSlides],
  )

  const handleVideoProgress = useCallback(
    (maxSec: number, durSec: number) => {
      if (durSec > 0) {
        setVideoDurationSec(durSec)
        setVideoWatchPct(Math.min(100, Math.round((maxSec / durSec) * 100)))
        const saved = progressRow?.audioTimeSec ?? 0
        if (saved >= durSec - 2 && progressRow?.completedSlides) {
          setVideoDoneLocal(true)
          setVideoWatchPct(100)
        } else if (
          progressRow?.completedSlides &&
          !staleVideoCompleteFixed.current &&
          courseId
        ) {
          staleVideoCompleteFixed.current = true
          saveProgress.mutate({
            slideIndex: 0,
            audioTimeSec: Math.floor(Math.min(saved, durSec)),
            completedSlides: false,
          })
          setVideoDoneLocal(false)
        }
      }
      saveVideoProgress(maxSec, durSec)
    },
    [courseId, progressRow, saveVideoProgress],
  )

  const returnToSlidesAfterFail = useCallback(() => {
    setShowTest(false)
    setContentReviewRequired(true)
    setSlideIndex(0)
    setVideoDoneLocal(false)
    setSubmitted(false)
    setSubmittingTest(false)
    setTestSubmitResult(null)
    setMcAnswers({})
    setTestErr('')
    setFreshCert(null)
    autoSubmitOnTimeout.current = false
    qc.setQueryData<typeof progressRow>(qk.progress(courseId), (old) =>
      old
        ? {
            ...old,
            slideIndex: 0,
            maxSlideIndex: 0,
            audioTimeSec: 0,
            completedSlides: false,
            testPassed: false,
          }
        : old,
    )
    void qc.invalidateQueries({ queryKey: qk.progress(courseId) })
  }, [courseId, qc])

  const submitCustomTest = useCallback(
    async (opts?: { timedOut?: boolean }) => {
      if (!publishedTest?.questions.length || !course) return
      const timedOut = Boolean(opts?.timedOut)
      if (!timedOut) {
        const allAnswered = publishedTest.questions.every((q) => Boolean(mcAnswers[q.id]))
        if (!allAnswered) {
          setTestErr(t('ui_learn_test_answer_all', { defaultValue: 'Please answer every question.' }))
          return
        }
      }
      setSubmittingTest(true)
      setTestErr('')
      setTestSubmitResult(null)
      try {
        const res = await submitTestAnswers(course.id, mcAnswers, { timedOut })
        setTestSubmitResult(res)
        setSubmitted(true)
        if (res.passed) {
          const cert = await issueCertificate(course.id)
          setFreshCert(cert)
          await qc.invalidateQueries({ queryKey: qk.certificates })
        } else {
          setContentReviewRequired(true)
          setSlideIndex(0)
          setVideoDoneLocal(false)
          qc.setQueryData<typeof progressRow>(qk.progress(courseId), (old) =>
            old
              ? {
                  ...old,
                  slideIndex: 0,
                  maxSlideIndex: 0,
                  audioTimeSec: 0,
                  completedSlides: false,
                  testPassed: false,
                }
              : old,
          )
          await qc.invalidateQueries({ queryKey: qk.progress(courseId) })
        }
      } catch (e) {
        setSubmitted(false)
        setTestSubmitResult(null)
        if (timedOut) autoSubmitOnTimeout.current = false
        setTestErr(e instanceof Error ? e.message : 'Submit failed')
      } finally {
        setSubmittingTest(false)
      }
    },
    [course, mcAnswers, publishedTest, qc, courseId],
  )

  const customTestReady = Boolean(publishedTest && publishedTest.questions.length > 0)
  const testTimer = useTestTimer(
    publishedTest?.timeLimitMinutes,
    showTest && customTestReady && !submitted && !submittingTest,
  )

  useEffect(() => {
    if (!testTimer.expired || !showTest || !customTestReady || submitted || submittingTest) return
    if (autoSubmitOnTimeout.current) return
    autoSubmitOnTimeout.current = true
    void submitCustomTest({ timedOut: true })
  }, [
    testTimer.expired,
    showTest,
    customTestReady,
    submitted,
    submittingTest,
    submitCustomTest,
  ])

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
      <div className="py-12 sm:py-16">
        <Container>
          <PageLoader message={t('ui_page_loader_course')} minHeight="min-h-[50vh]" />
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

  const slidesLoaded = !pptxDeck || pptxReady

  const openTest = () => {
    if (!contentComplete || contentReviewRequired || !customTestReady || !slidesLoaded) return
    setMcAnswers({})
    setSubmitted(false)
    setSubmittingTest(false)
    setTestSubmitResult(null)
    setTestErr('')
    setFreshCert(null)
    autoSubmitOnTimeout.current = false
    setShowTest(true)
  }

  const customPassed = customTestReady && submitted && testSubmitResult?.passed === true

  const slideNum = videoCourse ? 1 : Math.min(slideIndex + 1, Math.max(1, totalSlides))
  const isLastSlide = videoCourse ? contentComplete || videoDoneLocal : slideIndex >= totalSlides - 1
  const pptxNavLocked = Boolean(pptxDeck && !pptxReady)
  const canTakeKnowledgeCheck =
    customTestReady && contentComplete && slidesLoaded && (videoCourse || isLastSlide)

  const optimisticMaxSlide = Math.max(
    slideIndex,
    progressRow?.maxSlideIndex ?? progressRow?.slideIndex ?? 0,
  )

  const courseProgressPct = courseProgressPercent({
    totalSlides,
    slideIndex,
    maxSlideIndex: optimisticMaxSlide,
    completedSlides: Boolean(progressRow?.completedSlides),
    videoCourse,
    videoWatchPct,
  })

  const navigateSlide = (next: number) => {
    const clamped = Math.max(0, Math.min(totalSlides - 1, next))
    setSlideIndex(clamped)
    if (!courseId || videoCourse) return
    qc.setQueryData<typeof progressRow>(qk.progress(courseId), (old) =>
      old
        ? {
            ...old,
            slideIndex: clamped,
            maxSlideIndex: Math.max(old.maxSlideIndex ?? 0, clamped),
          }
        : old,
    )
    saveProgress.mutate({
      slideIndex: clamped,
      audioTimeSec: 0,
      completedSlides: Boolean(progressRow?.completedSlides) || clamped >= totalSlides - 1,
    })
  }

  const passCert =
    freshCert && freshCert.courseId === course.id
      ? freshCert
      : certs.filter((x) => x.courseId === course.id).at(-1)

  if (showTest) {
    const passed = customPassed
    const testLocked = testTimer.expired || submittingTest
    return (
      <KnowledgeCheckView
        course={course}
        publishedTest={publishedTest}
        categoryList={categoryList}
        mcAnswers={mcAnswers}
        setMcAnswers={setMcAnswers}
        submitted={submitted}
        submitting={submittingTest}
        passed={passed}
        testErr={testErr}
        testSubmitResult={testSubmitResult}
        testLocked={testLocked}
        timer={testTimer}
        passCert={passCert}
        onSubmitCustom={() => void submitCustomTest()}
        onReturnToSlides={returnToSlidesAfterFail}
      />
    )
  }

  return (
    <div className="bg-slate-50 py-4 sm:py-6">
      <Container className="flex h-[calc(100svh-10rem)] max-h-[calc(100svh-10rem)] min-h-[20rem] flex-col gap-4 sm:h-[calc(100svh-9rem)] sm:max-h-[calc(100svh-9rem)]">
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">{t('LearnPage_305_now_learning_08b44848c4')}</p>
            <h1 className="mt-1 break-words font-display text-lg font-semibold text-brand-900 sm:text-xl md:text-2xl">
              {displayCourseTitle(course)}
            </h1>
            {progressHydrated ? (
              <p className="mt-1.5 text-sm font-medium text-sky-800">
                {t('ui_learn_course_progress_pct', {
                  pct: courseProgressPct,
                  defaultValue: '{{pct}}% complete',
                })}
              </p>
            ) : null}
          </div>
          <Link
            to="/my-courses"
            className="shrink-0 text-sm font-medium text-sky-800 transition hover:text-sky-900 sm:pt-1"
          >
            {t('ui_learn_back_my_courses')}
          </Link>
        </div>

        <div className="h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-200/90">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
            initial={false}
            animate={{ width: `${courseProgressPct}%` }}
            transition={{ duration: reduce ? 0 : 0.35, ease: easeOut }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/60">
          <div
            className={`learn-slide-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100/90 to-slate-200/40 ${
              pptxDeck || videoCourse
                ? 'learn-slide-stage--deck p-1 sm:p-2'
                : 'p-2 sm:p-4'
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40 grid-pattern"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.12), transparent 55%)',
              }}
            />
            <motion.div
              key={pptxDeck ? `pptx-deck-${slideIndex}` : slideIndex}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: easeOut }}
              className={`relative learn-slide-frame overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200/80 ${
                pptxDeck
                  ? 'learn-slide-frame--deck bg-white'
                  : videoCourse
                    ? 'learn-slide-frame--video'
                    : 'bg-white'
              }`}
              style={
                pptxDeck
                  ? ({ '--slide-ar': deckAspect } as React.CSSProperties)
                  : undefined
              }
            >
              <CourseSlideViewer
                slide={currentSlide}
                slideNum={slideNum}
                totalSlides={totalSlides}
                pptxSlideIndex={pptxDeck ? slideIndex : 0}
                learnDeck={Boolean(pptxDeck)}
                learnMode
                pptxLoading={pptxNavLocked}
                onVideoEnded={videoCourse ? markVideoComplete : undefined}
                videoResumeTimeSec={videoCourse ? (progressRow?.audioTimeSec ?? 0) : 0}
                onVideoProgress={videoCourse ? handleVideoProgress : undefined}
                onPptxReadyChange={pptxDeck ? setPptxReady : undefined}
                onPptxSlideCount={pptxDeck ? setPptxSlideCount : undefined}
                onPptxSlideAspect={pptxDeck ? setDeckAspect : undefined}
                className="h-full w-full min-h-0"
              />
              {pptxDeck ? (
                <LearnSlideDeckControls
                  canPrev={slideIndex > 0}
                  canNext={slideIndex < totalSlides - 1}
                  disabled={pptxNavLocked}
                  onPrev={() => navigateSlide(slideIndex - 1)}
                  onNext={() => navigateSlide(slideIndex + 1)}
                  onFullscreen={() => setSlideFullscreen(true)}
                />
              ) : null}
            </motion.div>
          </div>
          <div
            className={
              videoCourse
                ? 'flex shrink-0 flex-col gap-4 border-t border-slate-200/90 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-8'
                : 'shrink-0'
            }
          >
            {videoCourse ? (
              <>
                {!contentComplete ? (
                  <div className="w-full space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                      <span>
                        {t('ui_learn_video_watch_full', {
                          defaultValue: 'Watch the full video to unlock the knowledge check.',
                        })}
                      </span>
                      <span className="tabular-nums text-sky-800">{videoWatchPct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-300"
                        style={{ width: `${videoWatchPct}%` }}
                      />
                    </div>
                    <p className="text-center text-[11px] text-slate-500 sm:text-left">
                      {t('ui_learn_video_no_skip', {
                        defaultValue: 'Skipping ahead is disabled until you have watched the full video.',
                      })}
                    </p>
                  </div>
                ) : (
                  <span className="text-center text-sm text-slate-600 sm:text-left">
                    {t('ui_learn_video_complete', {
                      defaultValue: 'Video completed. You can take the knowledge check.',
                    })}
                  </span>
                )}
                {canTakeKnowledgeCheck ? (
                  <Button className="!rounded-xl sm:shrink-0" onClick={openTest}>
                    {t('ui_learn_take_knowledge_check')}
                  </Button>
                ) : contentComplete ? (
                  <span className="text-center text-sm text-amber-800 sm:text-left">
                    {t('ui_learn_no_test_configured', {
                      defaultValue: 'Knowledge check is not set up for this course yet.',
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <LearnSlideFooter
                slideIndex={slideIndex}
                totalSlides={totalSlides}
                courseProgressPct={courseProgressPct}
                pptxNavLocked={pptxNavLocked}
                isLastSlide={isLastSlide}
                customTestReady={customTestReady}
                canTakeKnowledgeCheck={canTakeKnowledgeCheck}
                contentComplete={contentComplete}
                showRetakeHint={contentReviewRequired}
                onPrev={() => navigateSlide(slideIndex - 1)}
                onNext={() => navigateSlide(slideIndex + 1)}
                onOpenTest={openTest}
              />
            )}
          </div>
        </div>
      </Container>

      {slideFullscreen && pptxDeck ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 p-3 sm:p-5"
          role="dialog"
          aria-modal
          aria-label={t('ui_learn_fullscreen', { defaultValue: 'Fullscreen slide preview' })}
        >
          <div className="flex shrink-0 items-center justify-between gap-3">
            <LearnSlideChrome slideNum={slideNum} totalSlides={totalSlides} loading={pptxNavLocked} />
            <Button
              type="button"
              variant="secondary"
              className="!rounded-xl shrink-0"
              onClick={() => setSlideFullscreen(false)}
            >
              {t('ui_learn_exit_fullscreen', { defaultValue: 'Exit fullscreen' })}
            </Button>
          </div>
          <div className="learn-slide-stage learn-slide-stage--deck relative mt-3 flex min-h-0 flex-1 items-center justify-center">
            <div
              className="relative learn-slide-frame learn-slide-frame--deck h-full w-full max-h-full max-w-full overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10"
              style={{ '--slide-ar': deckAspect } as React.CSSProperties}
            >
              <CourseSlideViewer
                slide={currentSlide}
                slideNum={slideNum}
                totalSlides={totalSlides}
                pptxSlideIndex={slideIndex}
                learnDeck
                learnMode
                pptxLoading={pptxNavLocked}
                onPptxReadyChange={setPptxReady}
                onPptxSlideCount={setPptxSlideCount}
                onPptxSlideAspect={setDeckAspect}
                className="h-full w-full min-h-0"
              />
              <LearnSlideDeckControls
                canPrev={slideIndex > 0}
                canNext={slideIndex < totalSlides - 1}
                disabled={pptxNavLocked}
                onPrev={() => navigateSlide(slideIndex - 1)}
                onNext={() => navigateSlide(slideIndex + 1)}
                onFullscreen={() => setSlideFullscreen(false)}
              />
            </div>
          </div>
          <p className="mt-3 shrink-0 text-center text-sm font-medium text-sky-100">
            {t('ui_learn_slide_counter', {
              current: slideNum,
              total: totalSlides,
              defaultValue: 'Slide {{current}} of {{total}}',
            })}
            <span className="text-sky-300/80"> · </span>
            {t('ui_learn_course_progress_pct', {
              pct: courseProgressPct,
              defaultValue: '{{pct}}% complete',
            })}
          </p>
        </div>
      ) : null}
    </div>
  )
}
