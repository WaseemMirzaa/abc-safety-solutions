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
/** Industrial work, PPE — Unsplash */
export const registerPanelImage = unsplash('photo-1581578731548-c64695cc6952')

/** Program tiles aligned with https://abcsafetysolutions.com/training-certification/ */
export const trainingProgramTiles = [
  {
    title: 'Occupational Safety & Health Training',
    short: 'Occupational Health & Safety',
    image: brandImages.occupationalHealthSafety,
  },
  {
    title: 'Department of Transportation (DOT) Training',
    short: 'DOT Training',
    image: brandImages.dot,
  },
  {
    title: 'Major Emergency Training',
    short: 'Major Emergency',
    image: brandImages.majorEmergency,
  },
  { title: 'Fire Training', short: 'Fire Training', image: brandImages.fire },
  { title: 'Survival Training', short: 'Survival Training', image: brandImages.survival },
  { title: 'BOP Controls Training', short: 'BOP Controls', image: brandImages.bop },
  {
    title: 'EPA Lead-Safe Training & Certification',
    short: 'EPA Lead-Safe',
    image: brandImages.epaLeadSafe,
    note: 'Offered in conjunction with an affiliated training service provider where applicable.',
  },
] as const
