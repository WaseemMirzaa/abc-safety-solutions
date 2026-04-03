import type {
  AdminDirectoryUser,
  AdminTest,
  Announcement,
  Category,
  Certificate,
  Course,
  MediaAsset,
  Progress,
  Purchase,
  UserSession,
  UserRole,
} from '@/types'
import { migrateAdminTestsList } from '@/lib/migrateAdminTests'

const P = 'abc_portal_'

/** Invalidated on user writes — required so useSyncExternalStore gets a stable snapshot per storage value. */
let userReadCache: { raw: string | null; user: UserSession | null } | null = null

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(P + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(P + key, JSON.stringify(value))
}

function normalizeUser(raw: UserSession | (Omit<UserSession, 'role'> & { role?: UserRole }) | null): UserSession | null {
  if (!raw) return null
  const role: UserRole = raw.role ?? 'learner'
  return { email: raw.email, name: raw.name, role }
}

function readUserItemRaw(): string | null {
  try {
    return localStorage.getItem(P + 'user')
  } catch {
    return null
  }
}

export const localCache = {
  getUser(): UserSession | null {
    const raw = readUserItemRaw()
    if (userReadCache !== null && userReadCache.raw === raw) {
      return userReadCache.user
    }
    if (!raw) {
      userReadCache = { raw: null, user: null }
      return null
    }
    try {
      const parsed = JSON.parse(raw) as UserSession | (Omit<UserSession, 'role'> & { role?: UserRole }) | null
      const user = normalizeUser(parsed)
      userReadCache = { raw, user }
      return user
    } catch {
      userReadCache = { raw, user: null }
      return null
    }
  },
  setUser(user: UserSession | null) {
    userReadCache = null
    if (user) save('user', user)
    else localStorage.removeItem(P + 'user')
  },

  getPurchases(): Purchase[] {
    return load<Purchase[]>('purchases', [])
  },
  addPurchase(p: Purchase) {
    const list = this.getPurchases()
    if (list.some((x) => x.courseId === p.courseId)) return
    save('purchases', [...list, p])
  },

  getProgress(courseId: string): Progress | null {
    const map = load<Record<string, Progress>>('progress_map', {})
    return map[courseId] ?? null
  },
  setProgress(p: Progress) {
    const map = load<Record<string, Progress>>('progress_map', {})
    map[p.courseId] = p
    save('progress_map', map)
  },

  getCertificates(): Certificate[] {
    return load<Certificate[]>('certificates', [])
  },
  addCertificate(c: Certificate) {
    save('certificates', [...this.getCertificates(), c])
  },

  getCourseOverrides(): Record<string, Partial<Course>> {
    return load<Record<string, Partial<Course>>>('course_overrides', {})
  },
  patchCourseOverride(courseId: string, patch: Partial<Course>) {
    const o = this.getCourseOverrides()
    o[courseId] = { ...o[courseId], ...patch }
    save('course_overrides', o)
  },

  getCustomCategories(): Category[] {
    return load<Category[]>('custom_categories', [])
  },
  setCustomCategories(list: Category[]) {
    save('custom_categories', list)
  },
  addCustomCategory(cat: Category) {
    save('custom_categories', [...this.getCustomCategories(), cat])
  },
  updateCustomCategory(cat: Category) {
    save(
      'custom_categories',
      this.getCustomCategories().map((c) => (c.id === cat.id ? cat : c)),
    )
  },
  removeCustomCategory(id: string) {
    save(
      'custom_categories',
      this.getCustomCategories().filter((c) => c.id !== id),
    )
  },

  getCustomCourses(): Course[] {
    return load<Course[]>('custom_courses', [])
  },
  setCustomCourses(courses: Course[]) {
    save('custom_courses', courses)
  },
  addCustomCourse(course: Course) {
    save('custom_courses', [...this.getCustomCourses(), course])
  },
  updateCustomCourse(course: Course) {
    const list = this.getCustomCourses()
    const i = list.findIndex((c) => c.id === course.id)
    if (i < 0) return
    const next = [...list]
    next[i] = course
    save('custom_courses', next)
  },
  removeCustomCourse(id: string) {
    save(
      'custom_courses',
      this.getCustomCourses().filter((c) => c.id !== id),
    )
    const o = this.getCourseOverrides()
    delete o[id]
    save('course_overrides', o)
  },

  getMediaAssets(): MediaAsset[] {
    return load<MediaAsset[]>('media_assets', [])
  },
  addMediaAsset(asset: MediaAsset) {
    save('media_assets', [...this.getMediaAssets(), asset])
  },
  deleteMediaAsset(id: string) {
    save(
      'media_assets',
      this.getMediaAssets().filter((a) => a.id !== id),
    )
  },

  getAdminTests(): AdminTest[] {
    return migrateAdminTestsList(load<unknown[]>('admin_tests', []))
  },
  /** Published test with at least one question for this course (newest `updatedAt` wins if several). */
  getPublishedTestForCourse(courseId: string): AdminTest | null {
    const candidates = this.getAdminTests().filter(
      (t) => t.courseId === courseId && t.published && t.questions.length > 0,
    )
    if (candidates.length === 0) return null
    return [...candidates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  },
  upsertAdminTest(test: AdminTest) {
    const list = this.getAdminTests()
    const i = list.findIndex((t) => t.id === test.id)
    const next = i < 0 ? [...list, test] : list.map((t) => (t.id === test.id ? test : t))
    save('admin_tests', next)
  },
  deleteAdminTest(id: string) {
    save(
      'admin_tests',
      this.getAdminTests().filter((t) => t.id !== id),
    )
  },

  getAnnouncements(): Announcement[] {
    return load<Announcement[]>('announcements', [])
  },
  addAnnouncement(a: Announcement) {
    save('announcements', [...this.getAnnouncements(), a])
  },
  updateAnnouncement(a: Announcement) {
    save(
      'announcements',
      this.getAnnouncements().map((x) => (x.id === a.id ? a : x)),
    )
  },
  deleteAnnouncement(id: string) {
    save(
      'announcements',
      this.getAnnouncements().filter((x) => x.id !== id),
    )
  },

  getRefundedOrderIds(): string[] {
    return load<string[]>('refunded_orders', [])
  },
  toggleOrderRefund(orderId: string) {
    const s = new Set(this.getRefundedOrderIds())
    if (s.has(orderId)) s.delete(orderId)
    else s.add(orderId)
    save('refunded_orders', [...s])
  },

  getAdminDirectory(): AdminDirectoryUser[] {
    const builtin: AdminDirectoryUser[] = [
      { email: 'learner@demo.local', name: 'Jamie Learner', role: 'learner' },
      { email: 'admin@demo.local', name: 'Alex Admin', role: 'admin' },
    ]
    const extra = load<AdminDirectoryUser[]>('directory_extra', [])
    const map = new Map<string, AdminDirectoryUser>()
    for (const u of builtin) map.set(u.email.toLowerCase(), u)
    for (const u of extra) map.set(u.email.toLowerCase(), u)
    return [...map.values()].sort((a, b) => a.email.localeCompare(b.email))
  },
  addAdminDirectoryUser(u: AdminDirectoryUser) {
    const extra = load<AdminDirectoryUser[]>('directory_extra', [])
    if (extra.some((x) => x.email.toLowerCase() === u.email.toLowerCase())) return
    if (['learner@demo.local', 'admin@demo.local'].includes(u.email.trim().toLowerCase())) return
    save('directory_extra', [...extra, u])
  },
  removeAdminDirectoryUser(email: string) {
    const e = email.toLowerCase()
    if (['learner@demo.local', 'admin@demo.local'].includes(e)) return
    save(
      'directory_extra',
      load<AdminDirectoryUser[]>('directory_extra', []).filter((x) => x.email.toLowerCase() !== e),
    )
  },

  /** Demo: reset all portal data */
  clearAll() {
    userReadCache = null
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(P)) localStorage.removeItem(k)
    })
  },
}
