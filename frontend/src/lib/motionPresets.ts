/** Shared motion tokens — calm, product-grade (Stripe / Linear–adjacent). */
export const easeOut = [0.22, 1, 0.36, 1] as const

export const transition = {
  page: { duration: 0.28, ease: easeOut },
  card: { duration: 0.35, ease: easeOut },
  springSnappy: { type: 'spring' as const, stiffness: 380, damping: 32 },
  springSoft: { type: 'spring' as const, stiffness: 120, damping: 22 },
}

export const staggerContainer = (stagger = 0.055) => ({
  animate: { transition: { staggerChildren: stagger, delayChildren: 0.04 } },
})

export const fadeUpItem = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
}

/** Staggered grids / lists — parent uses `initial="hidden" animate="show"`. */
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
}

export const listItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: easeOut } },
}
