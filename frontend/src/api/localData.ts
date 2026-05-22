import { apiJson, ApiError, publicJson } from './client'
import type {
  AdminDirectoryUser,
  AdminTest,
  Announcement,
  Category,
  Certificate,
  Course,
  MediaAsset,
  Progress,
  UserSession,
} from '@/types'

export type EnrollmentRow = {
  id: string
  userId: string
  courseId: string
  orderId: string
  refunded: boolean
  purchasedAt: string
  /** Server-computed: paid Stripe session or free course. */
  hasAccess?: boolean
  course: Course | null
}

function asCourse(row: Course): Course {
  return {
    ...row,
    slideImageUrls: row.slideImageUrls?.filter(Boolean),
    slides: row.slides?.length ? row.slides : undefined,
    certificateValidityDays:
      row.certificateValidityDays === undefined ? null : row.certificateValidityDays,
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const list = await apiJson<Category[]>('/api/categories')
  return list.map((c) => ({ ...c, parentId: c.parentId ?? null }))
}

export async function fetchPublishedCourses(): Promise<Course[]> {
  const list = await apiJson<Course[]>('/api/courses')
  return list.map(asCourse)
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  try {
    return asCourse(await apiJson<Course>(`/api/courses/slug/${encodeURIComponent(slug)}`))
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function fetchCourseById(id: string): Promise<Course | null> {
  try {
    return asCourse(await apiJson<Course>(`/api/courses/${encodeURIComponent(id)}`))
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function fetchAllCoursesAdmin(): Promise<Course[]> {
  const list = await apiJson<Course[]>('/api/admin/courses')
  return list.map(asCourse)
}

export async function fetchMediaAssets(): Promise<MediaAsset[]> {
  const list = await apiJson<MediaAsset[]>('/api/admin/media')
  return list.map((a) => ({
    ...a,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : String(a.createdAt),
  }))
}

export async function fetchAdminTests(): Promise<AdminTest[]> {
  return apiJson<AdminTest[]>('/api/admin/tests')
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const list = await apiJson<Announcement[]>('/api/admin/announcements')
  return list.map((a) => ({
    ...a,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : String(a.createdAt),
    sentAt: a.sentAt == null ? null : typeof a.sentAt === 'string' ? a.sentAt : String(a.sentAt),
  }))
}

export async function fetchAdminDirectory(): Promise<AdminDirectoryUser[]> {
  return apiJson<AdminDirectoryUser[]>('/api/admin/directory')
}

export type AdminOrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  amountCents: number
  refunded: boolean
}

export async function fetchAdminOrders(): Promise<AdminOrderRow[]> {
  return apiJson<AdminOrderRow[]>('/api/admin/orders')
}

export async function fetchAdminStats(): Promise<{ enrollments: number; certificatesIssued: number }> {
  return apiJson('/api/admin/stats')
}

export async function fetchMyEnrollments(): Promise<EnrollmentRow[]> {
  return apiJson<EnrollmentRow[]>('/api/enrollments/me')
}

export type MyOrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  amountCents: number
  refunded: boolean
}

export async function fetchMyOrders(): Promise<MyOrderRow[]> {
  return apiJson<MyOrderRow[]>('/api/me/orders')
}

export type CertificateVerifyResult = {
  valid: boolean
  certificateId: string
  courseName: string
  issuedTo: string
  issuedAt: string
  expiresAt: string | null
}

export async function fetchCertificateVerify(publicId: string): Promise<CertificateVerifyResult> {
  return publicJson<CertificateVerifyResult>(
    `/api/certificates/verify/${encodeURIComponent(publicId.trim())}`,
  )
}

export async function purchaseCourse(courseId: string): Promise<void> {
  await apiJson('/api/enrollments/enroll', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  })
}

export type ProgressRow = Progress & { testPassed?: boolean }

export async function fetchMyProgress(courseId: string): Promise<ProgressRow> {
  const row = await apiJson<{
    courseId: string
    slideIndex: number
    audioTimeSec: number
    completedSlides: boolean
    testPassed?: boolean
    updatedAt: string
  }>(`/api/progress/${encodeURIComponent(courseId)}`)
  return {
    courseId: row.courseId,
    slideIndex: row.slideIndex,
    audioTimeSec: row.audioTimeSec,
    completedSlides: row.completedSlides,
    testPassed: row.testPassed,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(row.updatedAt).toISOString(),
  }
}

export async function patchMyProgress(
  courseId: string,
  body: Pick<Progress, 'slideIndex' | 'audioTimeSec' | 'completedSlides'>,
): Promise<void> {
  await apiJson(`/api/progress/${encodeURIComponent(courseId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function postTestPassed(courseId: string, passed: boolean): Promise<void> {
  await apiJson(`/api/progress/${encodeURIComponent(courseId)}/test-passed`, {
    method: 'POST',
    body: JSON.stringify({ passed }),
  })
}

export async function fetchPublishedTestForCourse(courseId: string): Promise<AdminTest | null> {
  const test = await apiJson<AdminTest | null>(`/api/tests/course/${encodeURIComponent(courseId)}/published`)
  return test && test.questions?.length ? test : null
}

export async function submitTestAnswers(courseId: string, answers: Record<string, string>) {
  return apiJson<{ passPercent: number; scorePercent: number; passed: boolean }>(
    `/api/tests/course/${encodeURIComponent(courseId)}/submit`,
    { method: 'POST', body: JSON.stringify({ answers }) },
  )
}

export async function submitNoTestPass(courseId: string, passed: boolean) {
  return apiJson<{ passed: boolean }>(`/api/tests/course/${encodeURIComponent(courseId)}/no-test-submit`, {
    method: 'POST',
    body: JSON.stringify({ passed }),
  })
}

export async function fetchMyCertificates(): Promise<Certificate[]> {
  const list = await apiJson<Certificate[]>('/api/certificates/me')
  return list.map((c) => ({
    ...c,
    issuedAt: typeof c.issuedAt === 'string' ? c.issuedAt : String(c.issuedAt),
    expiresAt:
      c.expiresAt == null || c.expiresAt === undefined
        ? null
        : typeof c.expiresAt === 'string'
          ? c.expiresAt
          : String(c.expiresAt),
  }))
}

export async function issueCertificate(courseId: string): Promise<Certificate> {
  const c = await apiJson<Certificate>('/api/certificates/issue', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  })
  return {
    ...c,
    issuedAt: typeof c.issuedAt === 'string' ? c.issuedAt : String(c.issuedAt),
    expiresAt:
      c.expiresAt == null || c.expiresAt === undefined
        ? null
        : typeof c.expiresAt === 'string'
          ? c.expiresAt
          : String(c.expiresAt),
  }
}

function courseToAdminPayload(c: Course): Record<string, unknown> {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    description: c.description,
    categoryId: c.categoryId,
    priceCents: c.priceCents,
    durationMinutes: c.durationMinutes,
    slideCount: c.slideCount,
    certificateValidityDays: c.certificateValidityDays ?? null,
    imageUrl: c.imageUrl,
    published: c.published,
    slideImageUrls: undefined,
    slides: c.slides?.length ? c.slides : undefined,
  }
}

export async function adminCreateCourse(c: Course): Promise<Course> {
  return asCourse(await apiJson<Course>('/api/admin/courses', { method: 'POST', body: JSON.stringify(courseToAdminPayload(c)) }))
}

export async function adminUpdateCourse(c: Course): Promise<Course> {
  return asCourse(
    await apiJson<Course>(`/api/admin/courses/${encodeURIComponent(c.id)}`, {
      method: 'PUT',
      body: JSON.stringify(courseToAdminPayload(c)),
    }),
  )
}

export async function adminDeleteCourse(id: string): Promise<void> {
  await apiJson(`/api/admin/courses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

function trimTestUpdatedAt(iso: string): string {
  const s = iso.slice(0, 32)
  return s
}

export async function adminSaveTest(test: AdminTest, mode: 'create' | 'edit'): Promise<void> {
  const payload = {
    ...test,
    updatedAt: trimTestUpdatedAt(test.updatedAt || new Date().toISOString()),
  }
  if (mode === 'create') {
    await apiJson('/api/admin/tests', { method: 'POST', body: JSON.stringify(payload) })
  } else {
    await apiJson(`/api/admin/tests/${encodeURIComponent(test.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }
}

export async function adminDeleteTest(id: string): Promise<void> {
  await apiJson(`/api/admin/tests/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminCreateMedia(a: MediaAsset): Promise<void> {
  await apiJson('/api/admin/media', { method: 'POST', body: JSON.stringify(a) })
}

export async function adminDeleteMedia(id: string): Promise<void> {
  await apiJson(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminUpsertAnnouncement(a: Announcement): Promise<void> {
  await apiJson('/api/admin/announcements', { method: 'POST', body: JSON.stringify(a) })
}

export async function adminDeleteAnnouncement(id: string): Promise<void> {
  await apiJson(`/api/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminCreateCategory(c: Pick<Category, 'id' | 'name' | 'slug' | 'certificationText'>): Promise<void> {
  await apiJson('/api/admin/categories', { method: 'POST', body: JSON.stringify(c) })
}

export async function adminUpdateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'slug' | 'certificationText'>>,
): Promise<void> {
  await apiJson(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export async function adminDeleteCategory(id: string): Promise<void> {
  await apiJson(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminToggleOrderRefund(orderId: string): Promise<void> {
  await apiJson(`/api/admin/orders/${encodeURIComponent(orderId)}/toggle-refund`, { method: 'POST' })
}

export async function adminCreateDirectoryUser(body: {
  email: string
  name: string
  role: 'learner' | 'admin'
  password: string
}): Promise<void> {
  await apiJson('/api/admin/directory', { method: 'POST', body: JSON.stringify(body) })
}

export async function adminRemoveDirectoryUser(email: string): Promise<void> {
  await apiJson('/api/admin/directory/remove', { method: 'POST', body: JSON.stringify({ email }) })
}

export type LoginResponse = { accessToken: string; user: UserSession }

export async function authLogin(email: string, password: string): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function authRegister(email: string, password: string, name: string): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function authMe(): Promise<UserSession> {
  return apiJson<UserSession>('/api/auth/me')
}

export async function authPatchMe(name: string): Promise<UserSession> {
  return apiJson<UserSession>('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ name: name.trim() }),
  })
}

export async function authForgotPassword(email: string): Promise<void> {
  await apiJson<{ accepted?: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function fetchStripeConfig(): Promise<{ enabled: boolean }> {
  return apiJson<{ enabled: boolean }>('/api/stripe/config')
}

export async function createStripeCheckoutSession(courseId: string): Promise<{ url: string | null }> {
  return apiJson<{ url: string | null }>('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  })
}

export async function completeStripeCheckout(sessionId: string): Promise<{ ok: boolean; courseId: string }> {
  return apiJson('/api/stripe/session/complete', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export { adminUploadFile, adminUploadImage, adminUploadMedia } from './client'
