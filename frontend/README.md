# ABC Safety Solutions — Training Portal (Frontend)

React + Vite + TypeScript + Tailwind CSS v4 + TanStack Query + Framer Motion.  
**Current mode:** auth, catalog merge, enrollments, progress, certificates, and admin publish flags are **browser-only** (`localStorage` prefix `abc_portal_*`). Seed courses and categories live in `src/data/catalog.ts`.

This document is the **full migration plan** from that prototype to a **server-backed** system (NestJS + PostgreSQL + object storage + Stripe + email). Use it as a checklist so no feature or data field is dropped when swapping `localCache` / `localData` for APIs.

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| `docs/ABC_SAFETY_SOLUTIONS_WEB_APP_SPEC.md` | Product scope and flows |
| `docs/BUILD_PLAN.md` | Delivery / sequencing |

---

## 1. Complete prototype inventory (do not drop on migration)

### 1.1 Routes (`src/App.tsx`)

| Path | Page | Auth | Today’s data source |
|------|------|------|---------------------|
| `/` | Home | Public | `fetchPublishedCourses` (Query), featured slice |
| `/courses` | Catalog | Public | Query + category filter (client) |
| `/courses/:slug` | Course detail | Public | Query; **enroll** uses `localCache.addPurchase` |
| `/checkout` | Checkout stub | Public | `?course=` slug query param only |
| `/login` | Login | Public | Demo accounts + passwordless “register-style” login |
| `/register` | Register | Public | Creates local session only |
| `/forgot-password` | Reset stub | Public | No backend |
| `/my-courses` | My learning | Learner UI gate | `localCache.getPurchases` + `mergeCourses` + `getProgress` |
| `/learn/:courseId` | Player + demo test | Learner UI gate | Progress + purchases + certificates in `localCache` |
| `/certificates` | Wallet | Learner UI gate | `localCache.getCertificates` |
| `/account` | Profile + orders list | Learner UI gate | Auth context + `getPurchases` |
| `/verify-certificate` | Public verify stub | Public | No API call yet |
| `/admin` | Dashboard | **Admin** (`AdminLayout` auth guard) | Queries + local purchase/cert counts |
| `/admin/courses` | Course table + publish | Admin | `fetchAllCoursesAdmin` + `patchCourseOverride` |
| `/admin/tests` | Placeholder | Admin | UI only |
| `/admin/media` | Placeholder | Admin | UI only |
| `/admin/users` | Placeholder | Admin | UI only |
| `/admin/orders` | Placeholder | Admin | UI only |
| `/admin/announcements` | Placeholder | Admin | UI only |

**Note:** `AdminLayout` redirects non-admins and unauthenticated users. Server must enforce JWT/session claims + server-side RBAC on every admin route.

### 1.2 TypeScript domain types (`src/types.ts`) → persistence mapping

| Type | Fields | Replace with |
|------|--------|--------------|
| `Category` | `id`, `name`, `slug`, `parentId` | `categories` table; API for tree / flat list |
| `Course` | `id`, `slug`, `title`, `summary`, `description`, `categoryId`, `priceCents`, `durationMinutes`, `slideCount`, `imageUrl`, `published` | `courses` + FK to category; optional `course_versions` later |
| `UserSession` | `email`, `name`, `role` | JWT/session + `GET /me` (server name, verified email, roles) |
| `Purchase` | `courseId`, `purchasedAt`, `orderId` | `enrollments` + `orders` (one order, many lines); `orderId` = Stripe payment intent / session id |
| `Progress` | `courseId`, `slideIndex`, `audioTimeSec`, `updatedAt`, `completedSlides` | `user_course_progress` (consider per-slide completion later) |
| `Certificate` | `id`, `courseId`, `courseName`, `userName`, `issuedAt` | `certificates` + `public_id` for verify + `pdf_storage_key`; denormalized names optional |

### 1.3 `localStorage` keys (`src/lib/localCache.ts`)

| Key suffix | API / table |
|------------|-------------|
| `user` | Session/JWT + user profile |
| `purchases` | Enrollments + orders |
| `progress_map` | Progress service |
| `certificates` | Certificates service + PDF storage |
| `course_overrides` | `courses.published` (and future fields) in DB |

Method-level mapping for implementers:

- `getUser` / `setUser` → auth session + optional `GET /me` after login.
- `getPurchases` / `addPurchase` → `GET /me/enrollments` and create enrollment via **checkout webhook** (and admin grant); not client-trusted.
- `getProgress` / `setProgress` → `GET/PATCH /me/progress/:courseId` (debounce PATCH from player).
- `getCertificates` / `addCertificate` → `POST …/attempts/.../submit` success triggers server issuance; `GET /me/certificates`.
- `getCourseOverrides` / `patchCourseOverride` → `PATCH /admin/courses/:id` (publish flag).

`clearAll()` → logout + optional “delete local draft data” only; server data unchanged.

### 1.4 API shim today (`src/api/localData.ts`)

| Function | Behavior | Server replacement |
|----------|----------|-------------------|
| `mergeCourses()` | `seedCourses` + `course_overrides` | DB read + cache |
| `fetchPublishedCourses()` | filtered + artificial delay | `GET /courses?published=true` |
| `fetchCourseBySlug(slug)` | published only | `GET /courses/by-slug/:slug` or `GET /courses/:slug` |
| `fetchAllCoursesAdmin()` | all merged courses | `GET /admin/courses` |

### 1.5 React Query keys (`src/api/queryKeys.ts`)

| Key | Used for | After migration |
|-----|----------|-----------------|
| `qk.courses` | Published catalog | Same key; `queryFn` → HTTP |
| `qk.course(slug)` | Detail | Same |
| `qk.adminCourses` | Admin list | Same |
| `qk.purchases` | Reserved / future | Wire to `GET /me/enrollments` or merge into courses query |
| `qk.progress(courseId)` | Reserved / future | `GET /me/progress/:courseId` |
| `qk.certificates` | Reserved / future | `GET /me/certificates` |

Invalidate `courses` + `adminCourses` after admin publish change; after webhook, invalidate enrollments + orders.

### 1.6 Auth prototype (`src/contexts/AuthContext.tsx`, `src/config/demoAccounts.ts`, `src/lib/demoSeed.ts`)

- **Demo accounts:** `learner@demo.local`, `admin@demo.local` (passwords in `demoAccounts.ts`) — replace with seeded DB users in non-production only.
- **Demo learner seed:** On login, `seedDemoLearnerPurchasesIfNeeded` adds purchases for course IDs `c1`, `c2`, `c5`, `c10` if missing → replace with **server-side seed** or staging fixtures.
- **Register:** Any non-reserved email + name → local `learner` session without password → replace with `POST /auth/register` + verification + hashed password.
- **Login (non-demo):** Password filled but email not in demo list → error today → replace with real credential check.
- **Post-login redirect:** `location.state.from` preserved for deep links → keep behavior with real auth.

### 1.7 Learn / assessment prototype (`src/pages/LearnPage.tsx`)

- Access: logged-in + `purchase` for `courseId` + course exists in `mergeCourses()`.
- Progress: saved on slide change to `localCache.setProgress` (includes `audioTimeSec`, `completedSlides`).
- Demo test: single question, client-side score; pass → `localCache.addCertificate` if none for course.
- **Server:** slide/audio assets gated by enrollment; progress and attempts persisted; certificate created only after server-validated pass; idempotent issuance per user+course+version.

### 1.8 UI-only / stubs (must gain API contracts)

- **Checkout** (`CheckoutPage.tsx`): Stripe CTA disabled; needs session creation + return URLs.
- **Forgot password** (`ForgotPasswordPage.tsx`): needs `POST /auth/forgot-password` + email template + `POST /auth/reset-password` with token.
- **Verify certificate** (`VerifyCertificatePage.tsx`): needs `GET /certificates/verify/:publicId` (public, rate-limited).
- **Account orders** (`AccountPage.tsx`): list `orderId` + date from purchases → real orders with line items, amounts, receipt PDF links.
- **Admin placeholders:** Tests, Media, Users, Orders, Announcements — define modules (below).

### 1.9 Motion & loading (no backend change)

Page transitions, skeletons, `PageLoader`, staggered grids, learn player progress animation — keep; only data sources change.

---

## 2. Target backend architecture (recommended)

**Stack:** NestJS, PostgreSQL (Prisma or TypeORM), optional Redis (rate limit, cache), S3-compatible storage, Stripe, transactional email (SES/SendGrid), optional BullMQ/pg-boss for jobs.

**Modules (align with prototype + spec):**

1. **AuthModule** — register, login, refresh, logout, forgot/reset, email verification, guards, roles (`learner`, `admin`, future `sub-admin`).
2. **UsersModule** — profile, legal name for certs, preferences, device tokens (mobile).
3. **CatalogModule** — categories, courses, public vs admin list, slug resolution.
4. **MediaModule** — presigned uploads, CDN URLs, mime validation, course image + slide + audio assets.
5. **CommerceModule** — Stripe Checkout Session / Payment Element, customer portal optional, webhooks.
6. **EnrollmentModule** — grant/revoke access; idempotent webhook handling; admin manual grant.
7. **ProgressModule** — read/update progress; optional seat-time / slide rules.
8. **AssessmentModule** — tests, questions, attempts, scoring, limits, randomization.
9. **CertificatesModule** — issue, PDF generation, storage, email, public verify by opaque id.
10. **NotificationsModule** — renewals, announcements, email + push.
11. **AdminModule** — aggregates, reports, audit log.

---

## 3. Database entities (suggested minimum)

- `users` (id, email unique, password_hash, name, email_verified_at, role, created_at, …)
- `categories` (id, name, slug, parent_id)
- `courses` (id, slug unique, title, summary, description, category_id, price_cents, duration_minutes, slide_count, image_url or media_id, published, created_at, updated_at)
- `orders` (id, user_id, stripe_checkout_session_id, status, totals, currency, created_at)
- `order_line_items` (order_id, course_id, unit_amount, …)
- `enrollments` (user_id, course_id, source, created_at) — unique (user_id, course_id)
- `user_course_progress` (user_id, course_id, slide_index, audio_time_sec, completed_slides, updated_at)
- `tests`, `questions`, `options` (normalized assessment)
- `attempts` (user_id, test_id, started_at, submitted_at, score, passed)
- `certificates` (id, public_verify_id unique, user_id, course_id, course_name_snapshot, user_name_snapshot, issued_at, pdf_key, test_attempt_id optional)
- `stripe_events_processed` (event_id unique) — webhook idempotency
- `admin_audit_log` (actor_id, action, resource, payload json, created_at)
- Future: `announcements`, `announcement_sends`, `user_devices` (push)

Migrate initial **categories** and **courses** from `src/data/catalog.ts` via a one-time seed script (IDs may be reassigned; then update any hard-coded demo enrollment IDs or remove demo IDs in favor of slug-based staging seeds).

---

## 4. REST API contract (detailed)

Conventions: JSON, UTC ISO8601 dates, problem+json or consistent error shape, pagination on admin lists (`cursor` or `page`), `Authorization: Bearer <access>` for learner/admin; admin routes additionally checked for role.

### 4.1 Public

- `GET /health` — load balancers
- `GET /courses` — query: `categoryId`, `published=true` (default for anonymous catalog)
- `GET /courses/:slug` — 404 if draft (non-admin)
- `GET /categories` — tree or flat

### 4.2 Auth

- `POST /auth/register` — body: email, password, name; sends verify email
- `POST /auth/login` — returns access + refresh strategy (prefer httpOnly refresh cookie)
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password` — always 202 to avoid email enumeration (or policy decision)
- `POST /auth/reset-password` — token + new password
- `POST /auth/verify-email` — token

### 4.3 Learner (authenticated)

- `GET /me` — profile + roles
- `PATCH /me` — name, legal name, notification prefs
- `GET /me/enrollments` — course ids + enrolled_at + course summary for “My learning”
- `GET /me/orders` — order history for Account page
- `GET /me/progress/:courseId`
- `PATCH /me/progress/:courseId` — body matches progress fields; validate enrollment
- `GET /courses/:slug/content` or `GET /me/courses/:courseId/player` — signed URLs for slides/audio (if not embedded in CDN paths)
- `POST /me/tests/:testId/attempts` — start attempt (returns attempt id, questions policy)
- `POST /me/attempts/:attemptId/submit` — answers; server scores; on pass triggers certificate workflow
- `GET /me/certificates`
- `GET /me/certificates/:id/pdf` — redirect or signed URL

### 4.4 Commerce

- `POST /checkout/session` — body: `courseIds[]`, `successUrl`, `cancelUrl`; metadata: `userId`; returns Stripe URL
- Stripe webhooks: `checkout.session.completed`, `charge.refunded`, (optional) `customer.subscription.*` if subscriptions added later

### 4.5 Public certificate verify

- `GET /certificates/verify/:publicId` — returns non-sensitive success payload (course title, issue date, recipient display name policy) or 404

### 4.6 Admin

- `GET /admin/summary` — counts: published courses, total users, orders (period), certificates issued, active enrollments
- `GET /admin/courses` — all statuses
- `POST /admin/courses` / `PATCH /admin/courses/:id` / `DELETE` (soft) — full CRUD beyond publish toggle
- `GET/POST/PATCH /admin/categories`
- `GET/POST/PATCH /admin/tests` + question CRUD
- `GET /admin/users` — search/filter; `GET /admin/users/:id`
- `POST /admin/users/:id/enrollments` — manual grant; `DELETE` optional revoke with policy
- `POST /admin/users/:id/reissue-certificate` — audit + email
- `GET /admin/orders` — link to Stripe; refund initiation if supported
- `POST /admin/announcements` + `POST /admin/announcements/:id/dispatch`
- `POST /admin/media/upload-url` — presigned PUT

---

## 5. Stripe webhook → enrollment (critical path)

1. User completes Checkout; success URL lands on frontend with `session_id` query optional.  
2. Webhook `checkout.session.completed`: verify signature; read `metadata.userId` (or customer→user mapping) and `metadata.courseIds` or line items.  
3. Create **order** + **line items**; upsert **enrollments** (unique constraint).  
4. Insert row in `stripe_events_processed` for `event.id`; skip if already processed.  
5. Frontend: on success page, `queryClient.invalidateQueries` for enrollments and orders.  
6. Refunds: webhook adjusts order status and optionally revokes enrollment (business rule).

---

## 6. Frontend migration checklist (file-level)

1. **Environment:** `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`; never embed secrets in Vite.  
2. **HTTP client:** `fetch` wrapper with base URL, credentials, 401 → refresh once → retry; central error type.  
3. **Replace `src/api/localData.ts`:** implement `coursesApi`, `adminCoursesApi` using real endpoints; remove artificial `delay()`.  
4. **Replace `localCache` usage** in: `CourseDetailPage`, `LearnPage`, `MyCoursesPage`, `CertificatesPage`, `AccountPage`, `AdminCoursesPage`, `AdminDashboardPage`, `AuthContext` (session only — no user JSON in localStorage if using cookies).  
5. **AuthContext:** hydrate from `GET /me` on app load if refresh cookie present; `login`/`logout` call API.  
6. **Remove or feature-flag:** `demoAccounts`, `demoSeed`, passwordless register/login paths.  
7. **Register/Login pages:** real validation errors; MFA later if required.  
8. **Checkout:** call `POST /checkout/session`; `redirectToCheckout`.  
9. **Forgot/reset:** wire forms to auth endpoints.  
10. **Verify certificate:** enable button → `GET /certificates/verify/:id` + result UI.  
11. **Learn:** fetch enrollment + progress on mount; PATCH progress with debounce; submit attempt to API; remove client-only certificate creation.  
12. **Certificates page:** list from API; download links.  
13. **Account:** orders from API; show course titles via join or embedded labels.  
14. **Admin courses:** `PATCH` publish to server; optimistic UI optional.  
15. **Admin dashboard:** metrics from `GET /admin/summary`.  
16. **Query keys:** extend as needed (`['enrollments']`, `['orders']`, …); keep invalidation rules documented.  
17. **E2E:** Playwright flow purchase → learn → attempt → certificate (staging).  
18. **Security:** CSP, no sensitive data in `localStorage` if avoidable; XSS impact review.

---

## 7. Admin placeholder pages — backend scope to build

| Route | Prototype | Server + UI work |
|-------|-----------|------------------|
| Tests | Static placeholder | Full test CRUD, question types, link course_version, attempt policies |
| Media | Static placeholder | Upload, list, attach to course/slide, CDN invalidation |
| Users | Static placeholder | Search, view enrollments, manual grant, reset password trigger |
| Orders | Static placeholder | List from DB + Stripe status, refunds |
| Announcements | Static placeholder | Compose, schedule, send log, segment audience |

---

## 8. Requirements not in the prototype (from spec — plan for API)

- Email verification, rate limiting, CAPTCHA on auth
- PDF certificate generation + email delivery
- Renewal reminder jobs + optional push (FCM/APNs)
- Tax, invoices, B2B seats
- Seat-time / slide gating, attempt limits, question randomization
- Captions/transcripts, course versioning, offline mobile
- Sub-admin RBAC, audit log UI

---

## 9. Scripts

```bash
npm install
npm run dev      # http://localhost:5173 (or next free port)
npm run build
npm run preview
```

---

## 10. Maintaining this README

When NestJS routes are finalized, add an **OpenAPI** link or paste the canonical path list here. When a new `localCache` field or page is added to the prototype, update **§1** and **§6** in the same PR.
