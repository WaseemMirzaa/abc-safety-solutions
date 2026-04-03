import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CertificateVisual } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { fetchAllCoursesAdmin } from '@/api/localData'
import { getCategoryById } from '@/data/catalog'
import { qk } from '@/api/queryKeys'
import { getCourseSlideCount } from '@/lib/courseSlides'
import { localCache } from '@/lib/localCache'
import { useAuth } from '@/contexts/AuthContext'
import { easeOut, transition } from '@/lib/motionPresets'
import type { AdminTest } from '@/types'

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
  const { data: allCourses = [] } = useQuery({
    queryKey: qk.adminCourses,
    queryFn: fetchAllCoursesAdmin,
    enabled: Boolean(user && courseId),
  })
  const course = useMemo(() => allCourses.find((c) => c.id === courseId), [allCourses, courseId])
  const purchased = localCache.getPurchases().some((p) => p.courseId === courseId)

  const [slideIndex, setSlideIndex] = useState(0)
  const [showTest, setShowTest] = useState(false)
  /** Fallback demo (no admin test): legacy two-option question */
  const [demoAnswer, setDemoAnswer] = useState<'a' | 'b' | null>(null)
  /** Admin-built test: questionId → selected optionId */
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const totalSlides = course ? getCourseSlideCount(course) : 1
  const slideUrls = course?.slideImageUrls?.filter(Boolean) ?? []

  /** Only hydrate from storage when the course changes — not on every progress write (that caused next/prev to snap back). */
  useEffect(() => {
    if (!courseId || !course) return
    const p = localCache.getProgress(courseId)
    const max = Math.max(0, getCourseSlideCount(course) - 1)
    setSlideIndex(Math.min(p?.slideIndex ?? 0, max))
  }, [course, courseId])

  useEffect(() => {
    if (!courseId || !course) return
    localCache.setProgress({
      courseId,
      slideIndex,
      audioTimeSec: 0,
      updatedAt: new Date().toISOString(),
      completedSlides: slideIndex >= totalSlides - 1,
    })
  }, [course, courseId, slideIndex, totalSlides])

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <p className="text-slate-600">Sign in to access the course player.</p>
          <Link to="/login" className="mt-6 inline-block font-semibold text-amber-700 hover:text-amber-600">
            Sign in →
          </Link>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-20">
        <Container>
          <h1 className="font-display text-xl font-bold text-brand-900">Course not found</h1>
          <Link to="/courses" className="mt-4 inline-block font-semibold text-amber-700">
            Catalog →
          </Link>
        </Container>
      </div>
    )
  }

  if (!purchased) {
    return (
      <div className="py-20">
        <Container className="max-w-lg">
          <h1 className="font-display text-xl font-bold text-brand-900">Not enrolled</h1>
          <p className="mt-2 text-slate-600">Purchase this course from the catalog first (demo enroll).</p>
          <Link to={`/courses/${course.slug}`}>
            <Button className="mt-6">View course</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const hasCert = localCache.getCertificates().some((c) => c.courseId === course.id)
  const publishedTest = useMemo(() => localCache.getPublishedTestForCourse(course.id), [course.id, showTest])

  const openTest = () => {
    setMcAnswers({})
    setDemoAnswer(null)
    setSubmitted(false)
    setShowTest(true)
  }

  const issueCertIfNeeded = () => {
    if (hasCert) return
    const cat = getCategoryById(course.categoryId)
    const certificationText = cat?.certificationText?.trim() || undefined
    localCache.addCertificate({
      id: `CERT-${Date.now()}`,
      courseId: course.id,
      courseName: course.title,
      userName: user.name,
      issuedAt: new Date().toISOString(),
      ...(certificationText ? { certificationText } : {}),
    })
  }

  const submitCustomTest = () => {
    if (!publishedTest?.questions.length) return
    setSubmitted(true)
    if (scoreMeetsPassThreshold(publishedTest, mcAnswers)) issueCertIfNeeded()
  }

  const submitDemoTest = () => {
    setSubmitted(true)
    if (demoAnswer === 'a') issueCertIfNeeded()
  }

  const customTestReady = Boolean(publishedTest && publishedTest.questions.length > 0)
  const allMcAnswered =
    customTestReady &&
    publishedTest!.questions.every((q) => Boolean(mcAnswers[q.id]))
  const customPassed = customTestReady && submitted && scoreMeetsPassThreshold(publishedTest!, mcAnswers)
  const demoPassed = submitted && demoAnswer === 'a'

  const slideNum = Math.min(slideIndex + 1, totalSlides)
  const isLastSlide = slideIndex >= totalSlides - 1
  const progressPct = Math.round(((slideIndex + 1) / totalSlides) * 100)
  const currentSlideSrc = slideUrls[slideIndex]

  if (showTest) {
    const passed = customTestReady ? customPassed : demoPassed
    const passCert = passed
      ? localCache
          .getCertificates()
          .filter((x) => x.courseId === course.id)
          .at(-1)
      : undefined
    return (
      <motion.div
        className="min-h-[70vh] bg-gradient-to-b from-slate-100 to-slate-50 py-12 sm:py-16"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.page}
      >
        <Container className="w-full min-w-0 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">Knowledge check</h1>
          <p className="mt-2 break-words text-sm text-slate-600">{course.title}</p>
          {publishedTest?.title ? (
            <p className="mt-1 text-xs font-medium text-sky-800">{publishedTest.title}</p>
          ) : null}
          <div className="card-elevated mt-8 min-w-0 overflow-x-hidden p-4 sm:p-8">
            {customTestReady && publishedTest ? (
              <>
                <p className="text-xs text-slate-500">
                  Answer each question. You need <strong className="text-brand-800">{publishedTest.passPercent}%</strong> correct to pass.
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
                  <Button className="mt-10" disabled={!allMcAnswered} onClick={submitCustomTest}>
                    Submit answers
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs text-amber-800/90">
                  No published test is set for this course in Admin → Tests. Showing a sample question.
                </p>
                <p className="mt-6 font-medium leading-relaxed text-slate-800">
                  Demo question: What is the primary goal of workplace safety training?
                </p>
                <div className="mt-6 space-y-3">
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300/80 hover:bg-sky-50/30">
                    <input
                      type="radio"
                      name="demo-q"
                      checked={demoAnswer === 'a'}
                      onChange={() => setDemoAnswer('a')}
                      className="mt-0.5 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm">Protect workers and prevent incidents</span>
                  </label>
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300/80 hover:bg-sky-50/30">
                    <input
                      type="radio"
                      name="demo-q"
                      checked={demoAnswer === 'b'}
                      onChange={() => setDemoAnswer('b')}
                      className="mt-0.5 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm">Reduce paperwork only</span>
                  </label>
                </div>
                {!submitted ? (
                  <Button className="mt-8" disabled={!demoAnswer} onClick={submitDemoTest}>
                    Submit answers
                  </Button>
                ) : null}
              </>
            )}

            {submitted && passed ? (
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-center text-sm text-emerald-950 sm:px-5">
                  <strong>Congratulations — you passed.</strong> Your completion record is saved on this device. PDF email
                  will connect when the API is live.
                </div>
                {passCert ? (
                  <CertificateVisual
                    cert={passCert}
                    variant="compact"
                    className="mx-auto w-full min-w-0 max-w-full shadow-md sm:max-w-xl"
                  />
                ) : null}
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/certificates">
                    <Button>View all certificates</Button>
                  </Link>
                  <Link to="/my-courses">
                    <Button variant="secondary">My learning</Button>
                  </Link>
                </div>
              </div>
            ) : null}
            {submitted && !passed ? (
              <div className="mt-8 rounded-2xl border border-red-200/80 bg-red-50/90 p-5 text-sm text-red-900">
                Not quite — review the material and try again.
                <Button
                  className="mt-5"
                  variant="secondary"
                  onClick={() => {
                    setSubmitted(false)
                    setDemoAnswer(null)
                    setMcAnswers({})
                  }}
                >
                  Retry
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
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Now learning</p>
            <h1 className="mt-1 break-words font-display text-lg font-semibold text-brand-900 sm:text-xl md:text-2xl">
              {course.title}
            </h1>
          </div>
          <Link
            to="/my-courses"
            className="shrink-0 text-sm font-medium text-sky-800 transition hover:text-sky-900 sm:pt-1"
          >
            ← My courses
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
              className="relative flex h-full w-full max-h-full flex-col items-center justify-center"
            >
              <p className="absolute left-3 top-3 z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:left-4 sm:top-4 sm:text-xs">
                Slide {slideNum} of {totalSlides}
              </p>
              {currentSlideSrc ? (
                <img
                  src={currentSlideSrc}
                  alt=""
                  className="max-h-full max-w-full rounded-xl object-contain shadow-md ring-1 ring-slate-200/80"
                />
              ) : (
                <>
                  <p className="mt-10 max-w-xl px-4 font-display text-xl font-medium leading-snug text-brand-900 sm:text-2xl">
                    Voice-over plays here in production. Placeholder for slide {slideNum}.
                  </p>
                  <p className="mt-5 text-xs text-slate-600">
                    Upload slide images in Admin → Courses to show frames here.
                  </p>
                </>
              )}
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
                Previous
              </Button>
              <Button
                variant="secondary"
                className="!rounded-xl"
                disabled={isLastSlide}
                onClick={() => setSlideIndex((i) => Math.min(totalSlides - 1, i + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {isLastSlide ? (
              <Button className="!rounded-xl sm:shrink-0" onClick={openTest}>
                Take knowledge check
              </Button>
            ) : (
              <span className="text-center text-sm text-slate-600 sm:text-left">Complete all slides to unlock the test.</span>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
