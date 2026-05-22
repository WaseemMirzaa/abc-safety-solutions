export type CourseLanguage = {
  id: string
  code: string
  name: string
}

export const DEFAULT_COURSE_LANGUAGE_ID = 'lang-en'

export type Category = {
  id: string
  name: string
  slug: string
  parentId: string | null
  /** Shown on completion certificates for courses in this category. */
  certificationText: string
}

export type CourseSlideType = 'image' | 'pdf' | 'video' | 'pptx' | 'ppt'

export type CourseSlide = {
  id: string
  type: CourseSlideType
  url: string
  title?: string
  /** Number of slides inside a .pptx deck. */
  deckSlideCount?: number
}

export type Course = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  categoryId: string
  /** Instruction language (course_languages.id). */
  languageId: string
  priceCents: number
  durationMinutes: number
  slideCount: number
  /** Days until certificate expires after issue; null/undefined = no expiry. */
  certificateValidityDays?: number | null
  /** @deprecated Legacy image-only slides; use `slides`. */
  slideImageUrls?: string[]
  /** Ordered learner content: images, PDFs, PowerPoint (.pptx), or videos. */
  slides?: CourseSlide[]
  imageUrl: string
  published: boolean
  /** Homepage "Popular online courses" section. */
  popular: boolean
}

export type UserRole = 'learner' | 'admin'

export type UserSession = {
  email: string
  name: string
  role: UserRole
}

export type Purchase = {
  courseId: string
  purchasedAt: string
  orderId: string
}

export type Progress = {
  courseId: string
  slideIndex: number
  audioTimeSec: number
  updatedAt: string
  completedSlides: boolean
  testPassed?: boolean
}

export type Certificate = {
  id: string
  courseId: string
  courseName: string
  userName: string
  issuedAt: string
  /** Snapshot of category certification line at issue time. */
  certificationText?: string
  categoryId?: string
  /** ISO date when the credential expires, if configured on the course. */
  expiresAt?: string | null
  userId?: string
}

export type MediaAsset = {
  id: string
  label: string
  url: string
  kind: 'image' | 'audio' | 'document' | 'other'
  createdAt: string
  /** Set when file was chosen from disk upload. */
  source?: 'url' | 'upload'
  fileName?: string | null
}

/** One selectable choice on a knowledge-check question. */
export type TestAnswerOption = {
  id: string
  label: string
  /** Classic single-answer MCQ: exactly one option per question should be true. */
  isCorrect: boolean
}

/** A single question with its own multi-choice answers. */
export type TestQuestion = {
  id: string
  prompt: string
  options: TestAnswerOption[]
}

/** Assessment attached to one course; pass = enough questions answered correctly vs `passPercent`. */
export type AdminTest = {
  id: string
  courseId: string
  title: string
  /** Minimum % of questions that must be correct (e.g. 80 = 8/10). */
  passPercent: number
  published: boolean
  updatedAt: string
  questions: TestQuestion[]
}

export type Announcement = {
  id: string
  title: string
  body: string
  createdAt: string
  status: 'draft' | 'sent'
  sentAt: string | null
}

export type AdminDirectoryUser = {
  email: string
  name: string
  role: 'learner' | 'admin'
  /** Server-managed admin; not editable in admin UI. */
  protected?: boolean
}
