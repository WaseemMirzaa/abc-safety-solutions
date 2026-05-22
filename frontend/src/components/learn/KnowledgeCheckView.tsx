import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import { CertificateVisual } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { scoreKnowledgeCheck, correctOptionId } from '@/lib/knowledgeCheckScoring'
import { displayCourseTitle } from '@/lib/courseDisplay'
import { easeOut, transition } from '@/lib/motionPresets'
import type { AdminTest, Category, Certificate, Course, TestAnswerOption, TestQuestion } from '@/types'
import { t } from '@/i18n/t'

type McProps = {
  test: AdminTest
  answers: Record<string, string>
  onAnswer: (questionId: string, optionId: string) => void
  submitted: boolean
  showReview: boolean
}

function optionReviewClass(
  o: TestAnswerOption,
  q: TestQuestion,
  selectedId: string | undefined,
  showReview: boolean,
): string {
  if (!showReview) {
    return selectedId === o.id
      ? 'border-sky-400 bg-sky-50/80 ring-2 ring-sky-400/40'
      : 'border-slate-200 bg-white hover:border-sky-300/80 hover:bg-sky-50/30'
  }
  const correctId = correctOptionId(q)
  if (o.id === correctId) {
    return 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/35'
  }
  if (o.id === selectedId && o.id !== correctId) {
    return 'border-rose-400 bg-rose-50 ring-2 ring-rose-400/35'
  }
  return 'border-slate-100 bg-slate-50/60 opacity-70'
}

function OptionIcon({
  o,
  q,
  selectedId,
  showReview,
}: {
  o: TestAnswerOption
  q: TestQuestion
  selectedId: string | undefined
  showReview: boolean
}) {
  if (!showReview) {
    return selectedId === o.id ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
        <Circle className="h-2 w-2 fill-current" />
      </span>
    ) : (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
    )
  }
  const correctId = correctOptionId(q)
  if (o.id === correctId) {
    return <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
  }
  if (o.id === selectedId && o.id !== correctId) {
    return <XCircle className="h-6 w-6 shrink-0 text-rose-600" aria-hidden />
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-200 bg-white" aria-hidden />
}

function McQuestionBlock({ test, answers, onAnswer, submitted, showReview }: McProps) {
  const score = submitted ? scoreKnowledgeCheck(test, answers) : null

  return (
    <div className="space-y-8">
      {test.questions.map((q, qi) => {
        const selectedId = answers[q.id]
        const row = score?.breakdown.find((b) => b.questionId === q.id)
        const questionCorrect = row?.isCorrect

        return (
          <motion.div
            key={q.id}
            initial={false}
            animate={{ opacity: 1 }}
            className={`rounded-2xl border p-4 sm:p-5 ${
              showReview
                ? questionCorrect
                  ? 'border-emerald-200/90 bg-emerald-50/30'
                  : 'border-rose-200/90 bg-rose-50/25'
                : 'border-transparent bg-transparent'
            }`}
          >
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-2 text-xs font-bold ${
                  showReview
                    ? questionCorrect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {qi + 1}
              </span>
              <p className="min-w-0 flex-1 break-words font-medium leading-relaxed text-slate-800">{q.prompt}</p>
              {showReview ? (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    questionCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {questionCorrect
                    ? t('ui_learn_q_correct', { defaultValue: 'Correct' })
                    : t('ui_learn_q_incorrect', { defaultValue: 'Incorrect' })}
                </span>
              ) : null}
            </div>
            <div className="mt-4 space-y-2.5">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className={`flex min-w-0 items-start gap-3 rounded-xl border p-3.5 transition sm:p-4 ${optionReviewClass(
                    o,
                    q,
                    selectedId,
                    showReview,
                  )} ${showReview ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={selectedId === o.id}
                    disabled={submitted}
                    onChange={() => onAnswer(q.id, o.id)}
                    className="sr-only"
                  />
                  <OptionIcon o={o} q={q} selectedId={selectedId} showReview={showReview} />
                  <span className="min-w-0 flex-1 break-words text-sm leading-snug text-slate-800">{o.label}</span>
                  {showReview && o.id === correctOptionId(q) ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {t('ui_learn_correct_answer', { defaultValue: 'Answer' })}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

type Props = {
  course: Course
  publishedTest: AdminTest | null | undefined
  categoryList: Category[]
  mcAnswers: Record<string, string>
  setMcAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fallbackAnswer: 'a' | 'b' | null
  setFallbackAnswer: (v: 'a' | 'b' | null) => void
  submitted: boolean
  submitting: boolean
  passed: boolean
  testErr: string
  testSubmitResult: { passed: boolean; scorePercent: number; passPercent: number } | null
  passCert: Certificate | null | undefined
  onSubmitCustom: () => void
  onSubmitFallback: () => void
  onRetry: () => void
  onBackToCourse: () => void
}

export function KnowledgeCheckView({
  course,
  publishedTest,
  categoryList,
  mcAnswers,
  setMcAnswers,
  fallbackAnswer,
  setFallbackAnswer,
  submitted,
  submitting,
  passed,
  testErr,
  testSubmitResult,
  passCert,
  onSubmitCustom,
  onSubmitFallback,
  onRetry,
  onBackToCourse,
}: Props) {
  const reduce = useReducedMotion()
  const customTestReady = Boolean(publishedTest && publishedTest.questions.length > 0)
  const test = customTestReady ? publishedTest! : null
  const allMcAnswered = test ? test.questions.every((q) => Boolean(mcAnswers[q.id])) : false
  const clientScore = test && submitted ? scoreKnowledgeCheck(test, mcAnswers) : null
  const score =
    test && submitted && testSubmitResult
      ? {
          correct: Math.round((testSubmitResult.scorePercent * test.questions.length) / 100),
          total: test.questions.length,
          percent: testSubmitResult.scorePercent,
          passed: testSubmitResult.passed,
          breakdown: clientScore?.breakdown ?? [],
        }
      : clientScore
  const showReview = submitted && !submitting && !passed && Boolean(test)
  const answeredCount = test ? test.questions.filter((q) => mcAnswers[q.id]).length : fallbackAnswer ? 1 : 0
  const questionTotal = test ? test.questions.length : 1

  return (
    <motion.div
      className="min-h-[70vh] bg-gradient-to-b from-slate-100 via-slate-50 to-white py-12 sm:py-16"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.page}
    >
      <Container className="w-full min-w-0 max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              {t('LearnPage_173_knowledge_check_e4ec131477')}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-brand-900 sm:text-3xl">
              {publishedTest?.title || t('LearnPage_173_knowledge_check_e4ec131477')}
            </h1>
            <p className="mt-2 break-words text-sm text-slate-600">{displayCourseTitle(course)}</p>
          </div>
          <button
            type="button"
            onClick={onBackToCourse}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t('ui_learn_back_to_slides', { defaultValue: 'Back to course' })}
          </button>
        </div>

        {testErr ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{testErr}</p>
        ) : null}

        {!submitted && test ? (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                {t('ui_learn_test_progress', {
                  defaultValue: '{{done}} of {{total}} answered',
                  done: answeredCount,
                  total: questionTotal,
                })}
              </span>
              <span>
                {t('ui_learn_test_pass_need', {
                  defaultValue: 'Need {{pct}}% to pass',
                  pct: test.passPercent,
                })}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-300"
                style={{ width: `${questionTotal ? (answeredCount / questionTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="card-elevated mt-6 min-w-0 overflow-x-hidden p-4 sm:p-8">
          {test ? (
            <>
              {!submitted ? (
                <p className="rounded-xl bg-sky-50/80 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
                  {t('ui_learn_test_intro_before')}
                  <strong className="font-semibold text-brand-900">{test.passPercent}%</strong>
                  {t('ui_learn_test_intro_after')}
                </p>
              ) : null}

              <div className={submitted ? 'mt-0' : 'mt-8'}>
                <McQuestionBlock
                  test={test}
                  answers={mcAnswers}
                  onAnswer={(qid, oid) => setMcAnswers((prev) => ({ ...prev, [qid]: oid }))}
                  submitted={submitted || submitting}
                  showReview={showReview}
                />
              </div>

              {!submitted ? (
                <Button
                  className="mt-10 w-full sm:w-auto"
                  disabled={!allMcAnswered || submitting}
                  onClick={onSubmitCustom}
                >
                  {submitting
                    ? t('ui_learn_test_submitting', { defaultValue: 'Checking answers…' })
                    : t('ui_learn_submit_answers')}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-950">
                {t('ui_learn_no_test_warning')}
              </p>
              <p className="mt-6 font-medium leading-relaxed text-slate-800">{t('ui_learn_sample_question_title')}</p>
              <div className="mt-6 space-y-3">
                {(
                  [
                    { id: 'a' as const, label: t('LearnPage_234_protect_workers_and_prevent_incidents_7bf8112ad7') },
                    { id: 'b' as const, label: t('LearnPage_244_reduce_paperwork_only_d19268d9e2') },
                  ] as const
                ).map((opt) => {
                  const showFbReview = submitted && !submitting && !passed
                  const isCorrect = opt.id === 'a'
                  const isSelected = fallbackAnswer === opt.id
                  let cls = 'border-slate-200 bg-white hover:border-sky-300/80 hover:bg-sky-50/30'
                  if (showFbReview) {
                    if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/35'
                    else if (isSelected) cls = 'border-rose-400 bg-rose-50 ring-2 ring-rose-400/35'
                    else cls = 'border-slate-100 bg-slate-50/60 opacity-70'
                  } else if (isSelected) {
                    cls = 'border-sky-400 bg-sky-50/80 ring-2 ring-sky-400/40'
                  }
                  return (
                    <label
                      key={opt.id}
                      className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${cls} ${showFbReview ? 'cursor-default' : ''}`}
                    >
                      <input
                        type="radio"
                        name="fallback-q"
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() => setFallbackAnswer(opt.id)}
                        className="sr-only"
                      />
                      {showFbReview && isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                      ) : showFbReview && isSelected && !isCorrect ? (
                        <XCircle className="h-6 w-6 shrink-0 text-rose-600" />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
                      )}
                      <span className="min-w-0 flex-1 break-words text-sm">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
              {!submitted ? (
                <Button
                  className="mt-8 w-full sm:w-auto"
                  disabled={!fallbackAnswer || submitting}
                  onClick={onSubmitFallback}
                >
                  {submitting
                    ? t('ui_learn_test_submitting', { defaultValue: 'Checking answers…' })
                    : t('ui_learn_submit_answers')}
                </Button>
              ) : null}
            </>
          )}

          {submitted && !submitting && passed ? (
            <motion.div
              className="mt-10 space-y-6"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-6 text-center shadow-sm ring-1 ring-emerald-100">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                  <Trophy className="h-7 w-7" />
                </div>
                <p className="mt-4 font-display text-lg font-bold text-emerald-950">
                  {t('LearnPage_258_congratulations_you_passed_70ea555952')}
                </p>
                {score ? (
                  <p className="mt-2 text-sm text-emerald-800/90">
                    {t('ui_learn_pass_score', {
                      defaultValue: 'You scored {{correct}} of {{total}} ({{pct}}%).',
                      correct: score.correct,
                      total: score.total,
                      pct: score.percent,
                    })}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-emerald-800/80">{t('ui_learn_pass_saved_blurb')}</p>
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
                {passCert ? (
                  <Link to={`/certificates/${encodeURIComponent(passCert.id)}`}>
                    <Button>{t('ui_cert_list_view')}</Button>
                  </Link>
                ) : null}
                <Link to="/certificates">
                  <Button variant={passCert ? 'secondary' : undefined}>
                    {t('LearnPage_270_view_all_certificates_7adad16f2a')}
                  </Button>
                </Link>
                <Link to="/my-courses">
                  <Button variant="secondary">{t('LearnPage_273_my_learning_06b8911395')}</Button>
                </Link>
              </div>
            </motion.div>
          ) : null}

          {submitted && !submitting && !passed ? (
            <motion.div
              className="mt-10 space-y-6"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: easeOut }}
            >
              <div className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-amber-50/40 shadow-sm ring-1 ring-rose-100">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-md">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold text-rose-950">
                      {t('ui_learn_fail_title', { defaultValue: 'Not quite — keep going' })}
                    </h2>
                    {score ? (
                      <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                        {t('ui_learn_fail_score', {
                          defaultValue:
                            'You got {{correct}} of {{total}} correct ({{pct}}%). You need {{need}}% to pass.',
                          correct: score.correct,
                          total: score.total,
                          pct: score.percent,
                          need: test?.passPercent ?? 80,
                        })}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-rose-900/90">{t('ui_learn_fail_message')}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-600">
                      {t('ui_learn_fail_review_hint', {
                        defaultValue:
                          'Green highlights show the correct answers. Red shows what you picked when it was wrong.',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-rose-100 bg-white/60 px-5 py-4 sm:px-6">
                  <Button className="gap-2" onClick={onRetry}>
                    <RotateCcw className="h-4 w-4" />
                    {t('ui_learn_retry')}
                  </Button>
                  <Button variant="secondary" onClick={onBackToCourse}>
                    <BookOpen className="h-4 w-4" />
                    {t('ui_learn_review_course', { defaultValue: 'Review course material' })}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </Container>
    </motion.div>
  )
}
