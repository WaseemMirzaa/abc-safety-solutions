import type { AdminTest, TestAnswerOption, TestQuestion } from '@/types'

/** Legacy row shape before questions[] existed. */
type LegacyRow = {
  id?: string
  courseId?: string
  title?: string
  passPercent?: number
  questionCount?: number
  published?: boolean
  updatedAt?: string
  questions?: unknown[]
}

function migrateOption(raw: unknown, questionId: string, index: number): TestAnswerOption {
  if (!raw || typeof raw !== 'object') {
    return { id: `${questionId}-o${index}`, label: '', isCorrect: index === 0 }
  }
  const o = raw as Record<string, unknown>
  return {
    id: typeof o.id === 'string' ? o.id : `${questionId}-o${index}`,
    label: typeof o.label === 'string' ? o.label : '',
    isCorrect: Boolean(o.isCorrect),
  }
}

function migrateQuestion(raw: unknown, testId: string, qIndex: number): TestQuestion {
  const fallbackId = `q-${testId}-${qIndex}`
  if (!raw || typeof raw !== 'object') {
    return {
      id: fallbackId,
      prompt: '',
      options: [
        { id: `${fallbackId}-0`, label: '', isCorrect: true },
        { id: `${fallbackId}-1`, label: '', isCorrect: false },
      ],
    }
  }
  const q = raw as Record<string, unknown>
  const id = typeof q.id === 'string' ? q.id : fallbackId
  const prompt = typeof q.prompt === 'string' ? q.prompt : ''
  const opts = Array.isArray(q.options) ? q.options.map((opt, i) => migrateOption(opt, id, i)) : []
  const options =
    opts.length >= 2
      ? opts
      : [
          { id: `${id}-0`, label: '', isCorrect: true },
          { id: `${id}-1`, label: '', isCorrect: false },
        ]
  return { id, prompt, options }
}

export function migrateAdminTestRow(entry: unknown): AdminTest {
  const t = (entry ?? {}) as LegacyRow
  const id = typeof t.id === 'string' ? t.id : `test-${Date.now()}`
  const courseId = typeof t.courseId === 'string' ? t.courseId : ''
  const title = typeof t.title === 'string' ? t.title : ''
  const passPercent =
    typeof t.passPercent === 'number' ? Math.min(100, Math.max(0, Math.round(t.passPercent))) : 80
  const published = Boolean(t.published)
  const updatedAt = typeof t.updatedAt === 'string' ? t.updatedAt : new Date().toISOString()
  const questions = Array.isArray(t.questions)
    ? t.questions.map((q, i) => migrateQuestion(q, id, i))
    : []
  return { id, courseId, title, passPercent, published, updatedAt, questions }
}

export function migrateAdminTestsList(data: unknown): AdminTest[] {
  if (!Array.isArray(data)) return []
  return data.map(migrateAdminTestRow)
}
