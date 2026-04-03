import { DEMO_LEARNER_EMAIL } from '@/config/demoAccounts'
import { localCache } from '@/lib/localCache'

/** Pre-enrolled course IDs for demo learner (see `data/catalog.ts`). */
const DEMO_ENROLLED_COURSE_IDS = ['c1', 'c2', 'c5', 'c10'] as const

/**
 * Idempotent: adds demo purchases when the demo learner signs in.
 * (Catalog titles: OSHA 10 Awareness, OSHA 30 Supervisor, Confined Space Awareness, Portable Fire Extinguisher.)
 */
export function seedDemoLearnerPurchasesIfNeeded() {
  const user = localCache.getUser()
  if (!user || user.email.trim().toLowerCase() !== DEMO_LEARNER_EMAIL) return

  const ts = new Date().toISOString()
  for (const courseId of DEMO_ENROLLED_COURSE_IDS) {
    localCache.addPurchase({
      courseId,
      purchasedAt: ts,
      orderId: `DEMO-SEED-${courseId}`,
    })
  }
}
