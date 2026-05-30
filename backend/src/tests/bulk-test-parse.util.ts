import { randomUUID } from 'node:crypto'
import type { TestQuestion } from '../entities/course-test.entity'

export type BulkParseResult = {
  questions: TestQuestion[]
  errors: { row: number; message: string }[]
}

function makeQuestion(prompt: string, options: { label: string; isCorrect: boolean }[]): TestQuestion {
  return {
    id: randomUUID(),
    prompt,
    options: options.map((o) => ({
      id: randomUUID(),
      label: o.label,
      isCorrect: o.isCorrect,
    })),
  }
}

export function parseBulkTestCsv(raw: string): BulkParseResult {
  const errors: BulkParseResult['errors'] = []
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return { questions: [], errors: [{ row: 0, message: 'Empty CSV' }] }
  const header = lines[0].toLowerCase()
  const hasHeader = header.includes('question')
  const dataLines = hasHeader ? lines.slice(1) : lines
  const questions: TestQuestion[] = []
  dataLines.forEach((line, i) => {
    const row = hasHeader ? i + 2 : i + 1
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    // Need at least: question + 2 options + correctOption = 4 columns
    if (cols.length < 4) {
      errors.push({ row, message: 'Need question, at least 2 options, and correctOption columns' })
      return
    }
    const question = cols[0]
    const correctKey = cols[cols.length - 1].toUpperCase()
    const optionCols = cols.slice(1, cols.length - 1)
    if (!question) {
      errors.push({ row, message: 'Missing question' })
      return
    }
    const keyNames = ['A', 'B', 'C', 'D']
    const opts = optionCols
      .map((label, idx) => ({ label, key: keyNames[idx] ?? String(idx + 1) }))
      .filter((o) => o.label)
    if (opts.length < 2) {
      errors.push({ row, message: 'Need at least 2 options' })
      return
    }
    if (!opts.some((o) => o.key === correctKey)) {
      errors.push({ row, message: `correctOption "${correctKey}" does not match any option key (A-D)` })
      return
    }
    questions.push(
      makeQuestion(
        question,
        opts.map((o) => ({ label: o.label, isCorrect: o.key === correctKey })),
      ),
    )
  })
  return { questions, errors }
}
