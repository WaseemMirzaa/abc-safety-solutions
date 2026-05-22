import type { CourseDto } from '../courses/courses.service'

export type CheckoutBillingLinks = {
  receiptUrl: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
}

export type CheckoutConfirmation = {
  ok: true
  courseId: string
  order: {
    orderId: string
    purchasedAt: string
    amountCents: number
    currency: string
  }
  course: CourseDto
  billing: CheckoutBillingLinks
}

export type EnrichedOrderRow = {
  orderId: string
  purchasedAt: string
  courseId: string
  courseTitle: string
  courseSlug: string
  courseSummary: string
  courseImageUrl: string
  amountCents: number
  refunded: boolean
  receiptUrl: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
}
