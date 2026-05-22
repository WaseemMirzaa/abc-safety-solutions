import type { AdminTest, TestQuestion } from '@/types'

export type QuestionBreakdown = {
  questionId: string
  selectedId: string | undefined
  correctOptionId: string | undefined
  isCorrect: boolean
}

export type TestScore = {
  correct: number
  total: number
  percent: number
  passed: boolean
  breakdown: QuestionBreakdown[]
}

export function correctOptionId(q: TestQuestion): string | undefined {
  return q.options.find((o) => o.isCorrect)?.id
}

export function isAnswerCorrect(q: TestQuestion, selectedId: string | undefined): boolean {
  if (!selectedId) return false
  const correct = correctOptionId(q)
  return Boolean(correct && selectedId === correct)
}

export function scoreKnowledgeCheck(test: AdminTest, answers: Record<string, string>): TestScore {
  const breakdown: QuestionBreakdown[] = test.questions.map((q) => {
    const selectedId = answers[q.id]
    const correctOptionId = q.options.find((o) => o.isCorrect)?.id
    const isCorrect = Boolean(selectedId && correctOptionId && selectedId === correctOptionId)
    return { questionId: q.id, selectedId, correctOptionId, isCorrect }
  })
  const correct = breakdown.filter((b) => b.isCorrect).length
  const total = test.questions.length
  const percent = total > 0 ? Math.round((100 * correct) / total) : 0
  return {
    correct,
    total,
    percent,
    passed: percent >= test.passPercent,
    breakdown,
  }
}
