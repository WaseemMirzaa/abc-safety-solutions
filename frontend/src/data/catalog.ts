import type { Category, Course } from '@/types'

const BASE = 'https://abcsafetysolutions.com/wp-content/uploads'

export const categories: Category[] = [
  {
    id: 'cat-ohs',
    name: 'Occupational Health & Safety',
    slug: 'occupational-health-safety',
    parentId: null,
    certificationText:
      'Occupational health & safety training program completed in accordance with applicable workplace safety standards.',
  },
  {
    id: 'cat-dot',
    name: 'Department of Transportation (DOT)',
    slug: 'dot',
    parentId: null,
    certificationText: 'Department of Transportation (DOT) training completed for regulated hazardous materials and fleet safety topics.',
  },
  {
    id: 'cat-me',
    name: 'Major Emergency Training',
    slug: 'major-emergency',
    parentId: null,
    certificationText: 'Major emergency preparedness training completed for industrial emergency response and incident coordination.',
  },
  {
    id: 'cat-fire',
    name: 'Fire Training',
    slug: 'fire',
    parentId: null,
    certificationText: 'Fire prevention and response training completed for workplace fire safety and emergency action.',
  },
  {
    id: 'cat-surv',
    name: 'Survival Training',
    slug: 'survival',
    parentId: null,
    certificationText: 'Survival and offshore safety training completed for marine and aviation travel environments.',
  },
  {
    id: 'cat-bop',
    name: 'BOP Controls Training',
    slug: 'bop-controls',
    parentId: null,
    certificationText: 'Well control and blowout prevention awareness training completed for oilfield operations.',
  },
  {
    id: 'cat-epa',
    name: 'EPA Lead-Safe Training',
    slug: 'epa-lead-safe',
    parentId: null,
    certificationText: 'EPA lead-safe renovation, repair, and painting training completed in accordance with RRP requirements.',
  },
]

function c(
  id: string,
  slug: string,
  title: string,
  categoryId: string,
  price: number,
  minutes: number,
  slides: number,
  imagePath: string,
  summary: string
): Course {
  return {
    id,
    slug,
    title,
    categoryId,
    languageId: 'lang-en',
    priceCents: price * 100,
    durationMinutes: minutes,
    slideCount: slides,
    imageUrl: `${BASE}/${imagePath}`,
    published: true,
    popular: false,
    summary,
    description: `${summary} This self-paced module includes slide-based instruction with voice-over, a knowledge check, and a certificate of completion upon passing.`,
  }
}

/** Seed catalog (~20-style volume represented; expand by duplicating pattern) */
export const seedCourses: Course[] = [
  { ...c('c1', 'osha-10-awareness', 'OSHA 10-Hour Awareness (Online)', 'cat-ohs', 59, 600, 48, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Core workplace safety awareness aligned with common OSHA outreach topics.'), popular: true },
  { ...c('c2', 'osha-30-supervisor', 'OSHA 30-Hour Supervisor Orientation', 'cat-ohs', 159, 1800, 56, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Deeper coverage for supervisors and safety leads.'), popular: true },
  { ...c('c3', 'hazwoper-8-refresher', 'HAZWOPER 8-Hour Refresher', 'cat-ohs', 45, 480, 42, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Annual refresher for hazardous waste site workers.'), popular: true },
  c('c4', 'hazcom-ghs', 'Hazard Communication & GHS', 'cat-ohs', 29, 120, 36, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Labels, SDS, and employee right-to-know essentials.'),
  c('c5', 'confined-space-awareness', 'Confined Space Awareness', 'cat-ohs', 39, 180, 40, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Identify permit-required confined spaces and basic roles.'),
  c('c6', 'fall-protection-user', 'Fall Protection — Authorized User', 'cat-ohs', 49, 150, 38, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Harnesses, anchor points, and fall prevention fundamentals.'),
  c('c7', 'dot-hazmat-awareness', 'DOT Hazmat Awareness', 'cat-dot', 35, 90, 32, '2021/10/Department-of-Transportation-DOT-Training-min.jpg', 'Shipping papers, markings, and emergency response awareness.'),
  c('c8', 'defensive-driving', 'Defensive Driving Fundamentals', 'cat-dot', 25, 60, 28, '2021/10/Department-of-Transportation-DOT-Training-min.jpg', 'Roadway hazards and safe driving habits for work fleets.'),
  c('c9', 'emergency-response-ics', 'Emergency Response & ICS Basics', 'cat-me', 55, 240, 44, '2021/10/Major-Emergency-Training-min.jpg', 'Incident command concepts for industrial emergency teams.'),
  c('c10', 'fire-extinguisher', 'Portable Fire Extinguisher Use', 'cat-fire', 19, 45, 24, '2021/10/fire-training-abc-min.jpg', 'Classes of fire, PASS method, and evacuation mindset.'),
  c('c11', 'hot-work-fire-watch', 'Hot Work & Fire Watch', 'cat-fire', 34, 90, 30, '2021/10/fire-training-abc-min.jpg', 'Permits, hazards, and watch responsibilities.'),
  c('c12', 'sea-survival-awareness', 'Sea Survival Awareness', 'cat-surv', 59, 120, 34, '2021/10/Survival-Training-abc-min.jpg', 'Cold water immersion basics and survival priorities.'),
  c('c13', 'helicopter-safety', 'Helicopter Passenger Safety', 'cat-surv', 42, 90, 30, '2021/10/Survival-Training-abc-min.jpg', 'Embark/debark, PPE, and offshore travel safety.'),
  c('c14', 'well-control-awareness', 'Well Control Awareness', 'cat-bop', 69, 180, 46, '2021/10/BOP-Controls-Training-min.jpg', 'Kick detection concepts and shut-in awareness for field staff.'),
  c('c15', 'rrp-renovator', 'EPA RRP — Renovator Essentials', 'cat-epa', 49, 240, 52, '2021/10/EPA-Lead-Safe-Training-Certification-min.jpg', 'Lead-safe work practices for renovation, repair, and painting.'),
  c('c16', 'silica-awareness', 'Silica Exposure Awareness', 'cat-ohs', 29, 60, 26, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Table 1 concepts and exposure control basics.'),
  c('c17', 'loto-affected', 'Lockout/Tagout — Affected Employee', 'cat-ohs', 32, 75, 28, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Energy control procedures and communication.'),
  c('c18', 'electrical-safety', 'Electrical Safety — Unqualified Person', 'cat-ohs', 36, 90, 32, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Boundaries, PPE, and reporting unsafe conditions.'),
  c('c19', 'h2s-awareness', 'Hydrogen Sulfide (H₂S) Awareness', 'cat-ohs', 44, 120, 36, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Properties of H₂S, detection, and emergency response.'),
  c('c20', 'excavation-trenching', 'Excavation & Trenching Safety', 'cat-ohs', 52, 150, 40, '2021/10/Occupational-Health-Safety-Training-min.jpg', 'Soil types, protective systems, and competent person concepts.'),
]

export function isSeedCourseId(id: string) {
  return seedCourses.some((c) => c.id === id)
}

const SEED_CATEGORY_IDS = new Set(categories.map((c) => c.id))

export function isSeedCategoryId(id: string) {
  return SEED_CATEGORY_IDS.has(id)
}

/** Static seed categories only (catalog copy). Live data comes from `fetchCategories()`. */
export function getSeedCategories(): Category[] {
  return categories.map((c) => ({ ...c, certificationText: c.certificationText ?? '' }))
}

export function findCategory(list: Category[], id: string) {
  return list.find((c) => c.id === id)
}

export function findCategoryBySlug(list: Category[], slug: string) {
  return list.find((c) => c.slug === slug)
}
