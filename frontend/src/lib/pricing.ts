import type { Course } from '@/types'

export type CoursePricingFields = Pick<Course, 'priceCents' | 'discountPercent' | 'salePriceCents'>

export function clampDiscountPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)))
}

export function applyPercentDiscount(cents: number, percent: number): number {
  const p = clampDiscountPercent(percent)
  if (p <= 0 || cents <= 0) return Math.max(0, cents)
  return Math.max(0, Math.round((cents * (100 - p)) / 100))
}

export function salePriceFromCourse(listPriceCents: number, courseDiscountPercent: number): number {
  return applyPercentDiscount(listPriceCents, courseDiscountPercent)
}

/** Normalize list/sale prices from API fields (handles missing discountPercent). */
export function normalizedCoursePricing(course: CoursePricingFields) {
  const listPriceCents = Math.max(0, Math.round(Number(course.priceCents) || 0))
  const discountPercent = clampDiscountPercent(Number(course.discountPercent) || 0)
  const computedSale = salePriceFromCourse(listPriceCents, discountPercent)
  const apiSale =
    course.salePriceCents != null && Number.isFinite(course.salePriceCents)
      ? Math.max(0, Math.round(course.salePriceCents))
      : null
  const salePriceCents = apiSale != null && apiSale <= listPriceCents ? apiSale : computedSale
  return { listPriceCents, discountPercent, salePriceCents }
}

export function courseSalePriceCents(course: CoursePricingFields): number {
  return normalizedCoursePricing(course).salePriceCents
}

export function computeCheckoutAmountCents(
  course: CoursePricingFields,
  promoDiscountPercent = 0,
): number {
  const afterCourse = courseSalePriceCents(course)
  return applyPercentDiscount(afterCourse, promoDiscountPercent)
}

export function hasCourseSale(course: CoursePricingFields): boolean {
  const { listPriceCents, salePriceCents, discountPercent } = normalizedCoursePricing(course)
  if (listPriceCents < 1) return false
  return discountPercent > 0 || salePriceCents < listPriceCents
}

export function displayDiscountPercent(course: CoursePricingFields): number {
  const { listPriceCents, salePriceCents, discountPercent } = normalizedCoursePricing(course)
  if (discountPercent > 0) return discountPercent
  if (listPriceCents < 1 || salePriceCents >= listPriceCents) return 0
  return Math.round(((listPriceCents - salePriceCents) / listPriceCents) * 100)
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}
