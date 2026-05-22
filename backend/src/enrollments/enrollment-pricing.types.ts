export type EnrollmentPricingSnapshot = {
  listPriceCents: number
  amountPaidCents: number
  courseDiscountPercent: number
  promoCode: string | null
  promoDiscountPercent: number
}
