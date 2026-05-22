import type { EnrollmentRow } from '@/api/localData'
import type { Course } from '@/types'

/** Stripe Checkout session ids start with `cs_`. */
export function isPaidStripeOrder(orderId: string): boolean {
  return orderId.startsWith('cs_')
}

/** True when the learner may open slides, tests, and certificates for this course. */
export function hasCourseAccess(
  enrollment: Pick<EnrollmentRow, 'refunded' | 'orderId'> | undefined,
  course: Pick<Course, 'priceCents'> | null | undefined,
): boolean {
  if (!enrollment || enrollment.refunded) return false
  const price = course?.priceCents ?? 0
  if (price < 1) return true
  return isPaidStripeOrder(enrollment.orderId)
}

export function findEnrollment(
  enrollments: EnrollmentRow[],
  courseId: string,
): EnrollmentRow | undefined {
  return enrollments.find((e) => e.courseId === courseId && !e.refunded)
}
