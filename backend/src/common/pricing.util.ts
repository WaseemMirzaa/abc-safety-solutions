/** Apply a percent-off discount (0–100) to a USD-cent amount. */
export function applyPercentDiscount(cents: number, percent: number): number {
  const p = Math.min(100, Math.max(0, Math.round(percent)))
  if (p <= 0 || cents <= 0) return Math.max(0, cents)
  return Math.max(0, Math.round((cents * (100 - p)) / 100))
}

export function clampDiscountPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)))
}

export function salePriceFromCourse(listPriceCents: number, courseDiscountPercent: number): number {
  return applyPercentDiscount(listPriceCents, courseDiscountPercent)
}

export type CheckoutPricing = {
  listPriceCents: number
  courseDiscountPercent: number
  promoDiscountPercent: number
  promoCode: string | null
  afterCourseDiscountCents: number
  amountCents: number
}

export function computeCheckoutPricing(params: {
  listPriceCents: number
  courseDiscountPercent: number
  promoDiscountPercent?: number
  promoCode?: string | null
}): CheckoutPricing {
  const courseDiscountPercent = clampDiscountPercent(params.courseDiscountPercent)
  const promoDiscountPercent = clampDiscountPercent(params.promoDiscountPercent ?? 0)
  const afterCourseDiscountCents = salePriceFromCourse(params.listPriceCents, courseDiscountPercent)
  const amountCents = applyPercentDiscount(afterCourseDiscountCents, promoDiscountPercent)
  return {
    listPriceCents: params.listPriceCents,
    courseDiscountPercent,
    promoDiscountPercent,
    promoCode: params.promoCode?.trim().toUpperCase() || null,
    afterCourseDiscountCents,
    amountCents,
  }
}

/** Combined percent off list price (for badges), rounded. */
export function combinedDiscountPercent(listPriceCents: number, finalCents: number): number {
  if (listPriceCents < 1 || finalCents >= listPriceCents) return 0
  return Math.round(((listPriceCents - finalCents) / listPriceCents) * 100)
}
