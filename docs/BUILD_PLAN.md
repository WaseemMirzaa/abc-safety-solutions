# Build plan — ABC Safety Solutions training portal

**Goal:** Ship a linked e-learning portal (customer + admin) aligned with [abcsafetysolutions.com](https://abcsafetysolutions.com/), competitor-grade UX, and **local cache–first** data flows for snappy UI and resilient learning progress.

---

## 1. Brand & media from current client site

Use these **with client permission** (same assets they already publish). Prefer **hotlinking only for prototypes**; for production, **download and host on the portal CDN** (or signed URLs from your storage).

| Asset | Suggested use | URL |
|--------|----------------|-----|
| Primary logo (header/footer) | Customer + admin chrome | `https://abcsafetysolutions.com/wp-content/uploads/2021/10/logo-light.png` |
| Social / square mark | Favicon, app icon base, emails | `https://abcsafetysolutions.com/wp-content/uploads/2019/05/cropped-logo-square-social.jpg` |
| Hero / section texture (optional) | Portal marketing backgrounds | `https://abcsafetysolutions.com/wp-content/uploads/2019/01/services-hero-background-2.jpg` |
| Category tiles (mirror Training menu) | Catalog cards for online courses | Occupational: `.../2021/10/Occupational-Health-Safety-Training-min.jpg` · DOT: `.../2021/10/Department-of-Transportation-DOT-Training-min.jpg` · Major emergency: `.../2021/10/Major-Emergency-Training-min.jpg` · Fire: `.../2021/10/fire-training-abc-min.jpg` · Survival: `.../2021/10/Survival-Training-abc-min.jpg` · BOP: `.../2021/10/BOP-Controls-Training-min.jpg` · EPA Lead-Safe: `.../2021/10/EPA-Lead-Safe-Training-Certification-min.jpg` |

**IA alignment:** Map portal **categories** to the live site’s **Training & Certification** branches: Occupational Health & Safety, DOT, Major Emergency, Fire, Survival, BOP Controls, EPA Lead-Safe (note affiliate disclaimer where applicable).

**Copy:** Reuse headlines and course blurbs from the WordPress site for the first ~20 SKUs; keep phone **(832) 939-5289** and **info@abcsafetysolutions.com** in footer/support blocks.

---

## 2. Competitor patterns to match or beat

| Source | Borrow for portal |
|--------|-------------------|
| [360training OSHAcampus](https://www.360training.com/osha-campus) | Clear **program buckets** in nav; **filters** (topic, language, bestseller); product cards with **price**, **short compliance hook**, **Buy / View details**. |
| [Omega Safety Training](https://omegasafetytraining.com/) | **Schedule vs online** clarity; **region / topic filters**; trust strip (accreditations). |
| [All Stop / 3t](https://allstop.net/) | **Delivery badges** (online-only vs blended); **locations** where relevant; simple **course detail → enroll** path. |

**Differentiation:** ABC keeps **WordPress as marketing**; portal focuses on **purchase → learn → test → certificate** with **reminders** and **app wallet** (per scope doc).

---

## 3. Recommended technical approach

| Layer | Choice (typical) | Rationale |
|-------|------------------|-----------|
| **Web app** | Next.js or Remix (React) | SSR for SEO catalog; one codebase for marketing shell + app routes. |
| **API** | NestJS / FastAPI / Rails — or Next server actions + DB | Auth, commerce webhooks, tests, PDF jobs. |
| **DB** | PostgreSQL | Relational: users, orders, courses, attempts, certs. |
| **Cache** | Redis (server) | Sessions, rate limits, hot catalog. |
| **Files** | S3-compatible + CDN | Slides, audio, PDFs, certificate templates. |
| **Payments** | Stripe Checkout + webhooks | Entitlements after `checkout.session.completed`. |
| **Email** | SES / SendGrid | Receipts, certificate delivery. |
| **Mobile** | React Native or Flutter | Shared API; push for reminders/announcements. |

*Stack can be adjusted to budget; the **plan** below is stack-agnostic.*

---

## 4. Local cache–based data handling (customer + admin)

**Principles:** Server is source of truth; **UI reads from cache first**, then revalidates; **mutations** optimistic where safe; **learning progress** durable offline-first.

### 4.1 Web (TanStack Query / RTK Query / SWR)

- **Stale-while-revalidate:** `courses`, `categories`, `course detail` — `staleTime` 1–5 min; background refetch on focus.
- **Prefetch:** hover/focus on catalog card → prefetch detail + first slide manifest.
- **Keys:** `['categories']`, `['courses', filters]`, `['course', slug]`, `['me']`, `['purchases']`, `['progress', courseId]`, `['certificates']`.

### 4.2 Persistent local state (IndexedDB via Dexie / idb-keyval)

| Key / store | Data | Sync rule |
|-------------|------|-----------|
| `progress:{userId}:{courseId}` | Last slide index, audio timestamp, `updatedAt` | On change: debounce 2–5s → **PATCH** API; on load: merge **max** of local vs server if conflict. |
| `testDraft:{attemptId}` | Selected answers (if allowed) | Clear after submit. |
| `cart` (optional) | Line items pre-checkout | Stripe usually session-based; local cart optional for UX. |

### 4.3 Admin portal cache

- **List pages:** same SWR pattern; **invalidate** on create/update (`queryClient.invalidateQueries(['courses'])`).
- **Draft courses:** autosave to server draft endpoint **or** localStorage backup every 30s to prevent loss (then sync).

### 4.4 Auth tokens

- **httpOnly cookies** preferred for web; mobile uses **secure storage** + refresh token rotation.
- **No** long-lived tokens in localStorage if avoidable.

### 4.5 Flows (cache-aware)

1. **Catalog:** show cached categories/courses instantly → fetch → diff UI.  
2. **Player:** load slide manifest from memory cache; **images/audio** from **Cache API** or browser HTTP cache; progress write-behind to server.  
3. **Test:** fetch questions once per attempt (no cache of correct answers); submit → server validates → invalidate `certificates`, `course progress`.  
4. **Admin saves course:** optimistic UI row update; rollback on error.

---

## 5. Customer portal — UI plan (screens)

| # | Screen / route | Purpose |
|---|----------------|---------|
| 1 | `/` | Hero, value prop, **featured courses**, CTA to catalog; match ABC typography/colors from logo. |
| 2 | `/courses` | Grid/list, **filters** (category, subcategory, price), search; competitor-style cards (image, title, price, duration). |
| 3 | `/courses/[slug]` | Description (from WP copy), outcomes, **Buy**, trust (accreditations strip). |
| 4 | `/checkout` | Stripe; success → **My courses**. |
| 5 | `/login` · `/register` · `/forgot-password` | Email + password; profile name = certificate name. |
| 6 | `/account` | Orders, receipts, **edit profile**. |
| 7 | `/learn` | List **purchased** courses + status (Not started / In progress / Passed). |
| 8 | `/learn/[courseId]` | Slide + audio player, prev/next, **resume** banner, optional transcript area (phase 2). |
| 9 | `/learn/[courseId]/test` | Timer/attempts UI; submit → results. |
| 10 | `/certificates` | List + download PDF; **expiry / renew by** if configured. |

**Components library:** shadcn/ui or MUI; **accessible** focus states for player controls.

---

## 6. Admin portal — UI plan (screens)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | `/admin/login` | Separate admin role or route guard. |
| 2 | `/admin` | Dashboard: sales snapshot, completions, recent signups (scope-dependent). |
| 3 | `/admin/courses` | Table: title, category, price, status, actions. |
| 4 | `/admin/courses/new` · `/admin/courses/[id]` | Metadata, pricing, category, **slide ordering**, audio attach, **test attach**, publish toggle. |
| 5 | `/admin/categories` | Tree: parent/child, slug, sort order. |
| 6 | `/admin/tests` · `/admin/tests/[id]` | Question bank, options, correct answer(s), randomize flags, pass %. |
| 7 | `/admin/certificates` | Template upload, field mapping preview. |
| 8 | `/admin/users` | Search user; view purchases, attempts; **re-send certificate**. |
| 9 | `/admin/orders` | Stripe-linked order list, refund trigger (policy-dependent). |
| 10 | `/admin/announcements` | Compose push/email broadcast (if in scope). |

---

## 7. Implementation phases

| Phase | Deliverable | Notes |
|-------|-------------|--------|
| **P0** | Repo, CI, staging env, DB schema v1 | Users, roles, courses, categories, orders, entitlements. |
| **P1** | Customer UI shell + catalog (mock or real API) + cache layer | Wire brand assets; responsive grid. |
| **P2** | Auth + Stripe + entitlements | Webhooks → `user_courses`. |
| **P3** | Player + IndexedDB progress + API sync | Conflict policy documented. |
| **P4** | Test engine + certificate PDF + email | Template from client. |
| **P5** | Admin CRUD for courses/categories/tests | Role-gated routes. |
| **P6** | Reminders + announcements (backend jobs + push) | Per scope sign-off. |
| **P7** | Mobile app shell + cert wallet + API parity | Align with store policies. |
| **P8** | UAT with ~20 courses, WordPress link, go-live | DNS, monitoring, backups. |

---

## 8. Dependencies on client

- Written approval to reuse logo/images/copy from [abcsafetysolutions.com](https://abcsafetysolutions.com/).  
- Certificate PDF template + pass rules (§8 in Scope of Work).  
- Final list of **20** course slugs and category mapping.  
- Stripe + hosting accounts.

---

## 9. Risk register (short)

| Risk | Mitigation |
|------|------------|
| App store rejects WebView checkout | Use native IAP or Safari/Chrome checkout + deep link (decide in open decisions). |
| Large audio on cellular | Adaptive bitrate or warn on file size; cache aggressively. |
| Progress sync conflicts | Last-write-wins with server timestamp or merge slide/audio max. |

---

*This plan extends `ABC_SAFETY_SOLUTIONS_WEB_APP_SPEC.md` and the client Scope of Work DOCX.*
