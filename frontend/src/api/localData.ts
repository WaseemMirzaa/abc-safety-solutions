import { getAllCategories, seedCourses } from '@/data/catalog'
import { localCache } from '@/lib/localCache'
import type { AdminDirectoryUser, AdminTest, Announcement, Category, Course, MediaAsset } from '@/types'

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export function mergeCourses(): Course[] {
  const ov = localCache.getCourseOverrides()
  const base = seedCourses.map((c) => ({ ...c, ...ov[c.id] }))
  const custom = localCache.getCustomCourses().map((c) => ({ ...c, ...ov[c.id] }))
  return [...base, ...custom]
}

export async function fetchCategories(): Promise<Category[]> {
  await delay(40)
  return getAllCategories()
}

export async function fetchPublishedCourses(): Promise<Course[]> {
  await delay()
  return mergeCourses().filter((c) => c.published)
}

export async function fetchCourseBySlug(slug: string): Promise<Course | null> {
  await delay()
  const c = mergeCourses().find((x) => x.slug === slug)
  if (!c || !c.published) return null
  return c
}

export async function fetchAllCoursesAdmin(): Promise<Course[]> {
  await delay()
  return mergeCourses()
}

export async function fetchMediaAssets(): Promise<MediaAsset[]> {
  await delay(80)
  return localCache.getMediaAssets()
}

export async function fetchAdminTests(): Promise<AdminTest[]> {
  await delay(80)
  return localCache.getAdminTests()
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  await delay(80)
  return localCache.getAnnouncements()
}

export async function fetchAdminDirectory(): Promise<AdminDirectoryUser[]> {
  await delay(80)
  return localCache.getAdminDirectory()
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
  await delay(80)
  const refunded = new Set(localCache.getRefundedOrderIds())
  const byId = new Map(mergeCourses().map((c) => [c.id, c]))
  return localCache
    .getPurchases()
    .map((p) => {
      const course = byId.get(p.courseId)
      return {
        orderId: p.orderId,
        purchasedAt: p.purchasedAt,
        courseId: p.courseId,
        courseTitle: course?.title ?? p.courseId,
        amountCents: course?.priceCents ?? 0,
        refunded: refunded.has(p.orderId),
      }
    })
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
}
