import type { Course } from '@/types'

export function clampDiscountPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)))
}

export function applyPercentDiscount(cents: number, percent: number): number {
  const p = clampDiscountPercent(percent)
  if (p <= 0 || cents <= 0) return Math.max(0, cents)
  return Math.max(0, Math.round((cents * (100 - p)) / 100))
}

export function courseSalePriceCents(course: Pick<Course, 'priceCents' | 'discountPercent'>): number {
  return applyPercentDiscount(course.priceCents, course.discountPercent ?? 0)
}

export function computeCheckoutAmountCents(
  course: Pick<Course, 'priceCents' | 'discountPercent'>,
  promoDiscountPercent = 0,
): number {
  const afterCourse = courseSalePriceCents(course)
  return applyPercentDiscount(afterCourse, promoDiscountPercent)
}

export function hasCourseSale(course: Pick<Course, 'priceCents' | 'discountPercent'>): boolean {
  return course.priceCents > 0 && clampDiscountPercent(course.discountPercent ?? 0) > 0
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}
