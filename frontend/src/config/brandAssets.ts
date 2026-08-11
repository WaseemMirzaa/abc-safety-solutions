/** Official ABC Safety Solutions logo (full lockup — mark + "SAFETY SOLUTIONS" wordmark).
 *  Bundled locally (public/brand/abc-safety-logo.jpg) rather than hotlinked, so the app
 *  doesn't depend on abcsafetysolutions.com staying up. Solid white background (JPG, no
 *  alpha) — see AuthLogo's light variant for how it's kept legible over photo panels. */
export const brandLogoUrl = '/brand/abc-safety-logo.jpg'

/** Customer portal header, footer, auth, and certificates. */
export const brandLogoCustomer = brandLogoUrl

/** Admin shell, favicon, and notifications (same asset). */
export const brandLogoLight = brandLogoUrl

/** Legal / certificate display name (exact casing). */
export const certificateBrandName = 'ABC Safety Solutions'

/** Imagery from [ABC Safety Solutions](https://abcsafetysolutions.com/training-certification/) (client site). */
const B = 'https://abcsafetysolutions.com/wp-content/uploads'

/** Unsplash hotlinks — [license](https://unsplash.com/license). Large crop for auth panel backgrounds. */
const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=2560&q=90`

export const brandImages = {
  occupationalHealthSafety: `${B}/2021/10/Occupational-Health-Safety-Training-min.jpg`,
  dot: `${B}/2021/10/Department-of-Transportation-DOT-Training-min.jpg`,
  majorEmergency: `${B}/2021/10/Major-Emergency-Training-min.jpg`,
  fire: `${B}/2021/10/fire-training-abc-min.jpg`,
  survival: `${B}/2021/10/Survival-Training-abc-min.jpg`,
  bop: `${B}/2021/10/BOP-Controls-Training-min.jpg`,
  epaLeadSafe: `${B}/2021/10/EPA-Lead-Safe-Training-Certification-min.jpg`,
} as const

/** Hero / auth visuals — same assets as the public training page categories. */
export const homeHeroImage = brandImages.occupationalHealthSafety
/** Construction / hard hats — Unsplash */
export const loginPanelImage = unsplash('photo-1504307651254-35680f356dfd')
/** OHS training — matches catalog / hero imagery (not generic stock photos). */
export const registerPanelImage = brandImages.occupationalHealthSafety

/** Program tiles — copy lives in locales (ui_brand_program_*); images match abcsafetysolutions.com/training-certification/ */
export const trainingProgramTiles = [
  { image: brandImages.occupationalHealthSafety },
  { image: brandImages.dot },
  { image: brandImages.majorEmergency },
  { image: brandImages.fire },
  { image: brandImages.survival },
  { image: brandImages.bop },
  { image: brandImages.epaLeadSafe, note: true },
] as const
